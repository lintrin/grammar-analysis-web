// Dev-only synthetic identities; every original byte is restored in finally. No reload during verification.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {loadStage32Acceptance} from './helpers/stage32-fixtures.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const files=['lib/grammar/protocol.ts','lib/grammar/generated/lexicon.json','data/analysis-manifest.json','data/grammar/query-capabilities.json'];
const originals=Object.fromEntries(files.map(path=>[path,readFileSync(path,'utf8')]));
const error=loadStage32Acceptance().fixtures.find(f=>f.kind==='error');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});let changed=false;
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],logs=[],requests=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>logs.push(m.text()));page.on('request',r=>requests.push([r.url(),r.postData()]));
 await page.addInitScript(()=>{const timer=window.setTimeout;window.setTimeout=(cb,delay,...args)=>{if(window.stage32Hold&&delay===0&&String(cb).includes('requestId')){window.stage32Held=()=>cb(...args);return timer(()=>{},600000);}return timer(cb,delay,...args);};});
 await page.goto(process.env.CLAUSE_BASE_URL??'http://127.0.0.1:5188');await page.waitForLoadState('networkidle');
 const input=page.getByRole('textbox',{name:'需要分析的英文句子'}),status=text=>page.locator('.result-status').filter({hasText:text}).waitFor();
 const show=async()=>{await input.fill(error.input);await input.press('Control+Enter');await status('部分支持');await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();assert.equal(await page.locator('.correction-card').count(),1);};
 const variant=(field,value)=>{
  changed=true;
  const snapshot=JSON.parse(originals[files[1]]),manifest=JSON.parse(originals[files[2]]),metadata=JSON.parse(originals[files[3]]);
  if(field!=='ruleVersion')snapshot[field]=value;manifest[field]=value;metadata[field]=value;
  const protocol=field==='ruleVersion'?originals[files[0]].replace('"0.22.4"',JSON.stringify(value)):originals[files[0]];
  writeFileSync(files[0],protocol);writeFileSync(files[1],JSON.stringify(snapshot)+'\n');writeFileSync(files[2],JSON.stringify(manifest)+'\n');writeFileSync(files[3],JSON.stringify(metadata)+'\n');
 };
 const variants=[];
 for(const [field,value]of [['ruleVersion','0.22.4-stage32-hmr'],['lexiconVersion','stage32-hmr-release'],['lexiconHash','e'.repeat(64)]]){
  await show();variant(field,value);await status('等待分析');assert.equal(await input.inputValue(),error.input);assert.equal(await page.locator('.correction-card').count(),0);assert.equal(await page.locator('.sentence-part').count(),0);variants.push({field,oldResultAndSuggestionCleared:true,inputRetained:true});
 }
 await page.evaluate(()=>{window.stage32Hold=true;});await page.getByRole('button',{name:'分析句子',exact:true}).click();await page.waitForFunction(()=>typeof window.stage32Held==='function');
 for(const path of files)writeFileSync(path,originals[path]);changed=false;await status('等待分析');await page.evaluate(()=>{window.stage32Hold=false;window.stage32Held();});await page.waitForTimeout(250);assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.equal(await page.locator('.correction-card').count(),0);assert.equal(await page.locator('.sentence-part').count(),0);assert.equal(await input.inputValue(),error.input);
 await show();assert.deepEqual(errors,[]);assert.equal(logs.some(s=>s.includes(error.input)),false);assert.equal(JSON.stringify(requests).includes(error.input),false);
 writeFileSync(process.env.CLAUSE_STAGE32_HMR_REPORT??'/tmp/stage32-hmr.json',JSON.stringify({browser:browser.version(),ruleVersion:'0.22.4',realFileWatcherWithoutReload:true,variants,heldOldIdentityCallbackRejected:true,originalBytesRestored:files.every(path=>readFileSync(path,'utf8')===originals[path]),pageErrors:errors,privateInputInRequestsOrConsole:false},null,2)+'\n');console.log('PASS stage32 real HMR: rule/version/hash invalidation and held stale callback rejected; all original bytes restored');
}finally{if(changed)for(const path of files)writeFileSync(path,originals[path]);await browser.close();}
