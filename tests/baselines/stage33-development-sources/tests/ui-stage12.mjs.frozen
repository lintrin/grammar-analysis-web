// Final acceptance against a running local server. Uses the same bundled Chromium as ui-smoke.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { stage12, expectedStage12 } from './helpers/stage12-fixtures.mjs';
import { performanceCases } from './helpers/stage12-performance.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [], messages = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => messages.push(message.text()));
  page.on('request', request => requests.push([request.url(), request.postData()]));
  await page.goto(process.env.CLAUSE_BASE_URL ?? 'http://127.0.0.1:5188');
  await page.waitForLoadState('networkidle');
  console.log('Initial rendered controls:', await page.getByRole('button').allTextContents());
  const sentence = page.getByRole('textbox', { name: '需要分析的英文句子' });
  const analyze = page.getByRole('button', { name: '分析句子', exact: true });
  const labels = { complete: '规则分析完成', unsupported: '超出当前范围', partial: '部分支持', invalid: '请检查输入' };
  const titles = { SV: '主语 + 谓语', SVO: '主语 + 谓语 + 宾语', SVC: '主语 + 系动词 + 表语', SVOO: '主语 + 谓语 + 双宾语', SVOC: '主语 + 谓语 + 宾语 + 宾语补足语' };
  const exact = text => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  const displayedText = () => page.locator('.part-text, .sentence-gap').allTextContents().then(parts => parts.join(''));
  const waitStatus = status => page.locator('.result-status').filter({ hasText: exact(labels[status]) }).waitFor();
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const checkFixture = async f => {
    const expected = expectedStage12(f);
    await sentence.fill(f.input);
    assert.equal(await page.locator('.sentence-part').count(), 0);
    await sentence.press('Control+Enter'); await waitStatus('complete');
    assert.equal(await displayedText(), f.input);
    assert.equal(await page.locator('.analysis-feedback').count(), 0);
    if (f.group === 'simple') assert.equal(await page.locator('.result-overview h3').innerText(), titles[f.clauses[0].pattern]);
    else {
      for (const [index, clause] of f.clauses.entries()) {
        const node = expected.nodes.find(n => n.key === `clause-${index + 1}`);
        const text = f.input.slice(node.ranges[0].start, node.ranges[0].end);
        const button = page.locator('.sentence-part').filter({ has: page.locator('.part-text').filter({ hasText: exact(text) }) });
        await button.focus(); await page.keyboard.press('Enter');
        const back = page.getByRole('button', { name: '返回整句', exact: true });
        await back.waitFor(); assert.equal(await back.evaluate(el => el === document.activeElement), true);
        assert.equal(await displayedText(), text);
        assert.equal(await page.locator('.result-overview h3').innerText(), titles[clause.pattern]);
        assert.match(await page.locator('.tense-badge').innerText(), clause.tense === null ? /can/ : clause.tense === 'past' ? /过去/ : /现在/);
        await back.press('Enter');
        assert.equal(await button.evaluate(el => el === document.activeElement), true);
        assert.equal(await displayedText(), f.input);
      }
    }
    await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
    assert.equal(await page.locator('.correction-card').count(), 0);
    await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
    await noOverflow();
  };
  requests.length = 0;
  await context.setOffline(true);
  for (const f of stage12.fixtures) await checkFixture(f);
  for (const f of stage12.boundaries) {
    if (f.expected) {
      await sentence.fill(f.input); await sentence.press('Control+Enter'); await waitStatus(f.expected.status);
      assert.equal(await sentence.inputValue(), f.input); assert.equal(await displayedText(), f.input);
      assert.equal(await page.locator('.result-overview h3').innerText(), titles[f.expected.pattern]);
      assert.deepEqual(await page.locator('.sentence-part .part-text').allTextContents(),f.expected.nodes.filter(n=>n.parentKey===null).flatMap(n=>n.ranges.map(q=>f.input.slice(q.start,q.end))));
      assert.equal(await page.locator('.analysis-feedback').count(),0);assert.equal(await page.locator('.correction-card').count(),0);
      continue;
    }
    if (f.status === 'complete') { await checkFixture(f); continue; }
    await sentence.fill(f.input); await analyze.click(); await waitStatus(f.status);
    assert.equal(await sentence.inputValue(), f.input);
    assert.equal(await page.locator('.sentence-part').count(), 0);
    assert.equal(await page.locator('.correction-card').count(), 0);
  }
  const longTaskSupported = await page.evaluate(() => {
    window.acceptanceLongTasks = [];
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return false;
    window.acceptanceTaskObserver = new PerformanceObserver(list => window.acceptanceLongTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration }))));
    window.acceptanceTaskObserver.observe({ type: 'longtask', buffered: false }); return true;
  });
  const timing = [];
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const f of performanceCases) {
      const samples = [];
      for (let repeat = 0; repeat < 5; repeat++) {
        await sentence.fill(f.input);
        const measurement = await page.evaluate(status => new Promise((resolve, reject) => {
          const target = document.querySelector('.result-status');
          const start = performance.now();
          const timeout = setTimeout(() => { observer.disconnect(); reject(new Error('Analysis did not complete')); }, 10000);
          const observer = new MutationObserver(() => {
            if (target.textContent === status) { clearTimeout(timeout); observer.disconnect(); resolve({ start, renderMs: performance.now() - start }); }
          });
          observer.observe(target, { childList: true, subtree: true, characterData: true });
          document.querySelector('.analyze-button').click();
        }), labels[f.status]);
        samples.push(measurement.renderMs);
        await waitStatus(f.status); await noOverflow();
        if (f.status === 'complete') assert.equal(await displayedText(), f.input);
        else assert.equal(await page.locator('.sentence-part').count(), 0);
      }
      timing.push({ viewport: width, id: f.id, utf16Length: f.input.length, renderMs: samples });
    }
    for (const group of ['simple', 'compound', 'because', 'if']) await checkFixture(stage12.fixtures.find(f => f.group === group));
  }
  await checkFixture(stage12.fixtures.find(f => f.id === 'if-10'));
  await page.locator('.result-card').scrollIntoViewIfNeeded();
  await page.locator('.result-card').screenshot({ path: '/tmp/clause-stage12-mobile.png' });
  await page.locator('.sentence-part').filter({ hasText: 'the small children' }).press('Enter');
  await page.locator('.result-card').screenshot({ path: '/tmp/clause-stage12-clause-mobile.png' });
  const sentinel = 'PrivateStageTwelveUnknownWord';
  await sentence.fill(sentinel); await analyze.click(); await waitStatus('unsupported');
  assert.equal(requests.length, 0, 'Offline acceptance must not issue HTTP requests');
  const privateTexts = [...stage12.fixtures, ...stage12.boundaries, ...performanceCases].map(f => f.input).concat(sentinel);
  assert.equal(messages.some(message => privateTexts.some(input => message.includes(input))), false, 'Browser console must not log input');
  assert.deepEqual(await page.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), databases: (await indexedDB.databases()).map(db => db.name), cookie: document.cookie })), { local: [], session: [], databases: [], cookie: '' });
  // Allow observer delivery before reading entries; this wait is outside measured analyses.
  await page.waitForTimeout(100);
  const longTasks = await page.evaluate(() => { window.acceptanceTaskObserver?.disconnect(); return window.acceptanceLongTasks; });
  const report = { browser: browser.version(), longTaskSupported, timing, longTasks, limitation: 'Click-to-result measurements include React rendering; long tasks are observed only during the performance/mobile section. Five samples per case and viewport; local evidence only.' };
  writeFileSync(process.env.CLAUSE_BROWSER_REPORT ?? '/tmp/clause-stage12-browser-performance.json', JSON.stringify(report, null, 2));
  await context.setOffline(false); await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.result-status').innerText(), '等待分析');
  assert.notEqual(await sentence.inputValue(), sentinel);
  assert.deepEqual(errors, []);
  console.log('PASS: 40 independent inputs, 20 contrasts, both clauses, keyboard focus, 1000 UTF-16 performance, mobile, offline, privacy and reload.');
} finally { await browser.close(); }
