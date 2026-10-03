// Optional local browser acceptance. Use the existing JavaScript Playwright runtime.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {loadStage32Acceptance,loadStage32Queries} from './helpers/stage32-fixtures.mjs';
import {stage32PerformanceCases} from './helpers/stage32-performance.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const fixtures = loadStage32Acceptance().fixtures;
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
    if(c.questionType&&c.questionType!=='yes-no')assert.match(await page.locator('.result-overview p').innerText(),new RegExp({'wh-subject':'主语提问','wh-object':'宾语提问','wh-adverbial':'状语提问'}[c.questionType]));
    const tense = c.tense===null?(c.modal==='will'?'will 表达（常见将来用法）':'can 情态结构'):`${c.aspect==='simple'?'一般':''}${c.tense==='past'?'过去':'现在'}${{simple:'',progressive:'进行',perfect:'完成','perfect-progressive':'完成进行'}[c.aspect]}时`;
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
  const queries=loadStage32Queries().fixtures,snapshot=JSON.parse(readFileSync('lib/grammar/generated/lexicon.json'));
  const counts=[];
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:width===390?844:1000});
    for(const [i,f] of fixtures.entries()){await check(f);if(i%70===0)console.log(`Stage32 ${width}px fixed answers ${i+1}/${fixtures.length}`);}
    for(const f of fixtures.filter(f=>f.kind==='error')){
      await check(f);await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).press('Enter');await status('complete');const control=byId.get(f.controlId);
      assert.equal(await input.inputValue(),control.input);assert.equal(await page.locator('.correction-card').count(),0);await page.getByRole('tab',{name:'成分解析',exact:true}).click();await classification(control.expected);assert.equal(await displayed(),control.input);await parts(control.input,control.expected.nodes.filter(n=>n.parentKey===null),control.expected.nodes);
    }
    if(await page.locator('.dictionary-card').getAttribute('open')===null)await page.locator('.dictionary-card>summary').press('Enter');
    const search=page.getByRole('searchbox',{name:'词元或完整词形'}),filter=page.getByRole('combobox',{name:'按词性筛选'});
    for(const f of queries){
      await check(fixtures.find(f=>f.kind==='error'));
      await search.fill('');await search.pressSequentially(f.query);await search.press('Enter');await search.press('Tab');assert.equal(await filter.evaluate(e=>e===document.activeElement),true);await filter.selectOption(f.pos);
      assert.deepEqual(await page.locator('.dictionary-entry h3').allTextContents(),f.ids.map(id=>snapshot.entries.find(e=>e.id===id).lemma));assert.equal(await page.locator('.dictionary-frame').count(),f.patterns.length);
      const match=await page.locator('.dictionary-match').innerText();for(const kind of f.formKinds)assert.match(match,new RegExp({past:'过去式',participle:'过去分词',base:'原形'}[kind]));
      await page.locator('.dictionary-source>summary').press('Enter');assert.match(await page.locator('.dictionary-source').innerText(),/0\.22\.4.*1\.7\.0/);if(snapshot.entries.find(e=>e.id===f.ids[0]).sourceIds.includes('lemminflect-stage26'))assert.equal(await page.getByRole('link',{name:'查看完整 MIT 许可与署名'}).getAttribute('href'),'/licenses/lemminflect.txt');else assert.match(await page.locator('.dictionary-source').innerText(),/project-maintained/);
      assert.equal(await page.locator('.correction-card').count(),1);
      await page.getByRole('button',{name:`放入例句：${f.example}`,exact:true}).press('Enter');assert.equal(await input.inputValue(),f.example);assert.equal(await input.evaluate(e=>e===document.activeElement),true);assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.equal(await page.locator('.correction-card').count(),0);
      await input.press('Meta+Enter');await status('complete');await page.getByRole('tab',{name:'成分解析',exact:true}).click();assert.equal(await displayed(),f.example);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    counts.push({viewport:width,independentInputs:fixtures.length,appliedControls:20,independentQueryFlows:20,additionalQueryRegressions:1});
  }
  // Real pending task cancellation on editing and query insertion; fast repeated clicks run one callback.
  const good=fixtures[0],error=fixtures.find(f=>f.kind==='error');
  await input.fill(error.input);await page.evaluate(()=>{window.stage32Timer=window.setTimeout;window.stage32Calls=0;window.setTimeout=(cb,delay,...args)=>window.stage32Timer(()=>{if(delay===0)window.stage32Calls++;cb(...args);},delay===0?500:delay);});
  await page.evaluate(()=>{const b=document.querySelector('.analyze-button');b.click();b.click();b.click();});await page.locator('.result-status').filter({hasText:'正在分析'}).waitFor();await input.fill(good.input);await page.waitForTimeout(650);assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.equal(await page.locator('.sentence-part').count(),0);assert.equal(await page.evaluate(()=>window.stage32Calls),0);
  await page.getByRole('button',{name:'分析句子',exact:true}).click();await page.getByRole('button',{name:`放入例句：${queries.at(-1).example}`,exact:true}).click();await page.waitForTimeout(650);assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.equal(await page.locator('.sentence-part').count(),0);
  await input.fill(good.input);await page.evaluate(()=>{const b=document.querySelector('.analyze-button');b.click();b.click();b.click();});await status('complete');assert.equal(await page.evaluate(()=>window.stage32Calls),1);await page.evaluate(()=>{window.setTimeout=window.stage32Timer;});
  // Inject one tokenizer exception in the browser and verify retained input plus retry.
  await input.fill(good.input);await page.evaluate(text=>{window.stage32MatchAll=String.prototype.matchAll;String.prototype.matchAll=function(...args){if(this.toString()===text)throw new Error('stage32 controlled failure');return window.stage32MatchAll.apply(this,args);};},good.input);
  await input.press('Control+Enter');await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/输入已保留/);assert.equal(await input.inputValue(),good.input);await page.evaluate(()=>{String.prototype.matchAll=window.stage32MatchAll;});await input.press('Control+Enter');await status('complete');
  const unknown=fixtures.find(f=>f.id==='no-auto-01');await check(unknown);await page.getByRole('button',{name:'查看原文：planet',exact:true}).press('Enter');assert.deepEqual(await input.evaluate(e=>[e.selectionStart,e.selectionEnd]),[unknown.input.indexOf('planet'),unknown.input.indexOf('planet')+6]);assert.equal(await input.evaluate(e=>e===document.activeElement),true);assert.equal(await input.inputValue(),unknown.input);
  // 1000/1001 and substantive homograph/multiframe/phrase pressure with browser long tasks.
  const timing=[];
  await page.getByRole('tab',{name:'成分解析',exact:true}).click();await page.evaluate(()=>{window.stage32LongTasks=[];if(PerformanceObserver.supportedEntryTypes.includes('longtask')){window.stage32Observer=new PerformanceObserver(l=>window.stage32LongTasks.push(...l.getEntries().map(e=>e.duration)));window.stage32Observer.observe({type:'longtask'});}});
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:width===390?844:1000});
    for(const f of stage32PerformanceCases){
      await input.fill(f.input+' ');await input.press('Control+Enter');await status('invalid');
      for(let i=0;i<5;i++){
        await input.fill(f.input);const renderMs=await page.evaluate(label=>new Promise((resolve,reject)=>{const target=document.querySelector('.result-status'),start=performance.now();const observer=new MutationObserver(()=>{if(target.textContent===label){clearTimeout(timeout);observer.disconnect();resolve(performance.now()-start);}});const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('Analysis timeout'));},10000);observer.observe(target,{childList:true,subtree:true,characterData:true});document.querySelector('.analyze-button').click();}),statusLabels[f.status]);timing.push({id:f.id,viewport:width,utf16Length:f.input.length,renderMs});
      }
    }
  }
  await page.waitForTimeout(100);const longTasks=await page.evaluate(()=>{window.stage32Observer?.disconnect();return window.stage32LongTasks;});
  const search=page.getByRole('searchbox',{name:'词元或完整词形'});await search.fill('stage32-private-query-sentinel');assert.equal(await page.locator('.dictionary-entry').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.equal(logs.some(log=>fixtures.some(f=>log.includes(f.input))||log.includes('stage32-private-query-sentinel')),false);
  const storage=await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie}));assert.deepEqual(storage,{local:[],session:[],databases:[],cookie:''});
  await check(fixtures.find(f=>f.category==='location'));await page.getByRole('tab',{name:'成分解析',exact:true}).click();await page.locator('.result-card').screenshot({path:process.env.CLAUSE_STAGE32_SCREENSHOT??'/tmp/grammar-stage32-mobile.png'});
  await context.setOffline(false);await page.reload();await page.waitForLoadState('networkidle');assert.equal(await input.inputValue(),defaultInput);assert.equal(await page.locator('.result-status').innerText(),'等待分析');await page.locator('.dictionary-card>summary').press('Enter');assert.equal(await search.inputValue(),'');assert.equal(await page.getByRole('combobox',{name:'按词性筛选'}).inputValue(),'all');
  const report={browser:browser.version(),counts,ruleVersion:'0.22.4',lexiconVersion:'1.7.0',correct:100,safeCorrections:20,refusalControls:40,additionalControls:21,reviewedOriginals:5,navigation,timing,longTasks,offlineRequests:0,pageErrors:errors,storage,refreshReset:true,keyboardShortcuts:['Control+Enter','Meta+Enter'],querySearchAndFilterFocus:true,queryExamplesInvalidateAndFocus:true,pendingEditAndInsertionCancellation:true,continuousClicks:true,failureRetry:true,unknownWordOriginalSelection:true,limitation:'Local fixed-input acceptance; no user inputs recorded. Five click-to-render samples per pressure case per viewport, navigation is full page loading. Native select values are chosen with semantic selectOption after real Tab focus; popup keyboard behavior was separately validated in stage31.'};
  writeFileSync(process.env.CLAUSE_STAGE32_REPORT??'/tmp/grammar-stage32-browser.json',JSON.stringify(report,null,2)+'\n');console.log(`PASS stage32: ${fixtures.length} full answers,20 applied corrections,20 new query flows at desktop/mobile,80 pressure samples,pending/failure/privacy/reset. Chromium ${browser.version()}`);
}finally{await browser.close();}
