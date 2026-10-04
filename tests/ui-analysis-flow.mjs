// Human expectations fixed in docs/analysis-flow.md before implementation.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try {
  const context = await browser.newContext(), page = await context.newPage();
  const errors = [], logs = [], requests = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => logs.push(m.text()));
  page.on('request', r => requests.push([r.url(),r.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL ?? 'http://127.0.0.1:5188');
  await page.waitForLoadState('networkidle');
  const input = page.getByRole('textbox',{name:'需要分析的英文句子'});
  const defaultInput = await input.inputValue();
  const panel = page.getByRole('tabpanel',{name:'语法检查与成分解析',exact:true});
  const status = text => page.locator('.result-status').filter({hasText:text}).waitFor();
  const displayed = async () => (await page.locator('.part-text, .sentence-gap').allTextContents()).join('');
  const check = async (text, expectedStatus, passed, corrections) => {
    await input.fill(text);
    assert.equal(await panel.locator('.grammar-checks, .component-analysis, .correction-card').count(),0);
    await input.press('Control+Enter'); await status(expectedStatus);
    assert.equal(await page.getByRole('tab').count(),1);
    assert.equal(await page.getByRole('tab',{name:'语法检查与成分解析',exact:true}).getAttribute('aria-selected'),'true');
    assert.equal(await panel.getByRole('heading',{name:'01 语法检查',exact:true}).count(),1);
    assert.equal(await panel.locator('.component-analysis').count(),passed ? 1 : 0);
    assert.equal(await panel.locator('.correction-card').count(),corrections);
    assert.equal(await panel.locator('.analysis-waiting').count(),passed ? 0 : 1);
    if (passed) {
      assert.equal(await displayed(),text);
      assert.deepEqual(await panel.locator('.analysis-step-heading h3').allTextContents(),['01 语法检查','02 成分解析']);
      assert.equal(await panel.locator('.check-status').innerText(),'当前规则检查通过');
    } else {
      assert.equal(await panel.locator('.sentence-part, .detail-callout, .structure-strip').count(),0);
      assert.notEqual(await panel.locator('.check-status').innerText(),'当前规则检查通过');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  };
  await context.setOffline(true); requests.length = 0; logs.length = 0;
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:width === 390 ? 844 : 1000});
    await check('She sleeps.','规则分析完成',true,0);
    assert.deepEqual(await panel.locator('.part-code').allTextContents(),['S','V']);
    await panel.locator('.check-details>summary').press('Enter');
    assert.match(await panel.locator('.check-details').innerText(),/当前仅分析闭合词典/);
    await panel.locator('.check-details>summary').press('Enter');
    await check('She sleep.','部分支持',false,1);
    assert.equal(await panel.locator('.check-status').innerText(),'发现语法问题');
    await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).press('Enter');
    await status('规则分析完成');
    assert.equal(await input.inputValue(),'She sleeps.');
    assert.equal(await displayed(),'She sleeps.');
    assert.equal(await panel.locator('.correction-card, .analysis-waiting').count(),0);
    assert.equal(await panel.locator('.check-status').innerText(),'当前规则检查通过');
    // Preserve the fixed offline cases from the retired stage 20 browser script.
    await check('Our young teacher give the girls an old picture today.','部分支持',false,1);
    await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).click();
    await status('规则分析完成');
    assert.equal(await input.inputValue(),'Our young teacher gives the girls an old picture today.');
    assert.equal(await displayed(),'Our young teacher gives the girls an old picture today.');
    assert.equal(await panel.locator('.correction-card, .analysis-waiting').count(),0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await check('She has sent him a book.','规则分析完成',true,0);
    assert.equal(await page.locator('.sentence-part').count(),4);
    await check('They read the book.','存在歧义',false,0);
    await check('She likes music.','超出当前范围',false,0);
    await page.getByRole('button',{name:'查看原文：music',exact:true}).press('Enter');
    assert.deepEqual(await input.evaluate(e => [e.selectionStart,e.selectionEnd]),[10,15]);
    assert.equal(await input.evaluate(e => e === document.activeElement),true);
    await check(' ','请检查输入',false,0);
    await check('She sleeps and he smiles.','规则分析完成',true,0);
    await page.locator('.sentence-part').filter({hasText:'She sleeps'}).press('Enter');
    assert.equal(await displayed(),'She sleeps');
    const back = page.getByRole('button',{name:'返回整句',exact:true});
    assert.equal(await back.evaluate(e => e === document.activeElement),true);
    await back.press('Enter');
    assert.equal(await displayed(),'She sleeps and he smiles.');
    assert.equal(await page.locator('.sentence-part[aria-pressed="true"]').evaluate(e => e === document.activeElement),true);
    await check('The teacher gives her an old book.','规则分析完成',true,0);
    await page.locator('.sentence-part').filter({hasText:'an old book'}).press('Enter');
    await page.getByRole('button',{name:'定语 · old',exact:true}).press('Enter');
    assert.equal(await panel.locator('.detail-callout h4 span').innerText(),'old');
    await page.getByRole('button',{name:'返回上层短语',exact:true}).press('Enter');
    await page.screenshot({path:`/private/tmp/analysis-flow-${width}.png`,fullPage:true});
    if (width === 1280) {
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({path:'/private/tmp/analysis-flow-preview.png'});
    }
  }
  // Hold a pending browser callback, then edit: old checks and parts must stay cleared.
  await page.evaluate(() => {
    window.flowOriginalTimeout = window.setTimeout;
    window.setTimeout = (callback,delay,...args) => window.flowOriginalTimeout(callback,delay === 0 ? 300 : delay,...args);
  });
  await page.getByRole('button',{name:'分析句子',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'正在分析…',exact:true}).isDisabled(),true);
  await input.fill('She sleep.'); await page.waitForTimeout(500);
  assert.equal(await page.locator('.result-status').innerText(),'等待分析');
  assert.equal(await panel.locator('.grammar-checks, .component-analysis, .correction-card').count(),0);
  await page.evaluate(() => {window.setTimeout = window.flowOriginalTimeout;});
  await input.press('Meta+Enter'); await status('部分支持');
  assert.equal(await panel.locator('.correction-card').count(),1);
  assert.equal(await panel.locator('.component-analysis').count(),0);
  assert.deepEqual(requests,[],'offline analysis, corrections and navigation make no requests');
  for (const sentence of ['She sleep.','She likes music.','The teacher gives her an old book.','Our young teacher give the girls an old picture today.','Our young teacher gives the girls an old picture today.','She has sent him a book.']) {
    assert.equal(logs.some(log => log.includes(sentence)),false);
  }
  const storage = await page.evaluate(async () => ({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie}));
  assert.deepEqual(storage,{local:[],session:[],databases:[],cookie:''});
  await context.setOffline(false); await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await input.inputValue(),defaultInput);
  assert.equal(await page.locator('.result-status').innerText(),'等待分析');
  assert.deepEqual(errors,[]);
  const report = {passed:true,viewports:[1280,390],singleTab:true,checksBeforeParts:true,appliedCorrectionRechecked:true,stage20OfflineCasesPreserved:true,nonCompleteBlocked:true,navigationAndAttributes:true,pendingEditCancelled:true,offlineRequests:0,storage,pageErrors:errors};
  if (process.env.CLAUSE_FLOW_REPORT) writeFileSync(process.env.CLAUSE_FLOW_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log('PASS: single-tab checks, automatic parts, correction recheck, blocked states, navigation, mobile, keyboard, cancellation, offline and privacy.');
} finally {await browser.close();}
