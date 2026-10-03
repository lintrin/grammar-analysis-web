// Compare rendered original text and classification with the pre-existing human answers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const development=JSON.parse(readFileSync(new URL('./fixtures/lexicon-development.json',import.meta.url)));
const fixtures=development.fixtures.filter(f=>f.stage===23);
const byId=new Map(development.fixtures.map(f=>[f.id,f]));
const migrations=JSON.parse(readFileSync(new URL('./fixtures/lexicon-migrations.json',import.meta.url))).migrations.filter(m=>m.stage===23);
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
  assert.equal(await page.locator('.example-group').count(),12);
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
  for(const m of migrations)await check({input:m.input,expected:m.newExpected});
  const errorsToCheck=['predicate-error-17','predicate-error-18','predicate-two-errors'];
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:width===390?844:1000});
    if(width===390)for(const id of ['contraction-doesnt-3','contraction-isnt-2','contraction-hasnt-3','contraction-repeat','contraction-if','contraction-outside-21'])await check(byId.get(id));
    for(const id of errorsToCheck){
      const f=byId.get(id);await check(f);await page.getByRole('tab',{name:/语法检查/}).click();
      for(const [index,step] of f.steps.entries()){
        await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).first().click();await status(index===f.steps.length-1?'complete':'partial');assert.equal(await input.inputValue(),step);
      }
      assert.equal(await page.locator('.correction-card').count(),0);await page.getByRole('tab',{name:'成分解析',exact:true}).click();
      assert.equal(await displayed(),byId.get(f.controlId).input);
    }
  }
  await check(byId.get('contraction-isnt-2'));await page.locator('.sentence-part.verb').press('Enter');
  const explanation=await page.locator('.detail-callout').innerText();assert.match(explanation,/isn’t sleeping/);assert.doesNotMatch(explanation,/isn’t isn’t/);
  await page.locator('.result-card').screenshot({path:process.env.CLAUSE_STAGE23_SCREENSHOT??'/tmp/clause-stage23-mobile.png'});
  await check(byId.get('predicate-error-18'));await page.getByRole('tab',{name:/语法检查/}).click();
  await input.fill('She doesn’t sleep.');assert.equal(await page.locator('.correction-card').count(),0);assert.equal(await page.locator('.sentence-part').count(),0);
  await input.press('Control+Enter');await status('complete');await page.getByRole('tab',{name:'成分解析',exact:true}).click();
  await input.fill('She doesn’t like music.');await input.press('Control+Enter');await status('unsupported');
  await page.getByRole('button',{name:'查看原文：music',exact:true}).press('Enter');
  assert.deepEqual(await input.evaluate(el=>[el.selectionStart,el.selectionEnd]),[17,22]);assert.equal(await input.inputValue(),'She doesn’t like music.');
  await input.fill('She doesn’t sleep.'.padEnd(1000,' '));await input.press('Control+Enter');await status('complete');
  await input.fill('She doesn’t sleep.'.padEnd(1001,' '));await input.press('Control+Enter');await status('invalid');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.equal(logs.some(log=>fixtures.some(f=>log.includes(f.input))),false);
  assert.deepEqual(await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie})),{local:[],session:[],databases:[],cookie:''});
  await context.setOffline(false);await page.reload();await page.waitForLoadState('networkidle');assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.notEqual(await input.inputValue(),'She doesn’t like music.');
  console.log(`PASS: ${fixtures.length} fixed answers, ${migrations.length} historical migrations, exact raw parts/classification/clause positions, do correction chains at desktop/mobile, keyboard, input limits, edit invalidation, offline privacy and reload. Chromium ${browser.version()}`);
}finally{await browser.close();}
