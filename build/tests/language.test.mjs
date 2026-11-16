// The editor UI language follows Orca by default and a persisted menu choice when set.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname } from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const editorRoot=new URL('../../editor/',import.meta.url)
const html=readFileSync(new URL('index.html',editorRoot),'utf8')
const template=readFileSync(new URL('../../templates/empty.drawio',import.meta.url),'utf8')
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})

const openEditor=async ({browserLocale='ar-EG',orcaLocale,storedLanguage=null}) => {
  const page=await browser.newPage({viewport:{width:1440,height:1000},locale:browserLocale})
  const errors=[]
  page.on('pageerror', error=>errors.push(error.message))
  const requests=[]
  page.on('request', request=>{
    if (/^https?:/.test(request.url())&&!request.url().startsWith('https://plugin.test/')) requests.push(request.url())
  })
  const prelude=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src data:; base-uri 'none'; form-action 'none'"><script>
  window.violations=[];document.addEventListener('securitypolicyviolation',e=>violations.push(e.violatedDirective+': '+e.blockedURI));window.edits=[];window.languageWrites=[];window.hostLocale=${JSON.stringify(browserLocale)};window.storedLanguage=${JSON.stringify(storedLanguage)};window.current={version:1,readOnly:false,content:{kind:'text',text:${JSON.stringify(template)}}};
  window.orca={get locale(){return hostLocale},storage:{async get(key){hostLocale=${JSON.stringify(orcaLocale)};return key==='ui-language'?storedLanguage:null},async set(key,value){languageWrites.push(['set',key,value]);storedLanguage=value},async delete(key){languageWrites.push(['delete',key]);storedLanguage=null}},document:{onDidChange(fn){window.receive=fn;fn(current)},async applyEdit(edit){if(window.rejectEdit)throw Error('conflict');if(edit.baseVersion!==current.version)throw Error('stale version');edits.push(edit);current={...current,version:current.version+1,content:edit.content};receive(current)}},on(name,fn){window.flush=fn}};
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
  return {page,frame,errors,requests}
}

const assertClean=async ({frame,errors,requests},locale) => {
  const violations=await frame.evaluate(()=>window.violations)
  assert.deepEqual(errors,[],`${locale} page errors`)
  assert.deepEqual(requests,[],`${locale} external requests`)
  assert.deepEqual(violations,[],`${locale} CSP violations`)
}

try {
  const cases=[
    ['zh-CN','en-US','en','File','Language'],['en-US','zh-CN','zh','文件','语言'],
    ['ar-EG','de-DE','de','Datei','Sprache'],['ar-EG','es-ES','es','Archivo','Idioma'],
    ['ar-EG','fr-FR','fr','Fichier','Langue'],['ar-EG','it-IT','it','File','Lingua'],
    ['ar-EG','ja-JP','ja','ファイル','言語'],['ar-EG','ko-KR','ko','파일','언어'],
    ['ar-EG','nl-NL','nl','Bestand','Taal'],['ar-EG','pl-PL','pl','Plik','Język'],
    ['ar-EG','pt-BR','pt-br','Arquivo','Idioma'],['ar-EG','pt-Latn-BR','pt-br','Arquivo','Idioma'],
    ['ar-EG','pt-PT','pt','Ficheiro','Idioma'],['ar-EG','ru-RU','ru','Файл','Язык'],
    ['ar-EG','tr-TR','tr','Dosya','Dil'],['ar-EG','zh-TW','zh-tw','檔案','語言'],
    ['ar-EG','zh-Hant-HK','zh-tw','檔案','語言'],['zh-CN','sv-SE','en','File','Language']
  ]
  const labels={}
  for (const [browserLocale,orcaLocale,expectedLanguage,expectedLabel,languageMenu] of cases) {
    const opened=await openEditor({browserLocale,orcaLocale})
    const {page,frame}=opened
    const [file,lang,menus]=await frame.evaluate(()=>[
      mxResources.get('file'),mxLanguage,
      [...document.querySelector('.geMenubarContainer>.geMenubar').children].map(element=>element.textContent)
    ])
    labels[orcaLocale]=file
    assert.equal(lang,expectedLanguage,`${orcaLocale} selected language`)
    assert.equal(file,expectedLabel,`${orcaLocale} resource bundle`)
    assert.ok(menus.includes(languageMenu),`${orcaLocale} visible language menu: ${JSON.stringify(menus)}`)
    await assertClean(opened,orcaLocale)
    await page.close()
  }

  // A manual choice updates the existing frame, persists across files, and can return to Orca.
  const selected=await openEditor({browserLocale:'zh-CN',orcaLocale:'en-US'})
  await selected.frame.evaluate(()=>{window.languageSwitchMarker='same-frame'})
  await selected.frame.locator('.geMenubarContainer').getByText('Language',{exact:true}).click()
  await selected.frame.locator('.mxPopupMenu').getByText('简体中文',{exact:true}).click()
  await selected.frame.waitForFunction(()=>mxLanguage==='zh')
  assert.equal(await selected.frame.evaluate(()=>window.languageSwitchMarker),'same-frame','language switch keeps the editor frame')
  assert.deepEqual(await selected.frame.evaluate(()=>window.languageWrites),[['set','ui-language','zh']])
  assert.equal(await selected.frame.locator('.geMenubarContainer>.geMenubar').getByText('编辑',{exact:true}).textContent(),'编辑')
  await assertClean(selected,'manual zh selection')
  await selected.page.close()

  const persisted=await openEditor({browserLocale:'zh-CN',orcaLocale:'en-US',storedLanguage:'zh'})
  assert.equal(await persisted.frame.evaluate(()=>mxLanguage),'zh','stored language overrides Orca')
  await persisted.frame.locator('.geMenubarContainer').getByText('语言',{exact:true}).click()
  await persisted.frame.locator('.mxPopupMenu').getByText('Orca — English',{exact:true}).click()
  await persisted.frame.waitForFunction(()=>mxLanguage==='en')
  assert.deepEqual(await persisted.frame.evaluate(()=>window.languageWrites),[['delete','ui-language']])
  assert.equal(await persisted.frame.locator('.geMenubarContainer>.geMenubar').getByText('Edit',{exact:true}).textContent(),'Edit')
  await assertClean(persisted,'follow Orca selection')
  await persisted.page.close()

  console.log('PASS: UI language follows Orca and persists menu choices',JSON.stringify(labels))
} finally { await browser.close() }
