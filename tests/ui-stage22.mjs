// Stage 22 browser acceptance against the pre-existing human-fixed answers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/lexicon-development.json',import.meta.url))).fixtures.filter(f=>f.stage===22);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try {
  const context=await browser.newContext({viewport:{width:1280,height:1000}});const page=await context.newPage();const errors=[],logs=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>logs.push(m.text()));page.on('request',r=>requests.push([r.url(),r.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL ?? 'http://127.0.0.1:5188');await page.waitForLoadState('networkidle');
  console.log('Rendered controls:',(await page.getByRole('button').allTextContents()).slice(0,4));
  const input=page.getByRole('textbox',{name:'需要分析的英文句子'});
  const labels={complete:'规则分析完成',unsupported:'超出当前范围',partial:'部分支持',ambiguous:'存在歧义',invalid:'请检查输入'};
  const status=s=>page.locator('.result-status').filter({hasText:labels[s]}).waitFor();
  await page.getByText('当前范围与键盘操作',{exact:true}).click();assert.match(await page.locator('.support-help').innerText(),/100 个实义动词/);assert.match(await page.locator('.support-help').innerText(),/拥有义 have/);
  await context.setOffline(true);requests.length=0;
  const check=async f=>{
    await input.fill(f.input);assert.equal(await page.locator('.sentence-part').count(),0);await input.press('Control+Enter');await status(f.expected.status);
    if(f.expected.status==='complete'){
      assert.equal((await page.locator('.part-text, .sentence-gap').allTextContents()).join(''),f.input);
      if(f.expected.complexity==='simple') {
        assert.equal(await page.locator('.sentence-part').count(),f.expected.nodes.filter(n=>n.parentKey===null).reduce((n,node)=>n+node.ranges.length,0));
        assert.match(await page.locator('.tense-badge').innerText(),f.expected.aspect==='perfect'?/现在完成时/:f.expected.tense==='past'?/一般过去时/:/一般现在时/);
        if(f.id==='have-correct-1')assert.match(await page.locator('.learning-note').innerText(),/拥有义 have 仅接名词短语宾语/);
      }
    }else assert.equal(await page.locator('.sentence-part').count(),0);
    await page.getByRole('tab',{name:/语法检查/}).click();assert.equal(await page.locator('.correction-card').count(),f.expected.corrections.length);
    if(f.kind==='error'){
      for(const step of f.steps){await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).first().click();await status('complete');assert.equal(await input.inputValue(),step);}
      assert.equal(await page.locator('.correction-card').count(),0);
    }
    await page.getByRole('tab',{name:'成分解析',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  };
  for(const f of fixtures)await check(f);
  await page.setViewportSize({width:390,height:844});
  for(const id of ['have-correct-13','have-correct-9','have-error-6','have-compound','have-outside-13'])await check(fixtures.find(f=>f.id===id));
  await check(fixtures.find(f=>f.id==='have-correct-1'));
  await page.locator('.sentence-part.verb').press('Enter');assert.match(await page.locator('.detail-callout').innerText(),/实义.*have.*拥有/);
  await check(fixtures.find(f=>f.id==='have-compound'));
  const clause=page.locator('.sentence-part.clause').first();await clause.press('Enter');const back=page.getByRole('button',{name:'返回整句',exact:true});await back.waitFor();assert.equal(await back.evaluate(el=>el===document.activeElement),true);await back.press('Enter');assert.equal(await clause.evaluate(el=>el===document.activeElement),true);
  await input.fill('She have a book.');await input.press('Control+Enter');await status('partial');await page.getByRole('tab',{name:/语法检查/}).click();assert.equal(await page.locator('.correction-card').count(),1);
  await input.fill('She has a pen.');assert.equal(await page.locator('.correction-card').count(),0);assert.equal(await page.locator('.sentence-part').count(),0);
  await input.press('Control+Enter');await status('complete');await page.getByRole('tab',{name:'成分解析',exact:true}).click();
  await page.locator('.result-card').screenshot({path:process.env.CLAUSE_STAGE22_SCREENSHOT??'/tmp/clause-stage22-mobile.png'});
  // Same public input limit, substantive text and deterministic positions at the boundary.
  await input.fill('She has a book.'.padEnd(1000,' '));await input.press('Control+Enter');await status('complete');
  await input.fill('She has a book.'.padEnd(1001,' '));await input.press('Control+Enter');await status('invalid');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.equal(logs.some(log=>fixtures.some(f=>log.includes(f.input))),false);
  assert.deepEqual(await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie})),{local:[],session:[],databases:[],cookie:''});
  await context.setOffline(false);await page.reload();await page.waitForLoadState('networkidle');assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.notEqual(await input.inputValue(),'She has a pen.');
  console.log(`PASS: ${fixtures.length} fixed answers, ten correction/reanalysis pairs, mobile, clause keyboard focus, edit invalidation, input limits, offline privacy and reload. Chromium ${browser.version()}`);
}finally{await browser.close();}
