// Browser acceptance uses the same manually fixed grammar fixtures as the unit suite.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/lexicon-development.json',import.meta.url))).fixtures.filter(f=>f.stage===21);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try {
  const context=await browser.newContext({viewport:{width:1280,height:1000}});const page=await context.newPage();const errors=[],logs=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>logs.push(m.text()));page.on('request',r=>requests.push([r.url(),r.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL ?? 'http://127.0.0.1:5188');await page.waitForLoadState('networkidle');
  const input=page.getByRole('textbox',{name:'需要分析的英文句子'});
  const labels={complete:'规则分析完成',unsupported:'超出当前范围',partial:'部分支持',ambiguous:'存在歧义'};
  const status=s=>page.locator('.result-status').filter({hasText:labels[s]}).waitFor();
  await page.getByText('当前范围与键盘操作',{exact:true}).click();assert.match(await page.locator('.support-help').innerText(),/44 组可数名词、24 个形容词、26 个实义动词/);
  await context.setOffline(true);requests.length=0;
  const check=async f=>{
    await input.fill(f.input);assert.equal(await page.locator('.sentence-part').count(),0);await input.press('Control+Enter');await status(f.expected.status);
    assert.equal(await page.locator('.correction-card').count(),0);
    if(f.expected.status==='complete'){
      assert.equal((await page.locator('.part-text, .sentence-gap').allTextContents()).join(''),f.input);
      if(f.expected.complexity==='simple') assert.equal(await page.locator('.sentence-part').count(),f.expected.nodes.filter(n=>n.parentKey===null).reduce((n,node)=>n+node.ranges.length,0));
    }else assert.equal(await page.locator('.sentence-part').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  };
  for(const f of fixtures) await check(f);
  for(const [text,expected] of [['They read books yesterday.','complete'],['They read books today.','ambiguous'],['They read books and she walks.','ambiguous']]) {
    await input.fill(text);await input.press('Control+Enter');await status(expected);
    if(expected==='complete') assert.match(await page.locator('.tense-badge').innerText(),/一般过去时/);
    else assert.equal(await page.locator('.sentence-part').count(),0);
    assert.equal(await page.locator('.correction-card').count(),0);
  }
  await page.setViewportSize({width:390,height:844});
  for(const id of ['noun-person-subject','lexicon-read-homograph','verb-read-perfect','verb-keep-third']) {const f=fixtures.find(f=>f.id===id);assert.ok(f,id);await check(f);}
  await input.fill('The doctor walk.');await input.press('Control+Enter');await status('partial');await page.getByRole('tab',{name:/语法检查/}).click();
  assert.equal(await page.locator('.correction-card').count(),1);await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).click();await status('complete');assert.equal(await input.inputValue(),'The doctor walks.');
  await page.getByRole('tab',{name:'成分解析',exact:true}).click();
  const compound=fixtures.find(f=>f.expected.complexity==='compound'&&f.expected.status==='complete');assert.ok(compound);await check(compound);
  const clause=page.locator('.sentence-part.clause').first();await clause.press('Enter');const back=page.getByRole('button',{name:'返回整句',exact:true});await back.waitFor();assert.equal(await back.evaluate(el=>el===document.activeElement),true);await back.press('Enter');assert.equal(await clause.evaluate(el=>el===document.activeElement),true);
  await input.fill('The nurse has written a letter.');await input.press('Control+Enter');await status('complete');await page.locator('.result-card').screenshot({path:process.env.CLAUSE_STAGE21_SCREENSHOT??'/tmp/clause-stage21-mobile.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);const inputs=[...fixtures.map(f=>f.input),'The doctor walk.','The doctor walks.','The nurse has written a letter.'];assert.equal(logs.some(log=>inputs.some(input=>log.includes(input))),false);
  assert.deepEqual(await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie})),{local:[],session:[],databases:[],cookie:''});
  console.log(`PASS: ${fixtures.length} fixed answers, mobile, correction/reanalysis, clause keyboard focus and offline privacy. Chromium ${browser.version()}`);
} finally {await browser.close();}
