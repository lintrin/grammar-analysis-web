import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, tokenize, validateAnalysisResult, VOCABULARY } from '../lib/grammar.ts';

// Expected roles, tense and boundaries are specified independently of engine output.
const fixtures = [
  ['The teacher gave the students a useful book yesterday.', 'past', ['The teacher', 'gave', 'the students', 'a useful book', 'yesterday']],
  ['She gives him a new book today.', 'present', ['She', 'gives', 'him', 'a new book', 'today']],
  ['They sent the children small gifts.', 'past', ['They', 'sent', 'the children', 'small gifts']],
  ['My mother showed me a beautiful picture.', 'past', ['My mother', 'showed', 'me', 'a beautiful picture']],
  ['We lend our friends books.', 'present', ['We', 'lend', 'our friends', 'books']],
  ['The boys offer the teacher a gift.', 'present', ['The boys', 'offer', 'the teacher', 'a gift']],
  ['He offered her a pen.', 'past', ['He', 'offered', 'her', 'a pen']],
  ['I give you a toy.', 'present', ['I', 'give', 'you', 'a toy']],
  ['  The   teacher gave the teacher a book.  ', 'past', ['The   teacher', 'gave', 'the teacher', 'a book']],
  ['THE STUDENTS SHOW THE GIRL NEW BOOKS', 'present', ['THE STUDENTS', 'SHOW', 'THE GIRL', 'NEW BOOKS']],
];
for (const [input, tense, texts] of fixtures) test(`SVOO: ${input}`, () => {
  const r = analyzeSentence(input, 7);
  assert.equal(r.input, input); assert.equal(r.inputVersion, 7);
  assert.equal(r.status, 'complete'); assert.equal(r.pattern, 'SVOO');
  assert.equal(r.purpose, 'declarative'); assert.equal(r.complexity, 'simple'); assert.equal(r.tense, tense);
  const roots = r.nodes.filter(n => n.parentId === null);
  assert.deepEqual(roots.map(n => n.role), ['subject', 'verb', 'indirectObject', 'object', ...(texts.length === 5 ? ['adverbial'] : [])]);
  assert.deepEqual(roots.map(n => input.slice(n.ranges[0].start, n.ranges[0].end)), texts);
  let cursor = 0;
  for (let i = 0; i < texts.length; i++) {
    const start = input.indexOf(texts[i], cursor);
    assert.deepEqual(roots[i].ranges, [{ start, end: start + texts[i].length }]); cursor = start + texts[i].length;
    assert.ok(roots[i].explanation.length > 10); assert.equal(roots[i].ruleId, 'SVOO-001');
  }
  assert.deepEqual(r.corrections, []); validateAnalysisResult(r);
});

test('adjectives are nested, not competing top-level components', () => {
  const r = analyzeSentence(fixtures[0][0]);
  const attribute = r.nodes.find(n => n.role === 'attribute');
  const parent = r.nodes.find(n => n.id === attribute.parentId);
  assert.equal(parent.role, 'object'); assert.equal(r.input.slice(attribute.ranges[0].start, attribute.ranges[0].end), 'useful');
});

const boundaries = [
  ['', 'invalid'], ['   \n', 'invalid'], ['x'.repeat(1001), 'invalid'],
  ['She gave him a book. They gave me a pen.', 'invalid'],
  ['She gave him a book..', 'invalid'], ['She gave him a book. again', 'invalid'],
  ['The weather is beautiful today.', 'unsupported'], ['Does she give him a book, today?', 'unsupported'],
  ['Give me book.', 'unsupported'], ['What a useful book!', 'unsupported'],
  ['She gave him a mysterious book.', 'unsupported'], ['She gave him a book and a pen.', 'unsupported'],
  ['The teacher who smiled gave me a book.', 'unsupported'], ['A book was given to me.', 'unsupported'],
  ['She has given him a book.', 'unsupported'], ['She can give him a book.', 'unsupported'],
  ['She gave him a book 😀.', 'unsupported'], ['She gave him a book, today.', 'unsupported'],
  ['She gave her book.', 'unsupported'], ['She gave him an old book.', 'unsupported'],
  ['She gave him a old book.', 'unsupported'], ['She gave him this books.', 'unsupported'],
  ['She give him a book.', 'partial'], ['They gives him a book.', 'partial'],
  ['She gives him a book yesterday.', 'unsupported'],
];
for (const [input, status] of boundaries) test(`boundary: ${input.slice(0, 65) || '(empty)'}`, () => {
  const r = analyzeSentence(input);
  assert.equal(r.status, status); assert.equal(r.pattern, null);
  assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []);
  assert.ok(r.messages.length >= 2); validateAnalysisResult(r);
});

