// The isolated Orca frame deliberately denies the async Clipboard API. The two
// draw.io copy-as-image actions must fall back to the user-gesture copy event.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname } from 'node:path'

const require=createRequire(import.meta.url)
const {chromium}=require('playwright')
const editorRoot=new URL('../../editor/',import.meta.url)
const html=readFileSync(new URL('index.html',editorRoot),'utf8')
const template=readFileSync(new URL('../../templates/empty.drawio',import.meta.url),'utf8')
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})

try {
  const page=await browser.newPage({viewport:{width:1000,height:700}})
  const prelude=`<script>
  Object.defineProperty(navigator,'clipboard',{value:{write(){return Promise.reject(new DOMException('Permission denied','NotAllowedError'))},writeText(){return Promise.reject(new DOMException('Permission denied','NotAllowedError'))}}});
  window.ClipboardItem=class ClipboardItem {constructor(data){this.data=data}static supports(){return true}};
  window.current={version:1,readOnly:false,content:{kind:'text',text:${JSON.stringify(template)}}};
  window.orca={document:{onDidChange(fn){window.receive=fn;fn(current)},async applyEdit(edit){current={...current,version:current.version+1,content:edit.content};receive(current)}},on(){}};
  </script>`
  await page.route('https://plugin.test/**',route=>{
    const path=new URL(route.request().url()).pathname.slice(1)||'index.html'
    const body=path==='index.html'?Buffer.from(prelude+html):readFileSync(new URL(path,editorRoot))
    const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(path)]||'application/octet-stream'
    return route.fulfill({status:200,contentType:type,body})
  })
  await page.setContent('<iframe sandbox="allow-scripts allow-same-origin" src="https://plugin.test/index.html" style="width:100%;height:680px;border:0"></iframe>')
  const frame=page.frames()[1]
  await frame.waitForFunction(()=>document.getElementById('message')?.hidden,null,{timeout:30000})
  assert.deepEqual(await frame.evaluate(()=>({
    clipboard:typeof navigator.clipboard?.write==='function',
    clipboardItem:typeof ClipboardItem==='function',
    imageAction:drawioUi.actions.get('copyAsImage')?.isEnabled()===true,
    svgAction:drawioUi.actions.get('copyAsSvg')?.isEnabled()===true
  })),{clipboard:true,clipboardItem:true,imageAction:true,svgAction:true})
  await frame.evaluate(()=>{
    const graph=drawioUi.editor.graph
    graph.setSelectionCell(graph.insertVertex(graph.getDefaultParent(),'copy-me','Copy me',20,20,100,40))
    window.copied=[]
    window.addEventListener('copy',event=>copied.push({
      html:event.clipboardData.getData('text/html'),
      text:event.clipboardData.getData('text/plain')
    }))
  })
  const copyFromEditMenu=async action=>{
    const {menu,label}=await frame.evaluate(action=>({
      menu:mxResources.get('edit'),
      label:mxResources.get(action)
    }),action)
    await frame.locator('.geMenubarContainer').getByText(menu,{exact:true}).click()
    const item=frame.getByText(label,{exact:true}).last()
    await item.click({timeout:3000})
  }
  await copyFromEditMenu('copyAsSvg')
  await frame.waitForFunction(()=>copied.length===1,null,{timeout:3000})
  assert.match(await frame.evaluate(()=>copied[0].html),/^<img src="data:image\/svg\+xml/)
  assert.match(await frame.evaluate(()=>copied[0].text),/^<svg\b/)
  await copyFromEditMenu('copyAsImage')
  await frame.waitForFunction(()=>copied.length===2,null,{timeout:3000})
  assert.match(await frame.evaluate(()=>copied[1].html),/^<img src="data:image\/png/)
  console.log('PASS: Edit > Copy as Image/SVG uses the isolated-frame clipboard fallback')
} finally {await browser.close()}
