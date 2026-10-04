// Set CLAUSE_REVIEW_HMR=1 only against dev to test audited purpose variants.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const snapshotPath=new URL('../lib/grammar/generated/lexicon.json',import.meta.url);
const original=readFileSync(snapshotPath,'utf8');let changed=false;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[],logs=[],requests=[],inputs=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>logs.push(m.text()));page.on('request',r=>requests.push([r.url(),r.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL??'http://127.0.0.1:5188');await page.waitForLoadState('networkidle');
  const input=page.getByRole('textbox',{name:'需要分析的英文句子'});
  const labels={partial:'部分支持',unsupported:'超出当前范围',complete:'规则分析完成'};
  const check=async(text,status,reason,corrections=0)=>{
    inputs.push(text);await input.fill(text);await input.press('Control+Enter');await page.locator('.result-status').filter({hasText:labels[status]}).waitFor();
    if(reason) assert.match(await page.locator('.analysis-feedback').innerText(),reason);
    if(status!=='complete') assert.equal(await page.locator('.sentence-part').count(),0);
    await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();assert.equal(await page.locator('.correction-card').count(),corrections);await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  };
  await context.setOffline(true);requests.length=0;
  for(const text of ['She is slept.','She is gone.','She is smiled.','She is made it useful.','She is found it useful.','Is she slept?']) await check(text,'partial',/形式与规则不匹配/);
  await check('She sleeps and he is smiled.','partial',/第 2 分句：形式与规则不匹配/);
  for(const word of ['walked','danced','laughed','cried','waited']) await check(`The doctor is ${word}.`,'unsupported',/结构超出范围/);
  await check('Do she give him a book','partial',/形式与规则不匹配/,1);
  assert.deepEqual(requests,[]);
  if(process.env.CLAUSE_REVIEW_HMR==='1') {
    const variant=async purposes=>{
      await context.setOffline(false);
      const s=JSON.parse(original);s.entries.find(e=>e.partOfSpeech==='verb'&&e.lemma==='give').frames[0].allowedPurposes=purposes;
      changed=true;writeFileSync(snapshotPath,JSON.stringify(s)+'\n');
      // Let the development file watcher invalidate the module before reloading.
      await page.waitForTimeout(1000);await page.reload();await page.waitForLoadState('networkidle');await context.setOffline(true);
    };
    await variant(['declarative']);
    for(const text of ['Do she give him a book','Do she give him a book?','Does she gives him a book','Does she gives him a book?','Can she gives him a book','Can she gives him a book?']) await check(text,'unsupported',/结构超出范围/);
    await check('She give him a book','partial',/形式与规则不匹配/,1);
    await variant(['interrogative']);
    for(const text of ['Do she give him a book','Does she gives him a book','Can she gives him a book']) await check(text,'partial',/形式与规则不匹配/,1);
    await check('She gives him a book','unsupported',/结构超出范围/);await check('She give him a book','unsupported',/结构超出范围/);
    await context.setOffline(false);writeFileSync(snapshotPath,original);changed=false;await page.waitForTimeout(1000);await page.reload();await page.waitForLoadState('networkidle');await context.setOffline(true);
    await check('She gives him a book','complete');
  }
  await check('She sleeps and he is smiled.','partial',/第 2 分句：形式与规则不匹配/);
  await page.locator('.result-card').screenshot({path:process.env.CLAUSE_REVIEW_SCREENSHOT??'/tmp/clause-review-fixes-mobile.png'});
  assert.deepEqual(errors,[]);assert.equal(JSON.stringify(requests).includes('Do she give him a book'),false);
  assert.equal(logs.some(log=>inputs.some(text=>log.includes(text))),false);
  for(const text of inputs) assert.equal(JSON.stringify(requests).includes(text),false);
  assert.deepEqual(await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie})),{local:[],session:[],databases:[],cookie:''});
  console.log(`PASS: current progressive diagnostics, forbidden passive forms, mobile and offline privacy${process.env.CLAUSE_REVIEW_HMR==='1'?', declarative/interrogative audit variants with and without punctuation':''}. Chromium ${browser.version()}`);
} finally {
  if(changed) writeFileSync(snapshotPath,original);
  await browser.close();
}
