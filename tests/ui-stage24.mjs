// Compare rendered original text and classification with the pre-existing human answers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const development=JSON.parse(readFileSync(new URL('./fixtures/lexicon-development.json',import.meta.url)));
const supplement=JSON.parse(readFileSync(new URL('./fixtures/stage24-supplement.json',import.meta.url)));
const fixtures=[...development.fixtures.filter(f=>f.stage===24),...supplement.fixtures];
const byId=new Map(fixtures.map(f=>[f.id,f]));
const migrations=JSON.parse(readFileSync(new URL('./fixtures/lexicon-migrations.json',import.meta.url))).migrations.filter(m=>m.stage===24);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
  const context=await browser.newContext({viewport:{width:1280,height:1000}});const page=await context.newPage();const errors=[],logs=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>logs.push(m.text()));page.on('request',r=>requests.push([r.url(),r.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL??'http://127.0.0.1:5188');await page.waitForLoadState('networkidle');
  console.log('Rendered controls:',(await page.getByRole('button').allTextContents()).slice(0,4));
  const input=page.getByRole('textbox',{name:'需要分析的英文句子'});
  const labels={complete:'规则分析完成',unsupported:'超出当前范围',partial:'部分支持',invalid:'请检查输入'};
  const status=s=>page.locator('.result-status').filter({hasText:labels[s]}).waitFor();
  const displayed=()=>page.locator('.part-text, .sentence-gap').allTextContents().then(t=>t.join(''));
  const titles={SV:'主语 + 谓语',SVO:'主语 + 谓语 + 宾语',SVC:'主语 + 系动词 + 表语',SVOO:'主语 + 谓语 + 双宾语',SVOC:'主语 + 谓语 + 宾语 + 宾语补足语'};
  const classification=async c=>{
    assert.equal(await page.locator('.result-overview h3').innerText(),titles[c.pattern]);
    const tense=c.tense===null?'can + 动词原形':`${c.aspect==='simple'?'一般':''}${c.tense==='past'?'过去':'现在'}${{simple:'',progressive:'进行',perfect:'完成','perfect-progressive':'完成进行'}[c.aspect]}时`;
    const badge=(await page.locator('.tense-badge').innerText()).replace(/\s+/g,'');
    assert.equal(badge,`${tense}${c.voice==='passive'?'被动语态':'主动语态'}`.replace(/\s+/g,''));
  };
  const parts=async(inputText,nodes)=>{
    const texts=nodes.flatMap(n=>n.ranges.map(q=>({start:q.start,text:inputText.slice(q.start,q.end)}))).sort((a,b)=>a.start-b.start).map(q=>q.text);
    assert.deepEqual(await page.locator('.sentence-part .part-text').allTextContents(),texts);
  };
  await page.getByText('当前范围与键盘操作',{exact:true}).click();assert.match(await page.locator('.support-help').innerText(),/否定陈述支持 don't\/doesn't\/didn't/);
  assert.equal(await page.locator('.example-group').count(),14);
  await context.setOffline(true);requests.length=0;
  const check=async f=>{
    const previous=await input.inputValue();await input.fill(f.input);
    if(previous!==f.input)assert.equal(await page.locator('.sentence-part').count(),0);
    await input.press('Control+Enter');await status(f.expected.status);assert.equal(await input.inputValue(),f.input);
    if(f.expected.status==='complete'){
      assert.equal(await displayed(),f.input);await parts(f.input,f.expected.nodes.filter(n=>n.parentKey===null));
      if(f.expected.complexity==='simple')await classification(f.expected);
      else for(const clause of f.expected.nodes.filter(n=>n.role==='clause')){
        const text=f.input.slice(clause.ranges[0].start,clause.ranges[0].end);
        const button=page.locator('.sentence-part.clause').filter({has:page.getByText(text,{exact:true})});
        await button.press('Enter');const back=page.getByRole('button',{name:'返回整句',exact:true});await back.waitFor();
        assert.equal(await back.evaluate(el=>el===document.activeElement),true);assert.equal(await displayed(),text);await classification(clause.clause);
        await parts(f.input,f.expected.nodes.filter(n=>n.parentKey===clause.key));await back.press('Enter');
        assert.equal(await button.evaluate(el=>el===document.activeElement),true);assert.equal(await displayed(),f.input);
      }
    }else assert.equal(await page.locator('.sentence-part').count(),0);
    await page.getByRole('tab',{name:/语法检查/}).click();assert.equal(await page.locator('.correction-card').count(),f.expected.corrections.length);
    await page.getByRole('tab',{name:'成分解析',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  };
  for(const f of fixtures)await check(f);
  const apply=async f=>{
    await check(f);await page.getByRole('tab',{name:/语法检查/}).click();
    const cards=page.locator('.correction-card');
    for(const [i,c] of f.expected.corrections.entries()){
      assert.deepEqual(await cards.nth(i).locator('del').allTextContents(),c.edits.map(e=>e.expected));
      assert.deepEqual(await cards.nth(i).locator('strong').allTextContents(),c.edits.map(e=>e.replacement));
      assert.match(await cards.nth(i).innerText(),new RegExp(c.ruleId));
      if(c.ruleId==='PREDICATE-AGREEMENT-001')assert.equal(await cards.nth(i).locator('h3').innerText(),'谓语助动词一致');
      if(c.ruleId==='PREDICATE-FORM-001')assert.equal(await cards.nth(i).locator('h3').innerText(),'谓语分词形式');
    }
    for(const [i,step] of f.steps.entries()){
      await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).first().press('Enter');
      await status(i===f.steps.length-1?'complete':'partial');assert.equal(await input.inputValue(),step);
    }
    assert.equal(await cards.count(),0);await page.getByRole('tab',{name:'成分解析',exact:true}).click();
    await classification(f.control.expected);assert.equal(await displayed(),f.control.input);await parts(f.control.input,f.control.expected.nodes);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  };
  for(const f of fixtures.filter(f=>f.kind==='error'))await apply({...f,control:byId.get(f.controlId)});
  for(const m of migrations)await apply({input:m.input,expected:m.newExpected,steps:[m.control.input],control:m.control});
  await page.setViewportSize({width:390,height:844});
  for(const id of ['predicate-error-1','predicate-error-7','predicate-error-11','predicate-error-12','predicate-error-15','predicate-question-error','predicate-uppercase-error','predicate-two-errors','stage24-contraction-error-1','stage24-contraction-error-4','stage24-contraction-error-7','stage24-contraction-error-8']){
    const f=byId.get(id);await apply({...f,control:byId.get(f.controlId)});
  }
  for(const f of fixtures.filter(f=>f.kind==='boundary'))await check(f);
  await check(byId.get('stage24-contraction-error-4'));await page.getByRole('tab',{name:/语法检查/}).click();
  await page.locator('.result-card').screenshot({path:process.env.CLAUSE_STAGE24_SCREENSHOT??'/tmp/grammar-stage24-mobile.png'});
  await input.fill('They haven’t slept.');assert.equal(await page.locator('.correction-card').count(),0);assert.equal(await page.locator('.sentence-part').count(),0);
  await input.press('Control+Enter');await status('complete');await page.getByRole('tab',{name:'成分解析',exact:true}).click();
  await input.fill('She have given unknown books.');await input.press('Control+Enter');await status('unsupported');
  await page.getByRole('button',{name:'查看原文：unknown',exact:true}).press('Enter');
  assert.deepEqual(await input.evaluate(el=>[el.selectionStart,el.selectionEnd]),[15,22]);
  await input.fill('They hasn’t slept.'.padEnd(1000,' '));await input.press('Control+Enter');await status('partial');
  await page.getByRole('tab',{name:/语法检查/}).click();await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).click();await status('invalid');assert.equal((await input.inputValue()).length,1001);assert.equal(await page.locator('.correction-card').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.equal(logs.some(log=>fixtures.some(f=>log.includes(f.input))),false);
  assert.deepEqual(await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie})),{local:[],session:[],databases:[],cookie:''});
  await context.setOffline(false);await page.reload();await page.waitForLoadState('networkidle');assert.equal(await page.locator('.result-status').innerText(),'等待分析');
  console.log(`PASS: ${fixtures.length} fixed answers, ${migrations.length} migrations plus full applied controls, desktop/mobile corrections, exact edits/classification/parts, keyboard, stale clearing, limits and offline privacy. Chromium ${browser.version()}`);
}finally{await browser.close();}
