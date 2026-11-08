import { chromium } from 'playwright-core'
const url = process.argv[2] ?? 'https://somphol.github.io/melbourne-miniature/?capture=1&quality=low'
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: [`--use-angle=${process.env.SHOOT_ANGLE ?? 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 900, height: 600 } })
page.setDefaultTimeout(90000)
const errors = []
let external = 0
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('request', (r) => { if (!r.url().includes('somphol.github.io') && !r.url().startsWith('data:')) external++ })
await page.goto(url, { waitUntil: 'load' })
await page.waitForFunction(() => window.__scene?.ready === true, null, { timeout: 90000 })
await page.evaluate(() => window.__scene.step(2))
const facts = await page.evaluate(() => window.__scene.inspect().facts)
console.log(JSON.stringify({ url, title: await page.title(), facts, external, errors }, null, 2))
await browser.close()
