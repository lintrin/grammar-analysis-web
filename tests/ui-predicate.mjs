import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { predicatePerformanceCases } from './helpers/predicate-performance.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const data = JSON.parse(readFileSync(new URL('./fixtures/predicate-development.json', import.meta.url), 'utf8'));
const stage = Number(process.env.CLAUSE_STAGE ?? 18);
const fixtures = data.fixtures.filter(f => f.stage <= stage);
const boundaries = data.boundaries.filter(f => f.stage <= stage);
if (stage === 18) {
  const acceptance = JSON.parse(readFileSync(new URL('./fixtures/predicate-acceptance.json', import.meta.url), 'utf8'));
  fixtures.push(...acceptance.fixtures); boundaries.push(...acceptance.boundaries);
  const review = JSON.parse(readFileSync(new URL('./fixtures/predicate-review.json', import.meta.url), 'utf8'));
  fixtures.push(...review.fixtures); boundaries.push(...review.boundaries);
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [], logs = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => logs.push(message.text()));
  page.on('request', request => requests.push([request.url(), request.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL ?? 'http://127.0.0.1:5188'); await page.waitForLoadState('networkidle');
  console.log('Rendered controls:', (await page.getByRole('button').allTextContents()).slice(0,4));
  const input = page.getByRole('textbox', { name: '需要分析的英文句子' });
  const labels = { complete: '规则分析完成', partial: '部分支持', unsupported: '超出当前范围', ambiguous: '存在歧义' };
  const wait = status => page.locator('.result-status').filter({ hasText: labels[status] }).waitFor();
  const displayed = () => page.locator('.part-text, .sentence-gap').allTextContents().then(texts => texts.join(''));
  const time = clause => `${clause.aspect === 'simple' ? '一般' : ''}${clause.tense === 'past' ? '过去' : '现在'}${{simple:'',progressive:'进行',perfect:'完成','perfect-progressive':'完成进行'}[clause.aspect]}时`;
  const classification = async clause => {
    assert.equal((await page.locator('.tense-badge').innerText()).replace(/\s+/g, ''), `${time(clause)}${clause.voice === 'passive' ? '被动语态' : '主动语态'}`);
    assert.equal(await page.locator('.structure-pill.verb').count(), 1);
  };
  const check = async fixture => {
    await input.fill(fixture.input); assert.equal(await page.locator('.sentence-part').count(), 0);
    await input.press('Control+Enter'); await wait('complete');
    assert.equal(await displayed(), fixture.input);
    if (fixture.group === 'simple') {
      await classification(fixture.clauses[0]);
      await page.locator('.sentence-part.verb').first().press('Enter');
      assert.match(await page.locator('.detail-callout p').first().innerText(), /完整谓语/);
    } else {
      for (const [index, clause] of fixture.clauses.entries()) {
        const button = page.locator('.sentence-part.clause').filter({ has: page.locator('.part-code', { hasText: /CL|MC|SC/ }) }).nth(index);
        await button.press('Enter');
        const back = page.getByRole('button', { name: '返回整句', exact: true }); await back.waitFor();
        assert.equal(await back.evaluate(el => el === document.activeElement), true);
        await classification(clause); await back.press('Enter');
        assert.equal(await button.evaluate(el => el === document.activeElement), true);
      }
    }
    await page.getByRole('tab', { name: '语法检查' }).click();
    assert.equal(await page.locator('.correction-card').count(), 0);
    assert.match(await page.locator('.grammar-checks').innerText(), /未命中|暂不提供/);
    await page.getByRole('tab', { name: '成分解析' }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  };
  await context.setOffline(true); requests.length = 0;
  for (const fixture of fixtures) await check(fixture);
  for (const fixture of boundaries) {
    await input.fill(fixture.input); await input.press('Control+Enter'); await wait(fixture.expected?.status ?? fixture.status);
    if(fixture.expected?.status === 'complete') {
      assert.equal(await displayed(),fixture.input);
      assert.equal(await page.locator('.sentence-part').count(),fixture.expected.nodes.filter(n=>n.parentKey===null).reduce((n,node)=>n+node.ranges.length,0));
      await classification(fixture.expected);
    } else assert.equal(await page.locator('.sentence-part').count(), 0);
    await page.getByRole('tab', { name: '语法检查' }).click();
    assert.equal(await page.locator('.correction-card').count(), fixture.expected?.corrections.length ?? 0);
    for(const [i,c] of (fixture.expected?.corrections ?? []).entries()) {
      const card=page.locator('.correction-card').nth(i);
      assert.deepEqual(await card.locator('del').allTextContents(),c.edits.map(e=>e.expected));
      assert.deepEqual(await card.locator('strong').allTextContents(),c.edits.map(e=>e.replacement));
    }
    await page.getByRole('tab', { name: '成分解析' }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const category of new Set(fixtures.map(f => f.category))) {
    for (const fixture of [fixtures.find(f => f.category === category), fixtures.find(f => f.category === category && f.purpose === 'interrogative')].filter(Boolean)) await check(fixture);
  }
  const timing = [];
  await page.evaluate(() => {
    window.predicateLongTasks = [];
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      window.predicateObserver = new PerformanceObserver(list => window.predicateLongTasks.push(...list.getEntries().map(e => e.duration)));
      window.predicateObserver.observe({ type: 'longtask' });
    }
  });
  for (const width of [1280,390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const fixture of predicatePerformanceCases.filter(f => f.stage <= stage)) {
      for (let i=0;i<5;i++) {
        await input.fill(fixture.input);
        const renderMs = await page.evaluate(() => new Promise((resolve, reject) => {
        const target = document.querySelector('.result-status'), start = performance.now();
        const observer = new MutationObserver(() => { if (target.textContent === '规则分析完成') { clearTimeout(timeout); observer.disconnect(); resolve(performance.now()-start); } });
        const timeout = setTimeout(() => { observer.disconnect(); reject(new Error('Analysis timeout')); }, 10000);
        observer.observe(target, { childList: true, subtree: true, characterData: true }); document.querySelector('.analyze-button').click();
        }));
        timing.push({ id: fixture.id, category: fixture.category, viewport: width, utf16Length: fixture.input.length, renderMs });
      }
    }
  }
  await page.waitForTimeout(100);
  const longTasks = await page.evaluate(() => { window.predicateObserver?.disconnect(); return window.predicateLongTasks; });
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  const privateInputs = [...fixtures, ...boundaries, ...predicatePerformanceCases].map(f => f.input);
  assert.equal(logs.some(log => privateInputs.some(input => log.includes(input))), false);
  assert.deepEqual(await page.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), databases: (await indexedDB.databases()).map(db => db.name), cookie: document.cookie })), { local: [], session: [], databases: [], cookie: '' });
  const lastInput = await input.inputValue();
  await page.locator('.result-card').screenshot({ path: process.env.CLAUSE_PREDICATE_SCREENSHOT ?? `/tmp/clause-stage${stage}-mobile.png` });
  await context.setOffline(false); await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.result-status').innerText(), '等待分析'); assert.notEqual(await input.inputValue(), lastInput);
  writeFileSync(process.env.CLAUSE_PREDICATE_REPORT ?? `/tmp/clause-stage${stage}-browser.json`, JSON.stringify({ stage, browser: browser.version(), correct: fixtures.length, boundaries: boundaries.length, timing, longTasks, limitation: 'Local click-to-result timings include React rendering, five samples per substantive 1000 UTF-16 input at desktop and 390px.' }, null, 2));
  console.log(`PASS stage ${stage}: ${fixtures.length} correct, ${boundaries.length} boundaries; keyboard, mobile, offline, privacy, reload, performance.`);
} finally { await browser.close(); }
