// Final release captures: day/night overviews with UI, clean canvas views, all landmarks, compact and embed.
// Run: node scripts/shot.mjs [dist-single/index.html]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { chromium } from 'playwright-core'

const file = process.argv[2] ?? 'dist-single/index.html'
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
mkdirSync('shots', { recursive: true })

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.setDefaultTimeout(300000)
await page.goto(`${base}?capture=1&quality=low`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 60000 })
const step = (n) => page.evaluate((a) => window.__scene.step(a), n)
const act = (name, arg) => page.evaluate(([n, a]) => window.__scene.act(n, a), [name, arg])
async function canvas(path) {
  const data = await page.evaluate(() => window.__scene.shot())
  writeFileSync(path, Buffer.from(data.split(',')[1], 'base64'))
}
async function ui(path) {
  try {
    await page.screenshot({ path, timeout: 300000 })
    return true
  } catch (error) {
    console.log(`skipped ${path}: ${error.message.split('\n')[0]}`)
    return false
  }
}

await act('reset')
await step(80)
await canvas('shots/overview-day.png')
await ui('shots/overview-day-ui.png')

await act('landmark', 'eureka')
await step(55)
await canvas('shots/lm-eureka.png')
await ui('shots/lm-eureka-ui.png')
await act('close')
await act('reset')
await step(70)

await act('night', true)
await step(120)
await canvas('shots/overview-night.png')
await ui('shots/overview-night-ui.png')
await act('night', false)
await step(100)

const landmarks = ['flinders', 'fed-square', 'eureka', 'arts-centre', 'exhibition', 'mcg', 'st-pauls', 'shrine']
for (const id of landmarks) {
  await act('landmark', id)
  await step(55)
  await canvas(`shots/lm-${id}.png`)
}
await act('reset')
await step(70)

const compact = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
await compact.goto(`${base}?capture=1&quality=low`, { waitUntil: 'load' })
await compact.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 60000 })
await compact.evaluate(() => window.__scene.step(4))
const compactData = await compact.evaluate(() => window.__scene.shot())
writeFileSync('shots/compact-390.png', Buffer.from(compactData.split(',')[1], 'base64'))
try {
  await compact.screenshot({ path: 'shots/compact-390-ui.png', timeout: 300000 })
} catch {
  console.log('skipped compact UI shot')
}
await compact.close()

const embed = await browser.newPage({ viewport: { width: 345, height: 345 }, hasTouch: true })
await embed.goto(`${base}?capture=1&embed=1&quality=low`, { waitUntil: 'load' })
await embed.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 60000 })
await embed.evaluate(() => window.__scene.step(4))
const embedData = await embed.evaluate(() => window.__scene.shot())
writeFileSync('shots/embed-345.png', Buffer.from(embedData.split(',')[1], 'base64'))
try {
  await embed.screenshot({ path: 'shots/embed-345-ui.png', timeout: 300000 })
} catch {
  console.log('skipped embed UI shot')
}
await embed.close()

await browser.close()
server.close()
console.log('wrote shots/')
