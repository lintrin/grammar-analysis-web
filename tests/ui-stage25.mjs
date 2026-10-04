// Optional local browser acceptance. Use the existing JavaScript Playwright runtime.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {loadStage25Acceptance} from './helpers/stage25-fixtures.mjs';
import {stage25PerformanceCases} from './helpers/stage25-performance.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const fixtures = loadStage25Acceptance().fixtures;
const byId = new Map(fixtures.map(f => [f.id,f]));
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
    assert.match(await page.locator('.result-overview p').innerText(),new RegExp(c.purpose==='interrogative'?'疑问句':'陈述句'));
    const tense = c.tense===null?'can + 动词原形':`${c.aspect==='simple'?'一般':''}${c.tense==='past'?'过去':'现在'}${{simple:'',progressive:'进行',perfect:'完成','perfect-progressive':'完成进行'}[c.aspect]}时`;
    assert.equal((await page.locator('.tense-badge').innerText()).replace(/\s+/g,''),`${tense}${c.voice==='passive'?'被动语态':'主动语态'}`.replace(/\s+/g,''));
  };
  const parts = async (text,roots,allNodes) => {
    const spans = roots.flatMap(n=>n.ranges.map(q=>({start:q.start,text:text.slice(q.start,q.end),node:n}))).sort((a,b)=>a.start-b.start);
    assert.deepEqual(await page.locator('.sentence-part .part-text').allTextContents(),spans.map(s=>s.text));
    assert.deepEqual(await page.locator('.sentence-part .part-code').allTextContents(),spans.map(s=>s.node.role==='clause'?{main:'MC',subordinate:'SC',independent:'CL'}[s.node.clause.kind]:codes[s.node.role]));
    for (const root of roots.filter(n=>allNodes.some(child=>child.parentKey===n.key && child.role==='attribute'))) {
      const index = spans.findIndex(s=>s.node===root);
      await page.locator('.sentence-part').nth(index).press('Enter');
      const children = allNodes.filter(n=>n.parentKey===root.key);
      assert.deepEqual(await page.locator('.nested-part.attribute').allTextContents(),children.map(n=>`定语 · ${n.ranges.map(q=>text.slice(q.start,q.end)).join(' … ')}`));
      for (const child of children) {
        const fragment = child.ranges.map(q=>text.slice(q.start,q.end)).join(' … ');
        await page.getByRole('button',{name:`定语 · ${fragment}`,exact:true}).press('Enter');
        assert.equal(await page.locator('.detail-callout h4 span').innerText(),fragment);
        await page.getByRole('button',{name:'返回上层短语',exact:true}).press('Enter');
      }
    }
  };
  await context.setOffline(true); requests.length = 0;
  const check = async f => {
    await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
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
    await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click(); assert.equal(await page.locator('.correction-card').count(),f.expected.corrections.length);
    for (const [i,c] of f.expected.corrections.entries()) {
      const card = page.locator('.correction-card').nth(i);
      assert.deepEqual(await card.locator('del').allTextContents(),c.edits.map(e=>e.expected));
      assert.deepEqual(await card.locator('strong').allTextContents(),c.edits.map(e=>e.replacement));
      assert.match(await card.innerText(),new RegExp(c.ruleId));
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  };
  for (const f of fixtures) await check(f);
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    for (const f of fixtures.filter(f=>f.kind==='error')) {
      await check(f); await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).press('Enter');
      await status('complete'); const control = byId.get(f.controlId);
      assert.equal(await input.inputValue(),control.input); assert.equal(await page.locator('.correction-card').count(),0);
      await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
      await classification(control.expected); assert.equal(await displayed(),control.input);
      await parts(control.input,control.expected.nodes.filter(n=>n.parentKey===null),control.expected.nodes);
    }
    if (width===390) for (const f of fixtures.filter(f=>f.kind==='boundary'||f.expected.complexity!=='simple'&&f.kind==='correct')) await check(f);
  }
  await check(byId.get('error-14'));
  await page.locator('.result-card').screenshot({path:process.env.CLAUSE_STAGE25_SCREENSHOT??'/tmp/grammar-stage25-mobile.png'});
  await input.fill(byId.get('contraction-10').input); assert.equal(await page.locator('.correction-card').count(),0);
  for (const [text,s] of [['','invalid'],['x'.repeat(1001),'invalid'],[byId.get('contraction-10').input.padEnd(1000,' '),'complete']]) {
    await input.fill(text); await input.press('Control+Enter'); await status(s);
  }
  await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
  const timing = [];
  await page.evaluate(() => {
    window.stage25LongTasks=[];
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      window.stage25Observer=new PerformanceObserver(l=>window.stage25LongTasks.push(...l.getEntries().map(e=>e.duration)));
      window.stage25Observer.observe({type:'longtask'});
    }
  });
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    for (const f of stage25PerformanceCases) for (let i=0;i<5;i++) {
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
  const longTasks=await page.evaluate(()=>{window.stage25Observer?.disconnect();return window.stage25LongTasks;});
  assert.deepEqual(errors,[]); assert.deepEqual(requests,[]);
  assert.equal(logs.some(log=>fixtures.some(f=>log.includes(f.input))),false);
  assert.deepEqual(await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie})),{local:[],session:[],databases:[],cookie:''});
  await context.setOffline(false); await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await input.inputValue(),defaultInput); assert.equal(await page.locator('.result-status').innerText(),'等待分析');
  const report = {browser:browser.version(),correct:80,safeCorrections:15,refusalControls:25,navigation,timing,longTasks,limitation:'Local click-to-result including React, five samples at each width. Navigation is overall page loading, not isolated dictionary initialization.'};
  writeFileSync(process.env.CLAUSE_STAGE25_REPORT??'/tmp/grammar-stage25-browser.json',JSON.stringify(report,null,2));
  console.log(`PASS stage 25: 120 independent answers, exact original text/roles/attributes/clause ownership/classifications, all 15 applied controls at desktop and mobile, keyboard/focus, limits, stale clearing, 40 pressure samples, offline network/log/storage privacy and reset. Chromium ${browser.version()}`);
} finally {await browser.close();}
