// Optional browser checks; requires Playwright and a running dev server on port 5188.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [], messages = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => messages.push(message.text()));
  page.on('request', request => requests.push([request.url(), request.postData()]));
  await page.goto('http://127.0.0.1:5188');
  await page.waitForLoadState('networkidle');
  console.log('Rendered buttons:', await page.getByRole('button').allTextContents());
  const sentence = page.getByRole('textbox', { name: '需要分析的英文句子' });
  const analyze = page.getByRole('button', { name: '分析句子', exact: true });
  const waitStatus = name => page.getByText(name, { exact: true }).waitFor({ state: 'visible' });
  const checkParts = async count => assert.equal(await page.locator('.sentence-part').count(), count);
  await waitStatus('等待分析');
  await analyze.click();
  await waitStatus('规则分析完成');
  await checkParts(5);
  await page.locator('.sentence-part').filter({ hasText: 'a useful book' }).click();
  await page.getByRole('button', { name: '定语 · useful' }).click();
  assert.match(await page.locator('.detail-callout').innerText(), /修饰短语/);
  await page.getByRole('button', { name: '返回上层短语' }).click();
  assert.match(await page.locator('.detail-callout').innerText(), /直接宾语/);
  const text = '  My mother  offered the boys a small gift today.  ';
  await sentence.fill(text);
  await checkParts(0);
  await waitStatus('等待分析');
  await sentence.press('Control+Enter');
  await waitStatus('规则分析完成');
  assert.equal((await page.locator('.part-text, .sentence-gap').allTextContents()).join(''), text);
  await page.getByRole('tab', { name: '语法检查' }).click();
  await waitStatus('当前未命中可应用的纠错建议。');
  await page.getByRole('tab', { name: '成分解析' }).click();
  await page.evaluate(() => {
    window.originalTimer = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => window.originalTimer(callback, delay === 0 ? 200 : delay, ...args);
  });
  await analyze.click();
  assert.equal(await page.getByRole('button', { name: '正在分析…' }).isDisabled(), true);
  await sentence.fill('She gives him a new book today.');
  await page.waitForTimeout(350);
  await waitStatus('等待分析');
  await checkParts(0);
  await page.evaluate(() => { window.setTimeout = window.originalTimer; });
  await page.evaluate(() => { const b = document.querySelector('.analyze-button'); b.click(); b.click(); b.click(); });
  await waitStatus('规则分析完成');
  await checkParts(5);
  for (const [text, status] of [
    ['', '请检查输入'], ['x'.repeat(1001), '请检查输入'],
    ['She gave him a book. He gave me a pen.', '请检查输入'],
    ['Does she like reading books?', '超出当前范围'], ['She give him a book.', '部分支持'],
  ]) {
    await sentence.fill(text); await analyze.click(); await waitStatus(status); await checkParts(0);
    assert.equal(await sentence.inputValue(), text);
  }
  await sentence.fill('She gave him a book.');
  await page.evaluate(() => {
    window.originalMatchAll = String.prototype.matchAll;
    String.prototype.matchAll = function (...args) {
      if (this.toString() === 'She gave him a book.') throw new Error('test failure');
      return window.originalMatchAll.apply(this, args);
    };
  });
  await analyze.click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /输入已保留/);
  assert.equal(await sentence.inputValue(), 'She gave him a book.');
  await page.evaluate(() => { String.prototype.matchAll = window.originalMatchAll; });
  await analyze.click(); await waitStatus('规则分析完成');
  for (const [text, title, count, complementLabel] of [
    ['The children smiled yesterday.', '主语 + 谓语', 3, null],
    ['She likes the useful book.', '主语 + 谓语 + 宾语', 3, null],
    ['The book is useful.', '主语 + 系动词 + 表语', 3, '表语'],
    ['We found the book useful.', '主语 + 谓语 + 宾语 + 宾语补足语', 4, '宾语补足语'],
  ]) {
    await sentence.fill(text); await analyze.click(); await waitStatus('规则分析完成'); await checkParts(count);
    assert.equal(await page.locator('.result-overview h3').innerText(), title);
    if (complementLabel) {
      await page.locator('.sentence-part').filter({ hasText: complementLabel }).click();
      assert.match(await page.locator('.detail-callout').innerText(), new RegExp(complementLabel));
    }
  }
  for (const [text, purpose, count] of [
    ['Did she give him a book yesterday?', '疑问句', 6],
    ['Is the book useful?', '疑问句', 3],
    ['Be kind.', '祈使句', 2],
    ['What a useful book it is!', '感叹句', 3],
    ['How kind she is!', '感叹句', 3],
  ]) {
    await sentence.fill(text); await analyze.click(); await waitStatus('规则分析完成'); await checkParts(count);
    assert.match(await page.locator('.result-overview').innerText(), new RegExp(purpose));
    assert.equal((await page.locator('.part-text, .sentence-gap').allTextContents()).join(''), text);
    if (purpose === '祈使句') {
      await page.getByRole('button', { name: '主语 · 隐含 you' }).click();
      assert.match(await page.locator('.detail-callout').innerText(), /没有对应的原文位置/);
      assert.match(await page.locator('.tense-badge').innerText(), /动词原形/);
    }
    if (text.startsWith('Did')) {
      await page.locator('.sentence-part').filter({ hasText: 'Did' }).click();
      assert.equal(await page.locator('.sentence-part[aria-pressed="true"]').count(), 2);
      assert.match(await page.locator('.detail-callout').innerText(), /Did … give/);
    }
    if (text.startsWith('What')) {
      await page.locator('.sentence-part').filter({ hasText: 'What a useful book' }).click();
      await page.getByRole('button', { name: '定语 · What' }).click();
      assert.match(await page.locator('.detail-callout').innerText(), /强调成分/);
    }
  }
  for (const [text, count, detail] of [
    ['She does not like the book.', 3, /否定谓语/],
    ['The book is not useful.', 3, /否定的系动词/],
    ['She can not go to school.', 3, /否定谓语/],
    ['Can she give him a book?', 5, /一般疑问句/],
    ['It is an old book.', 3, null],
    ['We found it useful.', 4, null],
  ]) {
    await sentence.fill(text); await sentence.press('Control+Enter'); await waitStatus('规则分析完成'); await checkParts(count);
    assert.equal((await page.locator('.part-text, .sentence-gap').allTextContents()).join(''), text);
    if (detail) {
      await page.locator('.sentence-part.verb').first().focus(); await page.keyboard.press('Enter');
      assert.match(await page.locator('.detail-callout').innerText(), detail);
      if (text.startsWith('Can')) assert.equal(await page.locator('.sentence-part[aria-pressed="true"]').count(), 2);
    }
    if (text === 'It is an old book.') {
      await page.locator('.sentence-part').filter({ hasText: 'an old book' }).click();
      await page.getByRole('button', { name: '定语 · old' }).click();
      assert.match(await page.locator('.detail-callout').innerText(), /修饰短语/);
    }
  }
  const mixedClauses = 'She is kind and we found it useful.';
  await sentence.fill(mixedClauses); await sentence.press('Control+Enter'); await waitStatus('规则分析完成'); await checkParts(3);
  assert.match(await page.locator('.result-overview').innerText(), /并列句/);
  assert.deepEqual(await page.locator('.structure-pill').allTextContents(), ['CL', 'LINK', 'CL']);
  assert.doesNotMatch(await page.locator('.tense-badge').innerText(), /can/);
  assert.equal((await page.locator('.part-text, .sentence-gap').allTextContents()).join(''), mixedClauses);
  await page.locator('.sentence-part').filter({ hasText: '连接关系' }).click();
  assert.match(await page.locator('.detail-callout').innerText(), /并列添加/);
  await page.locator('.sentence-part').filter({ hasText: 'She is kind' }).focus(); await page.keyboard.press('Enter');
  await waitStatus('正在查看第 1 分句'); await checkParts(3);
  assert.equal(await page.getByRole('button', { name: '返回整句', exact: true }).evaluate(b => b === document.activeElement), true);
  assert.match(await page.locator('.tense-badge').innerText(), /一般现在时/);
  await page.locator('.sentence-part').filter({ hasText: '表语' }).click();
  assert.match(await page.locator('.detail-callout').innerText(), /表语/);
  await page.getByRole('button', { name: '返回整句', exact: true }).focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('.sentence-part[aria-pressed="true"]').innerText(), /She is kind/);
  assert.equal(await page.locator('.sentence-part[aria-pressed="true"]').evaluate(b => b === document.activeElement), true);
  await page.locator('.sentence-part').filter({ hasText: 'we found it useful' }).focus(); await page.keyboard.press('Enter');
  await waitStatus('正在查看第 2 分句'); await checkParts(4);
  assert.match(await page.locator('.tense-badge').innerText(), /一般过去时/);
  await page.locator('.sentence-part').filter({ hasText: '宾语补足语' }).click();
  assert.match(await page.locator('.detail-callout').innerText(), /宾语补足语/);
  await page.getByRole('tab', { name: '语法检查' }).click();
  assert.match(await page.locator('.check-scope').innerText(), /并列句暂不提供/);
  assert.equal(await page.locator('.correction-card').count(), 0);
  await page.getByRole('tab', { name: '成分解析' }).click();
  await sentence.fill('She sleeps and he smiles.'); await checkParts(0);
  assert.equal(await page.getByRole('button', { name: '返回整句', exact: true }).count(), 0);
  const spacedCompound = '  SHE  sees it ,  BUT  she  liked it.  ';
  await sentence.fill(spacedCompound); await analyze.click(); await waitStatus('规则分析完成'); await checkParts(4);
  assert.equal((await page.locator('.part-text, .sentence-gap').allTextContents()).join(''), spacedCompound);
  await page.locator('.sentence-part').filter({ hasText: 'BUT' }).click();
  assert.equal(await page.locator('.sentence-part[aria-pressed="true"]').count(), 2);
  assert.match(await page.locator('.detail-callout').innerText(), /转折.*逗号/s);
  await sentence.fill('She sleeps and he do not likes books.'); await analyze.click(); await waitStatus('部分支持'); await checkParts(0);
  await page.getByRole('tab', { name: '语法检查' }).click();
  assert.equal(await page.locator('.correction-card').count(), 0);
  await page.getByRole('tab', { name: '成分解析' }).click();
  await sentence.fill('She do not likes books.'); await analyze.click(); await waitStatus('部分支持');
  await page.getByRole('tab', { name: '语法检查' }).click();
  assert.equal(await page.locator('.correction-card').count(), 2);
  await page.getByRole('button', { name: '应用此建议并重新分析' }).first().click(); await waitStatus('部分支持');
  assert.equal(await sentence.inputValue(), 'She does not likes books.');
  assert.equal(await page.locator('.correction-card').count(), 1);
  await page.getByRole('button', { name: '应用此建议并重新分析' }).click(); await waitStatus('规则分析完成');
  assert.equal(await sentence.inputValue(), 'She does not like books.');
  await page.getByRole('tab', { name: '成分解析' }).click();
  await sentence.fill('Do she gives him a book?'); await analyze.click(); await waitStatus('部分支持');
  await page.getByRole('tab', { name: '语法检查' }).click();
  assert.equal(await page.locator('.correction-card').count(), 2);
  await page.getByRole('button', { name: '应用此建议并重新分析' }).first().click();
  await waitStatus('部分支持');
  assert.equal(await sentence.inputValue(), 'Does she gives him a book?');
  assert.equal(await page.locator('.correction-card').count(), 1);
  await page.getByRole('button', { name: '应用此建议并重新分析' }).click();
  await waitStatus('规则分析完成');
  assert.equal(await sentence.inputValue(), 'Does she give him a book?');
  await waitStatus('当前未命中可应用的纠错建议。');
  await sentence.fill('She go to school.'); await analyze.click(); await waitStatus('部分支持');
  await page.evaluate(() => {
    window.originalTimer = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => window.originalTimer(callback, delay === 0 ? 200 : delay, ...args);
  });
  await page.getByRole('button', { name: '应用此建议并重新分析' }).click();
  assert.equal(await page.locator('.correction-card').count(), 0);
  await sentence.fill('They sleep.');
  await page.waitForTimeout(350); await waitStatus('等待分析');
  await page.evaluate(() => { window.setTimeout = window.originalTimer; });
  await sentence.fill('She can goes to school.'); await analyze.click(); await waitStatus('部分支持');
  await sentence.fill('She sleeps.');
  assert.equal(await page.getByRole('button', { name: '应用此建议并重新分析' }).count(), 0);
  await page.getByRole('tab', { name: '成分解析' }).click();
  requests.length = 0;
  await context.setOffline(true);
  const privateSentence = 'Did the young teacher give the girls a useful book yesterday?';
  await sentence.fill(privateSentence); await sentence.press('Meta+Enter'); await waitStatus('规则分析完成');
  assert.equal(requests.length, 0, 'analysis should make no HTTP requests');
  assert.equal(messages.some(message => message.includes(privateSentence)), false);
  assert.equal(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length), 0);
  await sentence.fill('She can goes to school.'); await analyze.click(); await waitStatus('部分支持');
  await page.getByRole('tab', { name: '语法检查' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/clause-corrections-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '应用此建议并重新分析' }).focus();
  await page.keyboard.press('Enter'); await waitStatus('规则分析完成');
  assert.equal(await sentence.inputValue(), 'She can go to school.');
  assert.equal(requests.length, 0, 'offline correction should make no HTTP requests');
  assert.equal(messages.some(message => message.includes('She can goes to school.')), false);
  await page.getByRole('tab', { name: '成分解析' }).click();
  assert.match(await page.locator('.tense-badge').innerText(), /can/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/clause-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: '/tmp/clause-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const expandedPrivateSentence = 'The good teacher does not give the girls an old gift today.';
  await sentence.fill(expandedPrivateSentence); await sentence.press('Meta+Enter'); await waitStatus('规则分析完成');
  await checkParts(5);
  await sentence.fill('She do not likes books.'); await analyze.click(); await waitStatus('部分支持');
  await page.getByRole('tab', { name: '语法检查' }).click();
  await page.locator('.result-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/clause-stage8-corrections-mobile.png' });
  await page.getByRole('button', { name: '应用此建议并重新分析' }).first().focus(); await page.keyboard.press('Enter'); await waitStatus('部分支持');
  await page.getByRole('button', { name: '应用此建议并重新分析' }).focus(); await page.keyboard.press('Enter'); await waitStatus('规则分析完成');
  assert.equal(await sentence.inputValue(), 'She does not like books.');
  await sentence.fill('Can she is an old teacher?'); await analyze.click(); await waitStatus('部分支持');
  await page.getByRole('button', { name: '应用此建议并重新分析' }).click(); await waitStatus('规则分析完成');
  assert.equal(await sentence.inputValue(), 'Can she be an old teacher?');
  await page.getByRole('tab', { name: '成分解析' }).click(); await checkParts(4);
  assert.match(await page.locator('.tense-badge').innerText(), /can/);
  await page.locator('.sentence-part.verb').first().focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.sentence-part[aria-pressed="true"]').count(), 2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.result-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/clause-stage8-question-mobile.png' });
  assert.equal(requests.length, 0, 'expanded offline analysis and edits make no HTTP requests');
  for (const privateText of [expandedPrivateSentence, 'She do not likes books.', 'Can she is an old teacher?']) assert.equal(messages.some(m => m.includes(privateText)), false);
  assert.equal(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length), 0);
  const privateCompound = 'The young teacher gives her an old book and the book is useful.';
  await sentence.fill(privateCompound); await sentence.press('Meta+Enter'); await waitStatus('规则分析完成'); await checkParts(3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.result-card').scrollIntoViewIfNeeded();
  await page.locator('.result-card').screenshot({ path: '/tmp/clause-stage9-overview-mobile.png' });
  await page.locator('.sentence-part').filter({ hasText: 'The young teacher' }).focus(); await page.keyboard.press('Enter');
  await waitStatus('正在查看第 1 分句'); await checkParts(4);
  await page.locator('.sentence-part').filter({ hasText: 'an old book' }).click();
  await page.getByRole('button', { name: '定语 · old' }).focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('.detail-callout').innerText(), /修饰短语/);
  await page.getByRole('button', { name: '返回上层短语' }).click();
  await page.locator('.result-card').scrollIntoViewIfNeeded();
  await page.locator('.result-card').screenshot({ path: '/tmp/clause-stage9-clause-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: '返回整句', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.locator('.sentence-part').filter({ hasText: 'the book is useful' }).focus(); await page.keyboard.press('Enter');
  await waitStatus('正在查看第 2 分句'); await checkParts(3);
  await page.locator('.sentence-part').filter({ hasText: '表语' }).click();
  assert.match(await page.locator('.detail-callout').innerText(), /表语/);
  await page.getByRole('button', { name: '返回整句', exact: true }).click();
  await sentence.fill('She can not go to school, and he smiled yesterday.'); await analyze.click(); await waitStatus('规则分析完成');
  await page.locator('.sentence-part').filter({ hasText: 'She can not go' }).click();
  assert.match(await page.locator('.tense-badge').innerText(), /can/);
  await sentence.fill('She sleeps and he smiles.'); await checkParts(0);
  assert.equal(await page.getByRole('button', { name: '返回整句', exact: true }).count(), 0);
  assert.equal(requests.length, 0, 'offline compound analysis and navigation make no HTTP requests');
  assert.equal(messages.some(m => m.includes(privateCompound)), false);
  assert.equal(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length), 0);
  await context.setOffline(false); await page.reload(); await page.waitForLoadState('networkidle');
  await waitStatus('等待分析'); assert.notEqual(await sentence.inputValue(), privateSentence); assert.notEqual(await sentence.inputValue(), 'Can she be an old teacher?');
  assert.deepEqual(errors, []);
  console.log('PASS: analysis, nesting, stale input, keyboard, failure/retry, scope, offline, privacy and mobile.');
} finally { await browser.close(); }
