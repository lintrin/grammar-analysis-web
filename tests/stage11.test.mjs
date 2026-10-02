import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSentence, tokenize, validateAnalysisResult } from '../lib/grammar.ts';
import { analyzePurpose } from '../lib/grammar/purposes.ts';
import { analyzeComplex } from '../lib/grammar/complex.ts';
import { adjectives } from '../lib/grammar/vocabulary.ts';
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/stage11.json', import.meta.url), 'utf8')).fixtures;
test('six reason categories each have at least three hand-authored cases', () => {
  for (const code of ['unknown-word', 'unsupported-structure', 'form-mismatch', 'punctuation', 'ambiguous', 'budget-exceeded']) assert.ok(fixtures.filter(f => f.code === code).length >= 3, code);
});
for (const f of fixtures) test(`stage 11 manual reason: ${f.input || '(empty)'}`, () => {
  let result;
  if (f.adjectiveOverlap) adjectives.add(f.adjectiveOverlap);
  try {
    if (f.entry) {
      result = { ...analyzeSentence('She sleeps.'), input: f.input, nodes: [], corrections: [], reasons: [], status: 'unsupported', purpose: null, pattern: null, complexity: null, tense: null, aspect: null, voice: null };
      let remaining = f.budget;
      const entry = f.entry === 'complex' ? analyzeComplex : analyzePurpose;
      result.messages = [entry(tokenize(f.input), null, result, () => --remaining >= 0)];
    } else result = analyzeSentence(f.input);
    assert.equal(result.status, f.status);
    assert.equal(result.corrections.length, f.edits);
    assert.equal(result.reasons?.[0]?.code ?? null, f.code);
    if (f.clauseIndex) assert.equal(result.reasons[0].clauseIndex, f.clauseIndex);
    if (f.words) {
      const ranges = result.reasons.flatMap(reason => reason.ranges);
      assert.deepEqual(ranges.map(q => f.input.slice(q.start, q.end)), f.words);
      let cursor = 0;
      assert.deepEqual(ranges, f.words.map(word => { const start = f.input.indexOf(word, cursor); cursor = start + word.length; return { start, end: cursor }; }));
    }
    if (f.status === 'complete') assert.deepEqual(result.reasons, []);
    else assert.deepEqual(result.nodes, []);
    validateAnalysisResult(result);
  } finally { if (f.adjectiveOverlap) adjectives.delete(f.adjectiveOverlap); }
});

const corruptions = {
  'unknown code': r => { r.reasons[0].code = 'typo'; },
  'empty failure reasons': r => { r.reasons = []; },
  'non-array reasons': r => { r.reasons = {}; },
  'unknown without position': r => { r.reasons[0].ranges = []; },
  'position outside original input': r => { r.reasons[0].ranges[0].end = 1000; },
  'duplicate overlapping intervals': r => { r.reasons[0].ranges.push(r.reasons[0].ranges[0]); },
  'invalid clause index': r => { r.reasons[0].clauseIndex = 3; },
  'reason/status disagreement': r => { r.reasons[0].code = 'ambiguous'; },
  'wrong interval type': r => { r.reasons[0].ranges = 'weather'; },
};
for (const [name, corrupt] of Object.entries(corruptions)) test(`stage 11 reject reason protocol: ${name}`, () => {
  const result = analyzeSentence('She likes the weather.');
  corrupt(result); assert.throws(() => validateAnalysisResult(result), /分析数据无效/);
});
test('reason protocol rejects non-string codes even when they coerce to supported names', () => {
  const codes = [
    ['unknown-word'], ['unsupported-structure'], new String('unknown-word'),
    { toString: () => 'unknown-word' }, null, undefined, 1, true,
  ];
  for (const code of codes) for (const emptyRanges of [false, true]) {
    const result = analyzeSentence('She likes the weather.');
    result.reasons[0].code = code;
    if (emptyRanges) result.reasons[0].ranges = [];
    assert.throws(() => validateAnalysisResult(result), /^Error: 分析数据无效：分析原因$/);
  }
});
test('complete results reject missing reasons and failure reasons', () => {
  const r = analyzeSentence('She sleeps.');
  delete r.reasons; assert.throws(() => validateAnalysisResult(r), /分析数据无效/);
  r.reasons = [{ code: 'unsupported-structure', ranges: [] }];
  assert.throws(() => validateAnalysisResult(r), /分析数据无效/);
});
test('reason interval never splits a UTF-16 surrogate pair', () => {
  const r = { ...analyzeSentence('She likes the weather.'), input: '😀weather', reasons: [{code: 'unknown-word', ranges: [{ start: 1, end: 9 }]}] };
  assert.throws(() => validateAnalysisResult(r), /拆分字符/);
});
test('unknown words in both clauses preserve every original occurrence before form analysis', () => {
  const r = analyzeSentence('Music sleep because she likes music.');
  assert.equal(r.status, 'unsupported'); assert.deepEqual(r.corrections, []);
  assert.deepEqual(r.reasons, [
    { code: 'unknown-word', ranges: [{ start: 0, end: 5 }], clauseIndex: 1 },
    { code: 'unknown-word', ranges: [{ start: 30, end: 35 }], clauseIndex: 2 },
  ]);
  r.reasons[0].ranges[0].start++;
  assert.equal(analyzeSentence(r.input).reasons[0].ranges[0].start, 0);
});
test('input limit produces its own reason before any sentence processing', () => {
  const r = analyzeSentence('a'.repeat(1001));
  assert.equal(r.status, 'invalid'); assert.deepEqual(r.reasons, [{ code: 'invalid-input', ranges: [] }]);
});
for (const [overlap, input] of [
  ['boys', 'She sleeps because she gives boys boys books.'],
  ['girls', 'If she gives girls girls gifts, he smiles.'],
  ['teachers', 'She gives teachers teachers books and he smiles.'],
]) test(`ambiguous candidates do not leak nodes or corrections: ${input}`, () => {
  adjectives.add(overlap);
  try {
    const r = analyzeSentence(input);
    assert.equal(r.status, 'ambiguous'); assert.equal(r.reasons[0].code, 'ambiguous');
    assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []);
  } finally { adjectives.delete(overlap); }
});
test('teaching examples match their declared purpose and supported scope', async () => {
  const { exampleGroups } = await import('../lib/grammar/learning.ts');
  assert.equal(exampleGroups.length, 9);
  for (const group of exampleGroups) for (const example of group.examples) {
    const expected = group.title === '词典范围示例' ? 'unsupported' : ['基础纠错', '否定句纠错'].includes(example.title) ? 'partial' : 'complete';
    assert.equal(analyzeSentence(example.text).status, expected, example.title);
  }
});
