import {migrateClassification} from "./helpers/classification-migration.mjs";
// Stage 26: fixed pre-implementation answers; project-provided JavaScript Playwright runtime.
// Optional local browser acceptance. Use the existing JavaScript Playwright runtime.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {readFileSync} from 'node:fs';
import {stage25PerformanceCases} from './helpers/stage25-performance.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const stage=process.env.CLAUSE_STAGE ?? '27';
const fixtures = JSON.parse(readFileSync(`tests/fixtures/stage${stage}-development.json`)).fixtures;
if(['29','30'].includes(stage))fixtures.push(...JSON.parse(readFileSync(`tests/fixtures/stage${stage}-supplement.json`)).fixtures);
if(stage==='29')fixtures.push(...JSON.parse(readFileSync('tests/fixtures/stage29-review-fixes.json')).fixtures);
if(['29','30'].includes(stage))fixtures.push(...JSON.parse(readFileSync('tests/fixtures/stage29-30-review-fixes.json')).fixtures.filter(f=>String(f.stage)===stage));
for (const f of fixtures) f.expected=migrateClassification(f.expected,f.input);
if(stage==='27') fixtures.push(...JSON.parse(readFileSync('tests/fixtures/structure-migrations.json')).migrations.filter(f=>f.stage===27&&f.expected.status==='complete').map((f,i)=>({...f,id:`migration-${i}`,kind:'correct'})));
const byId = new Map(fixtures.map(f => [f.id,f]));
const performanceCases = [...stage25PerformanceCases,
  {id:'new-verb-1000',input:('The '+'tall '.repeat(145)+'teacher opens the door.').padEnd(1000,' '),status:'complete'},
  {id:'clean-modifiers-1000',input:('The '+'clean '.repeat(145)+'teacher opens the door.').padEnd(1000,' '),status:'complete'},
];
if(stage==='30')performanceCases.push({id:'multiple-frame-1000',input:('The '+'tall '.repeat(145)+'teacher will read.').padEnd(1000,' '),status:'complete'},{id:'multiple-frame-explosion',input:('She '+'read '.repeat(180)).padEnd(1000,' '),status:'unsupported'});
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try {
  const context = await browser.newContext({viewport:{width:1280,height:1000}}), page = await context.newPage();
  const errors = [], logs = [], requests = [];
  page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>logs.push(m.text()));
  page.on('request',r=>requests.push([r.url(),r.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL ?? 'http://127.0.0.1:5188'); await page.waitForLoadState('networkidle');
  const navigation = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    return {domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd};
  });
  console.log('Rendered controls:',(await page.getByRole('button').allTextContents()).slice(0,4));
  const input = page.getByRole('textbox',{name:'需要分析的英文句子'}), defaultInput = await input.inputValue();
  const statusLabels = {complete:'规则分析完成',partial:'部分支持',unsupported:'超出当前范围',ambiguous:'存在歧义',invalid:'请检查输入'};
  const status = s => page.locator('.result-status').filter({hasText:statusLabels[s]}).waitFor();
  const displayed = () => page.locator('.part-text, .sentence-gap').allTextContents().then(t=>t.join(''));
  const titles = {SV:'主语 + 谓语',SVO:'主语 + 谓语 + 宾语',SVC:'主语 + 系动词 + 表语',SVOO:'主语 + 谓语 + 双宾语',SVOC:'主语 + 谓语 + 宾语 + 宾语补足语'};
  const codes = {subject:'S',verb:'V',indirectObject:'IO',object:'DO',complement:'C',adverbial:'A',connector:'LINK'};
  const classification = async c => {
    assert.equal(await page.locator('.result-overview h3').innerText(),titles[c.pattern]);
    if(c.questionType?.startsWith('wh-'))assert.match(await page.locator('.result-overview p').innerText(),new RegExp({'wh-subject':'主语提问','wh-object':'宾语提问','wh-adverbial':'状语提问'}[c.questionType]));
    assert.match(await page.locator('.result-overview p').innerText(),new RegExp({declarative:'陈述句',interrogative:'疑问句',imperative:'祈使句'}[c.purpose]));
    const tense = c.modal==='will'?'will 表达（常见将来用法）':c.modal==='can'?'can 情态结构':c.tense===null?(c.purpose==='imperative'?'动词原形 · 祈使':'时态待确定'):`${c.aspect==='simple'?'一般':''}${c.tense==='past'?'过去':'现在'}${{simple:'',progressive:'进行',perfect:'完成','perfect-progressive':'完成进行'}[c.aspect]}时`;
    assert.equal((await page.locator('.tense-badge').innerText()).replace(/\s+/g,''),`${tense}${c.voice==='passive'?'被动语态':'主动语态'}`.replace(/\s+/g,''));
  };
  const parts = async (text,roots,allNodes) => {
    assert.equal(await page.locator('.nested-part').filter({hasText:'隐含 you'}).count(),roots.filter(n=>n.implicit).length);
    const spans = roots.flatMap(n=>n.ranges.map(q=>({start:q.start,text:text.slice(q.start,q.end),node:n}))).sort((a,b)=>a.start-b.start);
    assert.deepEqual(await page.locator('.sentence-part .part-text').allTextContents(),spans.map(s=>s.text));
    assert.deepEqual(await page.locator('.sentence-part .part-code').allTextContents(),spans.map(s=>s.node.role==='clause'?{main:'MC',subordinate:'SC',independent:'CL'}[s.node.clause.kind]:codes[s.node.role]));
    for(const [i,span] of spans.entries()) if(span.node.role!=='clause' && span.node.ruleId) {
      await page.locator('.sentence-part').nth(i).press('Enter');
      assert.equal(await page.locator('.detail-callout .rule-reference').innerText(),`规则：${span.node.ruleId}`);
    }
    for (const root of roots.filter(n=>allNodes.some(child=>child.parentKey===n.key && child.role==='attribute'))) {
      const index = spans.findIndex(s=>s.node===root);
      await page.locator('.sentence-part').nth(index).press('Enter');
      const children = allNodes.filter(n=>n.parentKey===root.key);
      assert.deepEqual(await page.locator('.nested-part.attribute').allTextContents(),children.map(n=>`定语 · ${n.ranges.map(q=>text.slice(q.start,q.end)).join(' … ')}`));
      for (const child of children) {
        const fragment = child.ranges.map(q=>text.slice(q.start,q.end)).join(' … ');
        await page.getByRole('button',{name:`定语 · ${fragment}`,exact:true}).press('Enter');
        assert.equal(await page.locator('.detail-callout h4 span').innerText(),fragment);
        assert.equal(await page.locator('.detail-callout .rule-reference').innerText(),`规则：${child.ruleId}`);
        await page.getByRole('button',{name:'返回上层短语',exact:true}).press('Enter');
      }
    }
  };
  await page.getByText('当前范围与键盘操作',{exact:true}).click();
  assert.match(await page.locator('.support-help').innerText(),/100 个实义动词/);
  const license = await context.request.get(new URL('/licenses/lemminflect.txt',page.url()).href);
  assert.equal(license.status(),200); assert.match(await license.text(),/Copyright \(C\) 2019 Brad Jascob/);
  await context.setOffline(true); requests.length = 0;
  const check = async f => {
    await page.getByRole('tab',{name:'成分解析',exact:true}).click();
    await input.fill(f.input); assert.equal(await page.locator('.sentence-part').count(),0);
    await input.press('Control+Enter'); await status(f.expected.status); assert.equal(await input.inputValue(),f.input);
    if (f.expected.status==='complete') {
      assert.equal(await displayed(),f.input);
      await parts(f.input,f.expected.nodes.filter(n=>n.parentKey===null),f.expected.nodes);
      if (f.expected.complexity==='simple') await classification(f.expected);
      else {
        assert.match(await page.locator('.result-overview p').innerText(),new RegExp(f.expected.complexity==='compound'?'并列句':'主从复合句'));
        for (const clause of f.expected.nodes.filter(n=>n.role==='clause')) {
          const text = f.input.slice(clause.ranges[0].start,clause.ranges[0].end);
          const button = page.locator('.sentence-part.clause').filter({has:page.getByText(text,{exact:true})});
          await button.press('Enter');
          const back = page.getByRole('button',{name:'返回整句',exact:true}); await back.waitFor();
          assert.equal(await back.evaluate(el=>el===document.activeElement),true);
          assert.equal(await displayed(),text); await classification(clause.clause);
          await parts(f.input,f.expected.nodes.filter(n=>n.parentKey===clause.key),f.expected.nodes);
          await back.press('Enter'); assert.equal(await button.evaluate(el=>el===document.activeElement),true);
          assert.equal(await displayed(),f.input);
        }
      }
    } else assert.equal(await page.locator('.sentence-part').count(),0);
    await page.getByRole('tab',{name:/语法检查/}).click(); assert.equal(await page.locator('.correction-card').count(),f.expected.corrections.length);
    for (const [i,c] of f.expected.corrections.entries()) {
      const card = page.locator('.correction-card').nth(i);
      assert.deepEqual(await card.locator('del').allTextContents(),c.edits.map(e=>e.expected));
      assert.deepEqual(await card.locator('strong').allTextContents(),c.edits.map(e=>e.replacement));
      assert.match(await card.innerText(),new RegExp(c.ruleId));
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  };
  for (const [i,f] of fixtures.entries()) { await check(f); if(i%100===0)console.log(`Structure browser checked ${i+1}/${fixtures.length}`); }
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    for (const f of fixtures.filter(f=>f.kind==='error')) {
      await check(f); await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).press('Enter');
      await status('complete'); const control = byId.get(f.controlId);
      assert.equal(await input.inputValue(),control.input); assert.equal(await page.locator('.correction-card').count(),0);
      await page.getByRole('tab',{name:'成分解析',exact:true}).click();
      await classification(control.expected); assert.equal(await displayed(),control.input);
      await parts(control.input,control.expected.nodes.filter(n=>n.parentKey===null),control.expected.nodes);
    }
    if (width===390) for (const f of fixtures.filter(f=>f.kind==='boundary'||f.expected.complexity!=='simple'&&f.kind==='correct')) await check(f);
  }
  await check(fixtures.find(f=>f.kind==='correct'));
  await page.locator('.result-card').screenshot({path:process.env.CLAUSE_STRUCTURE_SCREENSHOT??`/tmp/grammar-stage${process.env.CLAUSE_STAGE??27}-mobile.png`});
  await input.fill(fixtures.find(f=>f.kind==='correct').input); assert.equal(await page.locator('.correction-card').count(),0);
  for (const [text,s] of [['','invalid'],['x'.repeat(1001),'invalid'],[fixtures.find(f=>f.kind==='correct').input.padEnd(1000,' '),'complete']]) {
    await input.fill(text); await input.press('Control+Enter'); await status(s);
  }
  await page.getByRole('tab',{name:'成分解析',exact:true}).click();
  const timing = [];
  await page.evaluate(() => {
    window.stage26LongTasks=[];
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      window.stage26Observer=new PerformanceObserver(l=>window.stage26LongTasks.push(...l.getEntries().map(e=>e.duration)));
      window.stage26Observer.observe({type:'longtask'});
    }
  });
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    for (const f of performanceCases) for (let i=0;i<5;i++) {
      await input.fill(f.input);
      const renderMs=await page.evaluate(label=>new Promise((resolve,reject)=>{
        const target=document.querySelector('.result-status'),start=performance.now();
        const observer=new MutationObserver(()=>{if(target.textContent===label){clearTimeout(timeout);observer.disconnect();resolve(performance.now()-start);}});
        const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('Analysis timeout'));},10000);
        observer.observe(target,{childList:true,subtree:true,characterData:true});document.querySelector('.analyze-button').click();
      }),statusLabels[f.status]);
      timing.push({id:f.id,viewport:width,utf16Length:f.input.length,renderMs});
    }
  }
  await page.waitForTimeout(100);
  const longTasks=await page.evaluate(()=>{window.stage26Observer?.disconnect();return window.stage26LongTasks;});
  assert.deepEqual(errors,[]); assert.deepEqual(requests,[]);
  assert.equal(logs.some(log=>fixtures.some(f=>log.includes(f.input))),false);
  assert.deepEqual(await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie})),{local:[],session:[],databases:[],cookie:''});
  await context.setOffline(false); await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await input.inputValue(),defaultInput); assert.equal(await page.locator('.result-status').innerText(),'等待分析');
  const report = {browser:browser.version(),correct:fixtures.filter(f=>f.kind==='correct').length,safeCorrections:fixtures.filter(f=>f.kind==='error').length,refusalControls:fixtures.filter(f=>f.kind==='boundary').length,navigation,timing,longTasks,limitation:'Local click-to-result including React, five samples at each width. Navigation is overall page loading, not isolated dictionary initialization.'};
  writeFileSync(process.env.CLAUSE_STRUCTURE_REPORT??`/tmp/grammar-stage${process.env.CLAUSE_STAGE??27}-browser.json`,JSON.stringify(report,null,2));
  console.log(`PASS stage ${process.env.CLAUSE_STAGE??27}: ${fixtures.length} fixed answers and all applied controls at desktop/mobile; exact roles/ranges/classifications, offline/privacy/reset. Chromium ${browser.version()}`);
} finally {await browser.close();}
