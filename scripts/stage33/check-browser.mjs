import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
// Use the installed workspace runtime; no browser download or production dependency.
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.STAGE33_PLAYWRIGHT_MODULE??'/Users/fuzheyuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const executablePath=process.env.STAGE33_CHROMIUM??'/Users/fuzheyuan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const port=process.argv[2], mode=process.argv[3];assert.ok(port&&mode);
const b=await chromium.launch({headless:true,executablePath});
const report={mode,browser:b.version(),ruleVersion:'0.23.1',lexiconVersion:'1.8.1',viewports:[]};
try{for(const width of [1280,390]){
 const c=await b.newContext({viewport:{width,height:1000}}),p=await c.newPage();
 const requests=[],consoleLines=[],errors=[],checks=[];p.on('request',r=>requests.push(r.url()+' '+(r.postData()??'')));p.on('console',m=>consoleLines.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  window.__stage33LongTasks=[];new PerformanceObserver(l=>window.__stage33LongTasks.push(...l.getEntries().map(e=>({duration:e.duration,startTime:e.startTime})))).observe({type:'longtask',buffered:true});
 });
 const check=(id,details={})=>checks.push({id,passed:true,...details});
 await p.goto(`http://127.0.0.1:${port}`);await p.waitForLoadState('networkidle');const actionStart=requests.length;
 const input=p.getByLabel('需要分析的英文句子'),run=p.getByRole('button',{name:'分析句子',exact:true}),done=p.getByRole('heading',{name:/成分解析/});
 const analyze=async text=>{await input.fill(text);await run.click();await done.waitFor();};
 await analyze('The book was near the green chairs.');await p.getByRole('button',{name:'表语 near the green chairs C',exact:true}).click();await p.getByRole('button',{name:'定语 · green',exact:true}).click();await p.getByRole('button',{name:'返回上层短语',exact:true}).click();check('location-complement-and-nested-attribute');
 await input.fill('Where were the books?');await input.press('Control+Enter');await done.waitFor();await p.getByRole('button',{name:'表语 Where C',exact:true}).focus();await p.keyboard.press('Enter');assert.match(await p.locator('.detail-callout').innerText(),/WH-COMPLEMENT-001/);check('ctrl-enter-and-keyboard-component');
 await input.fill('The books is under the chair.');await input.press('Meta+Enter');await p.getByRole('button',{name:'应用此建议并重新分析',exact:true}).click();await done.waitFor();assert.equal(await input.inputValue(),'The books are under the chair.');check('meta-enter-and-correction-loop');
 for(const text of ['She sleeps under the table.','Where does she work?','She can be kind.','She has been kind.','Our father smiled and their teacher gave her a new picture.']){await analyze(text);check('legacy-regression',{text});}
 await p.getByRole('button',{name:'分句 Our father smiled CL',exact:true}).click();const back=p.getByRole('button',{name:'返回整句',exact:true});await back.waitFor();assert.equal(await back.evaluate(e=>document.activeElement===e),true);await back.press('Enter');await p.getByRole('button',{name:'分句 Our father smiled CL',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'分句 Our father smiled CL',exact:true}).evaluate(e=>document.activeElement===e),true);check('clause-drilldown-and-keyboard-focus-return');
 await input.fill('The book is near the table and the bag is under the chair.');await run.click();await p.locator('.analysis-waiting').waitFor();assert.equal(await done.count(),0);assert.equal(await p.getByRole('button',{name:'应用此建议并重新分析',exact:true}).count(),0);check('no-location-inheritance-into-clauses');
 await input.fill('The book is near the satellite.');await run.click();await p.getByRole('button',{name:'查看原文：satellite',exact:true}).click();assert.deepEqual(await input.evaluate(e=>[e.selectionStart,e.selectionEnd,document.activeElement===e]),[21,30,true]);check('unknown-range-and-focus');
 await p.getByText('词汇与搭配查询',{exact:true}).click();const search=p.getByLabel('词元或完整词形'),filter=p.getByLabel('按词性筛选');await search.fill('where');await filter.selectOption('noun');await p.getByText(/当前词典未收录此词/).waitFor();await filter.selectOption('function-word');const insert=p.getByRole('button',{name:'放入例句：Where is the book?',exact:true});await insert.click();assert.equal(await input.inputValue(),'Where is the book?');assert.equal(await input.evaluate(e=>document.activeElement===e),true);assert.equal(await done.count(),0);await run.click();await done.waitFor();check('query-filter-and-insertion-focus');
 await input.fill('The bag is on the chair.');assert.equal(await done.count(),0);await run.dblclick();await done.waitFor();assert.equal(await p.locator('#result-panel .component-analysis').count(),1);check('edit-invalidation-and-continuous-click');
 const cases=(await import('../../tests/helpers/stage33-performance.mjs')).stage33PerformanceCases;
 const timings=[];for(const f of cases){const start=Date.now();await input.fill(f.input);await run.click();await p.locator('.check-status').waitFor();timings.push({id:f.id,utf16Length:1000,interactionMs:Date.now()-start});if(f.status==='complete')await done.waitFor();else assert.equal(await done.count(),0);}
 await input.fill(cases[0].input+' ');await run.click();await p.locator('.analysis-waiting').waitFor();assert.match(await p.locator('#result-panel').innerText(),/1000|过长/);check('all-performance-inputs-and-1001-refusal',{cases:cases.length});
 await analyze('The book was near the green chairs.');await p.screenshot({path:`docs/verification/stage33f-${mode}-${width}.png`,fullPage:true});
 const startRequests=requests.length;const marker='privatesentinel';await c.setOffline(true);await input.fill(`The book is near the ${marker}.`);await run.click();await p.getByRole('button',{name:`查看原文：${marker}`,exact:true}).waitFor();await search.fill(marker);await p.getByText(/当前词典未收录/).waitFor();await analyze('Where are the books?');
 const offlineRequests=requests.length-startRequests;assert.equal(offlineRequests,0);assert.equal(requests.some(s=>s.includes(marker)),false);assert.equal(consoleLines.some(s=>s.includes(marker)),false);
 const storage=await p.evaluate(async()=>({local:Object.entries(localStorage),session:Object.entries(sessionStorage),cookies:document.cookie,databases:await indexedDB.databases(),caches:await caches.keys()}));assert.equal(JSON.stringify(storage).includes(marker),false);assert.deepEqual(storage.local,[]);assert.deepEqual(storage.session,[]);assert.deepEqual(storage.databases,[]);assert.deepEqual(storage.caches,[]);check('offline-and-zero-private-network-console-storage',{offlineRequests,storage});
 const longTasks=await p.evaluate(()=>window.__stage33LongTasks);assert.equal(requests.length-actionStart,0);check('zero-action-requests-online-and-offline',{requests:requests.length-actionStart});await c.setOffline(false);await p.reload();await p.waitForLoadState('networkidle');assert.equal(await input.inputValue(),'The teacher gave the students a useful book yesterday.');assert.equal(await done.count(),0);await p.getByText('词汇与搭配查询',{exact:true}).click();assert.equal(await search.inputValue(),'');assert.equal(await filter.inputValue(),'all');check('refresh-defaults');
 assert.equal(await p.getByRole('tab').count(),1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 report.viewports.push({width,checks,timings,longTasks,errors,consoleErrorCount:consoleLines.filter(s=>/Encountered two children|Uncaught|Error:/.test(s)).length});await c.close();
}writeFileSync(`docs/verification/stage33f-${mode}-browser.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({mode,checks:report.viewports.reduce((n,v)=>n+v.checks.length,0)}));}finally{await b.close();}
