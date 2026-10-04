// Run against dev with CLAUSE_HMR=1; run the same offline/privacy flow against build.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const snapshotPath = new URL('../lib/grammar/generated/lexicon.json',import.meta.url);
const original = readFileSync(snapshotPath,'utf8');
let changed = false;
try {
  const context = await browser.newContext({ viewport: { width: 390,height: 844 } });
  const page = await context.newPage(); const errors = [], logs = [], requests = [];
  page.on('pageerror',e => errors.push(String(e)));
  page.on('console',m => logs.push(m.text()));
  page.on('request',r => requests.push([r.url(),r.postData()]));
  await page.addInitScript(() => {
    const original = window.setTimeout;
    window.setTimeout = function(callback,delay,...args) {
      if (window.__holdAnalysis && delay === 0 && String(callback).includes('requestId')) {
        window.__heldAnalysis = () => callback(...args);
        return original(() => {},600000);
      }
      return original(callback,delay,...args);
    };
  });
  await page.goto(process.env.CLAUSE_BASE_URL ?? 'http://127.0.0.1:5188');
  await page.waitForLoadState('networkidle');
  const input = page.getByRole('textbox',{ name: '需要分析的英文句子' });
  const analyze = page.getByRole('button',{ name: '分析句子',exact: true });
  const status = text => page.getByText(text,{ exact: true }).waitFor();
  const privateInput = 'Our young teacher give the girls an old picture today.';
  await input.fill(privateInput); await input.press('Control+Enter'); await status('部分支持');
  await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
  assert.equal(await page.locator('.correction-card').count(),1);
  if (process.env.CLAUSE_HMR === '1') {
    // Version and hash each invalidate a displayed result while retaining the input.
    const alter = (field,value) => { const s = JSON.parse(original); s[field] = value; writeFileSync(snapshotPath,JSON.stringify(s)+'\n'); changed = true; };
    alter('lexiconVersion','hmr-test-version');
    await status('等待分析'); assert.equal(await input.inputValue(),privateInput); assert.equal(await page.locator('.correction-card').count(),0);
    await analyze.click(); await status('部分支持');
    alter('lexiconHash','a'.repeat(64));
    await status('等待分析'); assert.equal(await input.inputValue(),privateInput);
    await page.evaluate(() => { window.__holdAnalysis = true; });
    await analyze.click();
    await page.waitForFunction(() => typeof window.__heldAnalysis === 'function');
    writeFileSync(snapshotPath,original); changed = false;
    await status('等待分析');
    await page.evaluate(() => { window.__holdAnalysis = false; window.__heldAnalysis(); });
    assert.equal(await input.inputValue(),privateInput);
    assert.equal(await page.locator('.sentence-part').count(),0); assert.equal(await page.locator('.correction-card').count(),0);
    await status('等待分析');
  }
  await context.setOffline(true);
  await analyze.click(); await status('部分支持');
  await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
  await page.getByRole('button',{ name: '应用此建议并重新分析',exact: true }).click(); await status('规则分析完成');
  assert.equal(await input.inputValue(),privateInput.replace('give','gives'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await input.fill('She has sent him a book.'); await input.press('Control+Enter'); await status('规则分析完成');
  await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
  assert.equal(await page.locator('.sentence-part').count(),4);
  const storage = await page.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), databases: await indexedDB.databases(), cookie: document.cookie }));
  assert.deepEqual(storage,{ local: [],session: [],databases: [],cookie: '' });
  for (const text of [privateInput,privateInput.replace('give','gives'),'She has sent him a book.']) {
    assert.equal(JSON.stringify(requests).includes(text),false); assert.equal(logs.some(s => s.includes(text)),false);
  }
  assert.deepEqual(errors,[]);
  await page.screenshot({ path: process.env.CLAUSE_STAGE20_SCREENSHOT ?? '/tmp/clause-stage20-mobile.png',fullPage: true });
  console.log('PASS: '+(process.env.CLAUSE_HMR === '1' ? 'version/hash HMR invalidation, held stale task, ' : '')+'offline correction/reanalysis, keyboard, mobile, network/log/storage privacy. Chromium '+browser.version());
} finally {
  if (changed) writeFileSync(snapshotPath,original);
  await browser.close();
}