test('exact length limit is accepted, input is never truncated', () => {
  const input = 'She gave him a book.'.padEnd(1000, ' ');
  assert.equal(analyzeSentence(input).status, 'complete');
  assert.equal(analyzeSentence(input + ' ').status, 'invalid');
});
test('tokenizer retains UTF-16 offsets, spaces and repeated words', () => {
  const tokens = tokenize('😀  book book.');
  assert.deepEqual(tokens.map(t => [t.text, t.start, t.end]), [['😀', 0, 2], ['book', 4, 8], ['book', 9, 13], ['.', 13, 14]]);
});
test('dictionary is closed and has no inherited property lookups', () => {
  assert.ok(VOCABULARY.verbs.includes('gave'));
  assert.equal(analyzeSentence('constructor gave him a book.').status, 'unsupported');
});
function protocol() {
  return { input: 'Does she give him a useful book?', inputVersion: 2, ruleVersion: 'test-1',
    status: 'partial', purpose: 'interrogative', pattern: 'SVOO', complexity: 'simple', tense: 'present',
    messages: ['Protocol fixture only.'], corrections: [], nodes: [
      { id: 's', role: 'subject', parentId: null, ranges: [{ start: 5, end: 8 }], implicit: false, ruleId: 'fixture', explanation: 'subject' },
      { id: 'v', role: 'verb', parentId: null, ranges: [{ start: 0, end: 4 }, { start: 9, end: 13 }], implicit: false, ruleId: 'fixture', explanation: 'discontinuous verb' },
      { id: 'o', role: 'object', parentId: null, ranges: [{ start: 18, end: 31 }], implicit: false, ruleId: 'fixture', explanation: 'object phrase' },
      { id: 'a', role: 'attribute', parentId: 'o', ranges: [{ start: 20, end: 26 }], implicit: false, ruleId: 'fixture', explanation: 'nested adjective' },
      { id: 'i', role: 'subject', parentId: null, ranges: [], implicit: true, ruleId: 'fixture', explanation: 'implicit fixture' },
    ] };
}
test('protocol supports nesting, discontinuity, implicit nodes, insertion and deletion', () => {
  const r = protocol();
  r.corrections = [{ id: 'edit', ruleId: 'fixture', reason: 'fixture', context: 'protocol only', edits: [
    { range: { start: 0, end: 0 }, expected: '', replacement: 'Really ' },
    { range: { start: 20, end: 27 }, expected: 'useful ', replacement: '' },
  ] }];
  validateAnalysisResult(r);
});
const corruptions = {
  'missing metadata': r => { delete r.inputVersion; },
  'invalid status': r => { r.status = 'correct'; },
  'invalid role': r => { r.nodes[0].role = 'noun'; },
  'negative start': r => { r.nodes[0].ranges[0].start = -1; },
  'fractional offset': r => { r.nodes[0].ranges[0].start = 1.2; },
  'out of bounds': r => { r.nodes[0].ranges[0].end = 200; },
  'duplicate ID': r => { r.nodes[1].id = 's'; },
  'missing parent': r => { r.nodes[3].parentId = 'missing'; },
  'cycle': r => { r.nodes[2].parentId = 'o'; },
  'outside parent': r => { r.nodes[3].ranges[0].start = 0; },
  'implicit with range': r => { r.nodes[4].ranges = [{ start: 0, end: 4 }]; },
  'empty explicit node': r => { r.nodes[0].ranges = []; },
  'overlapping node intervals': r => { r.nodes[1].ranges[1].start = 2; },
  'unordered node intervals': r => { r.nodes[1].ranges.reverse(); },
  'overlapping siblings': r => { r.nodes[0].ranges = [{ start: 0, end: 4 }]; },
  'complete without nodes': r => { r.status = 'complete'; r.nodes = []; },
  'empty text interval': r => { r.nodes[0].ranges[0].end = 5; },
  'split surrogate': r => { r.input = '😀' + r.input; r.nodes[0].ranges = [{ start: 1, end: 4 }]; },
  'complete without classification': r => { r.status = 'complete'; r.pattern = null; },
};
for (const [name, corrupt] of Object.entries(corruptions)) test(`reject protocol: ${name}`, () => {
  const r = protocol(); corrupt(r); assert.throws(() => validateAnalysisResult(r), /分析数据无效/);
});
for (const [name, edits] of [
  ['original mismatch', [{ range: { start: 0, end: 4 }, expected: 'does', replacement: 'Did' }]],
  ['overlap', [{ range: { start: 0, end: 4 }, expected: 'Does', replacement: 'Did' }, { range: { start: 2, end: 4 }, expected: 'es', replacement: '' }]],
  ['same insertion', [{ range: { start: 0, end: 0 }, expected: '', replacement: 'A' }, { range: { start: 0, end: 0 }, expected: '', replacement: 'B' }]],
  ['no change', [{ range: { start: 0, end: 4 }, expected: 'Does', replacement: 'Does' }]],
]) test(`reject correction: ${name}`, () => {
  const r = protocol(); r.corrections = [{ id: 'x', ruleId: 'fixture', reason: 'fixture', context: 'fixture', edits }];
  assert.throws(() => validateAnalysisResult(r), /分析数据无效/);
});
