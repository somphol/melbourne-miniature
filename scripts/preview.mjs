// Fast canvas-only preview for iteration: node scripts/preview.mjs [ids...]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { chromium } from 'playwright-core'

const file = process.argv[2] ?? 'dist-single/index.html'
const only = process.argv.slice(3)
const html = readFileSync(file)
const server = createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]
  if (path !== '/' && path !== '/index.html') {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: [`--use-angle=${process.env.SHOOT_ANGLE ?? 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
mkdirSync('preview', { recursive: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.setDefaultTimeout(120000)
await page.goto(`${base}?capture=1&quality=low`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 60000 })
const step = (n) => page.evaluate((a) => window.__scene.step(a), n)
const act = (name, arg) => page.evaluate(([n, a]) => window.__scene.act(n, a), [name, arg])
async function capture(path) {
  const data = await page.evaluate(() => window.__scene.shot())
  writeFileSync(path, Buffer.from(data.split(',')[1], 'base64'))
}
await act('reset')
await step(80)
await capture('preview/day.png')
await act('night', true)
await step(120)
await capture('preview/night.png')
await act('night', false)
await step(100)
const landmarks = only.length
  ? only
  : ['flinders', 'fed-square', 'eureka', 'arts-centre', 'exhibition', 'mcg', 'st-pauls', 'shrine']
for (const id of landmarks) {
  await act('landmark', id)
  await step(55)
  await capture(`preview/${id}.png`)
}
await browser.close()
server.close()
console.log('wrote preview/')
