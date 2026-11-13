// The editor UI language follows the browser locale and falls back to English.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, extname } from 'node:path'
const require = createRequire(resolve(process.env.ORCA_DIR || '/data/LinDoo/orca','package.json'))
const { chromium } = require('playwright')
const editorRoot=new URL('../../editor/',import.meta.url)
const html=readFileSync(new URL('index.html',editorRoot),'utf8')
const template=readFileSync(new URL('../../templates/empty.drawio',import.meta.url),'utf8')
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
try {
  const cases=[['en-US','File'],['en','File'],['de-DE','Datei'],['fr-FR','Fichier'],['es-ES','Archivo'],['ja-JP','ファイル'],['pt-BR','Arquivo'],['pt-PT','Ficheiro'],['zh-CN','文件'],['zh-TW','檔案'],['zh-Hant-HK','檔案'],['sv-SE','File'],['ar-EG','File']]
  const labels={}
  // sv and ar have no bundle here, so they must fall back to English rather than fail.
  for (const [locale,expected] of cases) {
    const page=await browser.newPage({viewport:{width:1440,height:1000},locale})
    const errors=[]
    page.on('pageerror', e=>errors.push(e.message))
    const requests=[]
    page.on('request', r=>{if (/^https?:/.test(r.url())&&!r.url().startsWith('https://plugin.test/')) requests.push(r.url())})
    const prelude=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src data:; base-uri 'none'; form-action 'none'"><script>
    window.violations=[];document.addEventListener('securitypolicyviolation',e=>violations.push(e.violatedDirective+': '+e.blockedURI));window.edits=[];window.current={version:1,readOnly:false,content:{kind:'text',text:${JSON.stringify(template)}}};
    window.orca={document:{onDidChange(fn){window.receive=fn;fn(current)},async applyEdit(edit){if(window.rejectEdit)throw Error('conflict');if(edit.baseVersion!==current.version)throw Error('stale version');edits.push(edit);current={...current,version:current.version+1,content:edit.content};receive(current)}},on(name,fn){window.flush=fn}};
    </script>`
    await page.route('https://plugin.test/**',route=>{
      const path=new URL(route.request().url()).pathname.slice(1)||'index.html'
      const body=path==='index.html'?Buffer.from(prelude+html):readFileSync(new URL(path,editorRoot))
      const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.bin':'application/octet-stream','.svg':'image/svg+xml'}[extname(path)]||'application/octet-stream'
      return route.fulfill({status:200,contentType:type,body})
    })
    await page.setContent('<iframe sandbox="allow-scripts allow-same-origin" src="https://plugin.test/index.html" style="width:100%;height:980px;border:0"></iframe>')
    await page.waitForSelector('iframe')
    const frame=page.frames()[1]
    await frame.waitForFunction(()=>document.getElementById('message')?.hidden,null,{timeout:30000})
    const [file,lang]=await frame.evaluate(()=>[mxResources.get('file'),mxLanguage])
    labels[locale]=file
    if (expected) assert.equal(file,expected,`${locale} menu label (language ${lang})`)
    assert.deepEqual(errors,[],`${locale} page errors`)
    await page.close()
  }
  console.log('PASS: UI language follows the browser locale',JSON.stringify(labels))
} finally { await browser.close() }
