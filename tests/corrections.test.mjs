import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, applyCorrection, validateAnalysisResult } from '../lib/grammar.ts';
import { compareStage8Input } from './helpers/stage8-fixtures.mjs';
// Fixed expectations declared before testing; five errors and five controls for each category.
const groups = [
  ['AGREEMENT-001', [
    ['She go to school.', 'She goes to school.'],
    ['They sleeps.', 'They sleep.'],
    ['The boys is kind.', 'The boys are kind.'],
    ['We gives him a book.', 'We give him a book.'],
    ['Do she like books?', 'Does she like books?'],
  ]],
  ['DO-BASE-001', [
    ['Does she goes to school?', 'Does she go to school?'],
    ['Did they slept?', 'Did they sleep?'],
    ['Does he likes books?', 'Does he like books?'],
    ['Do the boys gives me a gift?', 'Do the boys give me a gift?'],
    ['Did she found the book useful?', 'Did she find the book useful?'],
  ]],
  ['MODAL-BASE-001', [
    ['She can goes to school.', 'She can go to school.'],
    ['They can slept.', 'They can sleep.'],
    ['He can likes books.', 'He can like books.'],
    ['We can gives him a gift.', 'We can give him a gift.'],
    ['The boys can found the book useful.', 'The boys can find the book useful.'],
    ['She can is kind.', 'She can be kind.'],
  ]],
];
for (const [rule, pairs] of groups) for (const [input, expected] of pairs) {
  test(`correction ${rule}: ${input}`, () => {
    const r = analyzeSentence(input, 7);
    assert.equal(r.status, 'partial'); assert.deepEqual(r.nodes, []);
    assert.equal(r.corrections.length, 1); assert.equal(r.corrections[0].ruleId, rule);
    validateAnalysisResult(r);
    const next = applyCorrection(r, r.corrections[0].id, input, 7);
    assert.equal(next, expected);
    const parsed = analyzeSentence(next, 8);
    assert.equal(parsed.status, 'complete'); assert.deepEqual(parsed.corrections, []);
    validateAnalysisResult(parsed);
  });
  test(`correct control ${rule}: ${expected}`, () => {
    const r = analyzeSentence(expected);
    assert.equal(r.status, 'complete'); assert.deepEqual(r.corrections, []);
  });
}
for (const input of [
  'She can be kind.', 'I can give her a book.', 'Go to school.', 'Did she go to school?',
]) test(`new valid structure: ${input}`, () => {
  const r = analyzeSentence(input); assert.equal(r.status, 'complete'); assert.deepEqual(r.corrections, []);
  if (input.includes('can')) assert.equal(r.tense, null);
  const verb = r.nodes.find(n => n.role === 'verb');
  if (input.includes('can')) assert.deepEqual(verb.ranges.map(q => input.slice(q.start, q.end)), input.includes('be') ? ['can', 'be'] : ['can', 'give']);
});
for (const input of [
  'She go to unknown.', 'She go to school yesterday.', 'Does she goes to school.',
  'She can goes to school?', 'She can goes to school yesterday.', 'She can give book.',
  'Can she go to school?', 'She will goes to school.', 'She can can go to school.',
  'What my book it is!', 'Does she go to schools?', 'She gave him this books.',
]) test(`no unsafe suggestion: ${input}`, () => {
  const r = analyzeSentence(input);
  if (input === 'Can she go to school?') compareStage8Input(input, r);
  else assert.notEqual(r.status, 'complete');
  assert.deepEqual(r.corrections, []);
});
test('case, spacing, exact ranges and version guard', () => {
  const input = '  SHE  GO TO SCHOOL.  ', r = analyzeSentence(input, 5);
  assert.deepEqual(r.corrections[0].edits, [{ range: { start: 7, end: 9 }, expected: 'GO', replacement: 'GOES' }]);
  assert.equal(applyCorrection(r, r.corrections[0].id, input, 5), '  SHE  GOES TO SCHOOL.  ');
  assert.throws(() => applyCorrection(r, r.corrections[0].id, input, 6), /过期/);
  assert.throws(() => applyCorrection(r, r.corrections[0].id, input.replace('GO', 'GOES'), 5), /过期/);
  assert.throws(() => applyCorrection(r, 'missing', input, 5), /不存在/);
  assert.throws(() => applyCorrection({ ...r, ruleVersion: 'old' }, r.corrections[0].id, input, 5), /过期/);
});
test('two suggestions must be applied one at a time with fresh positions', () => {
  const input = 'Do she gives him a book?', r = analyzeSentence(input, 1);
  assert.equal(r.corrections.length, 2);
  const next = applyCorrection(r, r.corrections[0].id, input, 1);
  assert.equal(next, 'Does she gives him a book?');
  assert.throws(() => applyCorrection(r, r.corrections[1].id, next, 2), /过期/);
  const fresh = analyzeSentence(next, 2);
  assert.equal(fresh.corrections.length, 1);
  assert.equal(applyCorrection(fresh, fresh.corrections[0].id, next, 2), 'Does she give him a book?');
});
