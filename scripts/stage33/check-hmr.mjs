import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.STAGE33_PLAYWRIGHT_MODULE??'/Users/fuzheyuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({headless:true,executablePath:process.env.STAGE33_CHROMIUM??'/Users/fuzheyuan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const originals=new Map(['lib/grammar/protocol.ts','lib/grammar/vocabulary.ts','lib/grammar.ts'].map(path=>[path,readFileSync(path,'utf8')]));
const checks=[],p=await b.newPage(),errors=[],requests=[],consoleLines=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()+' '+(r.postData()??'')));p.on('console',m=>consoleLines.push(m.text()));
await p.addInitScript(()=>{
 window.__stage33Harness={token:Math.random(),hold:false,held:[]};
 const native=window.setTimeout;
 window.setTimeout=function(fn,delay,...args){if(window.__stage33Harness.hold&&delay===0&&typeof fn==='function'&&String(fn).includes('getAnalysisIdentity')){window.__stage33Harness.held.push(fn);return native(()=>{},60000);}return native(fn,delay,...args);};
});
try{
 await p.goto('http://127.0.0.1:5188');await p.waitForLoadState('networkidle');const token=await p.evaluate(()=>window.__stage33Harness.token);
 const input=p.getByLabel('需要分析的英文句子'),run=p.getByRole('button',{name:'分析句子',exact:true}),done=p.getByRole('heading',{name:/成分解析/}),suggest=p.getByRole('button',{name:'应用此建议并重新分析',exact:true});
 const hold=async()=>p.evaluate(()=>{window.__stage33Harness.hold=true;window.__stage33Harness.held=[];});
 const flush=async()=>p.evaluate(()=>{window.__stage33Harness.hold=false;const fs=window.__stage33Harness.held.splice(0);if(fs.length!==1)throw Error(`Expected one held analyzer callback, got ${fs.length}`);fs.forEach(fn=>fn());});
 await input.fill('The book is under the table.');await hold();await run.click();await input.fill('Where is the book?');await flush();assert.equal(await done.count(),0);assert.equal(await input.inputValue(),'Where is the book?');checks.push({id:'already-queued-callback-rejected-after-edit',passed:true});
 await run.click();await done.waitFor();await p.getByText('词汇与搭配查询',{exact:true}).click();await p.getByLabel('词元或完整词形').fill('where');
 await hold();await run.click();await p.getByRole('button',{name:'放入例句：Where is the book?',exact:true}).click();await flush();assert.equal(await done.count(),0);assert.equal(await input.evaluate(e=>document.activeElement===e),true);checks.push({id:'already-queued-callback-rejected-after-query-example',passed:true});
 for(const [field,path,search,replacement] of [
  ['ruleVersion','lib/grammar/protocol.ts','export const RULE_VERSION = "0.23.1";','export const RULE_VERSION = "0.23.1-hmr-check";'],
  ['lexiconVersion','lib/grammar/vocabulary.ts','export const LEXICON_VERSION = snapshot.lexiconVersion;','export const LEXICON_VERSION = "1.8.1-hmr-check";'],
  ['lexiconHash','lib/grammar/vocabulary.ts','export const LEXICON_HASH = snapshot.lexiconHash;',`export const LEXICON_HASH = "${'f'.repeat(64)}";`],
 ]){
  await input.fill('The books is under the table.');await run.click();await suggest.waitFor();assert.ok(originals.get(path).includes(search));writeFileSync(path,originals.get(path).replace(search,replacement));await suggest.waitFor({state:'detached'});assert.equal(await input.inputValue(),'The books is under the table.');assert.equal(await done.count(),0);assert.equal(await p.evaluate(()=>window.__stage33Harness.token),token);checks.push({id:`real-file-hmr-${field}`,passed:true,withoutReload:true});
  writeFileSync(path,originals.get(path));await p.waitForTimeout(900);
 }
 await input.fill('Where is the book?');await hold();await run.click();writeFileSync('lib/grammar/protocol.ts',originals.get('lib/grammar/protocol.ts').replace('"0.23.1"','"0.23.1-hmr-pending"'));await p.waitForTimeout(1200);await flush();assert.equal(await done.count(),0);assert.equal(await input.inputValue(),'Where is the book?');checks.push({id:'real-file-hmr-rejects-held-old-identity-callback',passed:true});writeFileSync('lib/grammar/protocol.ts',originals.get('lib/grammar/protocol.ts'));await p.waitForTimeout(900);
 const source=originals.get('lib/grammar.ts'),needle='export function analyzeSentence(input: string, inputVersion = 0): AnalysisResult {';assert.ok(source.includes(needle));writeFileSync('lib/grammar.ts',source.replace(needle,needle+'\n  if ((globalThis as typeof globalThis & {__stage33Fail?: boolean}).__stage33Fail) throw new Error("Synthetic local acceptance fault");'));await p.waitForTimeout(1200);await p.evaluate(()=>{window.__stage33Fail=true;});await input.fill('The book is on the table.');await run.click();await p.getByRole('alert').filter({hasText:'本次分析失败'}).waitFor();assert.equal(await input.inputValue(),'The book is on the table.');assert.equal(await done.count(),0);await p.evaluate(()=>{window.__stage33Fail=false;});await run.click();await done.waitFor();checks.push({id:'controlled-analyzer-failure-retains-input-and-retry-succeeds',passed:true});
 assert.equal(requests.some(s=>/The book|Where is|The books/.test(s)),false);assert.equal(consoleLines.some(s=>/The book|Where is|The books/.test(s)),false);assert.deepEqual(errors,[]);
}finally{for(const [path,bytes]of originals)writeFileSync(path,bytes);await b.close();}
for(const [path,bytes]of originals)assert.equal(readFileSync(path,'utf8'),bytes);
writeFileSync('docs/verification/stage33f-hmr-browser.json',JSON.stringify({browser:b.version(),checks,originalBytesRestored:true,errors,harness:'Held actual analyzer setTimeout callbacks are invoked after cancellation to exercise version/request guards. Failure injected temporarily into analyzer source, restored byte-for-byte. Identity changes use real source file watcher.'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,originalBytesRestored:true}));
