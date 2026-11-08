import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { chromium } from 'playwright-core'
const html=readFileSync('dist-single/index.html')
const server=createServer((req,res)=>{const p=(req.url??'/').split('?')[0]; if(p!=='/'&&p!=='/index.html'){res.writeHead(404).end();return} res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(html)})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const base=`http://127.0.0.1:${server.address().port}/`
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
for (const [name,w,h,extra] of [['compact-390',390,844,''],['embed-345',345,345,'&embed=1']]) {
  const p=await browser.newPage({viewport:{width:w,height:h},hasTouch:true})
  p.setDefaultTimeout(180000)
  await p.goto(`${base}?capture=1&quality=low${extra}`,{waitUntil:'domcontentloaded'})
  await p.waitForFunction(()=>window.__scene?.ready===true,null,{timeout:120000})
  await p.evaluate(()=>window.__scene.step(4))
  const data=await p.evaluate(()=>window.__scene.shot())
  writeFileSync(`shots/${name}.png`,Buffer.from(data.split(',')[1],'base64'))
  try { await p.screenshot({path:`shots/${name}-ui.png`,timeout:180000}) } catch { console.log('ui shot skipped',name) }
  await p.close()
}
await browser.close();server.close();console.log('wrote small shots')
