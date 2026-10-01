import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
const fixtures = [
  ['Does she sleep?', 'interrogative', 'SV', 'present', ['she', 'Does … sleep']],
  ['Do the boys like her?', 'interrogative', 'SVO', 'present', ['the boys', 'Do … like', 'her']],
  ['Did she give him a book yesterday?', 'interrogative', 'SVOO', 'past', ['she', 'Did … give', 'him', 'a book', 'yesterday']],
  ['Does she find the book useful?', 'interrogative', 'SVOC', 'present', ['she', 'Does … find', 'the book', 'useful']],
  ['Is the book useful?', 'interrogative', 'SVC', 'present', ['the book', 'Is', 'useful']],
  ['Were the children good yesterday?', 'interrogative', 'SVC', 'past', ['the children', 'Were', 'good', 'yesterday']],
  ['Am I a teacher?', 'interrogative', 'SVC', 'present', ['I', 'Am', 'a teacher']],
  ['Sleep.', 'imperative', 'SV', null, ['(you)', 'Sleep']],
  ['Enjoy the useful book!', 'imperative', 'SVO', null, ['(you)', 'Enjoy', 'the useful book']],
  ['Give me a book.', 'imperative', 'SVOO', null, ['(you)', 'Give', 'me', 'a book']],
  ['Find the book useful.', 'imperative', 'SVOC', null, ['(you)', 'Find', 'the book', 'useful']],
  ['Be kind.', 'imperative', 'SVC', null, ['(you)', 'Be', 'kind']],
  ['How kind she is!', 'exclamatory', 'SVC', 'present', ['she', 'is', 'How kind']],
  ['How useful the book was!', 'exclamatory', 'SVC', 'past', ['the book', 'was', 'How useful']],
  ['What a beautiful picture it is!', 'exclamatory', 'SVC', 'present', ['it', 'is', 'What a beautiful picture']],
  ['What good teachers they were!', 'exclamatory', 'SVC', 'past', ['they', 'were', 'What good teachers']],
];
for (const [input, purpose, pattern, tense, segments] of fixtures) test(`${purpose}: ${input}`, () => {
  const r = analyzeSentence(input, 3);
  assert.equal(r.status, 'complete'); assert.equal(r.purpose, purpose); assert.equal(r.pattern, pattern); assert.equal(r.tense, tense);
  assert.equal(r.inputVersion, 3); assert.equal(r.complexity, 'simple');
  const roots = r.nodes.filter(n => !n.parentId);
  const expectedRoles = { SV: ['subject', 'verb'], SVO: ['subject', 'verb', 'object'], SVC: ['subject', 'verb', 'complement'], SVOO: ['subject', 'verb', 'indirectObject', 'object'], SVOC: ['subject', 'verb', 'object', 'complement'] };
  assert.deepEqual(roots.map(n => n.role), [...expectedRoles[pattern], ...(segments.length > expectedRoles[pattern].length ? ['adverbial'] : [])]);
  assert.deepEqual(roots.map(n => n.implicit ? '(you)' : n.ranges.map(q => input.slice(q.start, q.end)).join(' … ')), segments);
  for (const node of r.nodes) {
    assert.ok(node.explanation.length > 10);
    assert.ok(node.ruleId.length > 0);
    for (const q of node.ranges) assert.ok(q.end > q.start && q.end <= input.length);
  }
  assert.deepEqual(r.corrections, []); validateAnalysisResult(r);
});
for (const input of ['Do she sleep?', 'Does they like him?', 'Did she gave him a book?', 'Does she sleeps?', 'Is the boys good?', 'Were I kind?', 'How kind she are!', 'What a book they is!']) test(`partial: ${input}`, () => {
  const r = analyzeSentence(input); assert.equal(r.status, 'partial'); assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []);
});
for (const input of ['She sleeps?', 'Does she sleep.', 'Is she kind!', 'How kind she is?', 'What a book!', 'How kind!', 'Be him.', 'Sleeps.', 'Did she can sleep?', 'Does she sleep yesterday?', 'Do sleep.', 'What she is!', 'How she likes books!', 'What a old book it is!', 'Give me a book?', 'She likes books!', 'Does she sleep? She smiles.']) test(`scope: ${input}`, () => {
  const r = analyzeSentence(input); assert.notEqual(r.status, 'complete'); assert.deepEqual(r.nodes, []);
});
test('omitted final punctuation is allowed; punctuation alone does not choose purpose', () => {
  for (const [input, purpose] of [['Does she sleep', 'interrogative'], ['Be kind', 'imperative'], ['How kind she is', 'exclamatory']]) assert.equal(analyzeSentence(input).purpose, purpose);
});
test('question keeps whitespace and exact discontinuous verb intervals', () => {
  const r = analyzeSentence('  DOES  THE YOUNG TEACHER GIVE ME A BOOK?  ');
  assert.equal(r.status, 'complete');
  assert.deepEqual(r.nodes.find(n => n.role === 'verb').ranges, [{ start: 2, end: 6 }, { start: 26, end: 30 }]);
  assert.equal(r.nodes.find(n => n.role === 'attribute').parentId, r.nodes.find(n => n.role === 'subject').id);
});
test('imperative has no fabricated subject interval; exclamatory modifiers belong inside complement', () => {
  assert.deepEqual(analyzeSentence('Be kind.').nodes.find(n => n.role === 'subject').ranges, []);
  const r = analyzeSentence('What a useful book it is!');
  const complement = r.nodes.find(n => n.role === 'complement');
  assert.deepEqual(r.nodes.filter(n => n.role === 'attribute').map(n => [r.input.slice(n.ranges[0].start, n.ranges[0].end), n.parentId]), [['useful', complement.id], ['What', complement.id]]);
});

for (const determiner of ['the', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that']) {
  test(`What rejects definite singular phrase: ${determiner}`, () => {
    const r = analyzeSentence(`What ${determiner} useful book it is!`);
    assert.equal(r.status, 'unsupported'); assert.equal(r.purpose, null);
    assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []);
    // Ordinary declarative noun phrases retain these determiners.
    assert.equal(analyzeSentence(`It is ${determiner} useful book.`).status, 'complete');
  });
}
for (const determiner of ['the', 'my', 'your', 'his', 'her', 'our', 'their', 'these', 'those']) {
  test(`What rejects definite plural phrase: ${determiner}`, () => {
    const r = analyzeSentence(`What ${determiner} useful books they are!`);
    assert.equal(r.status, 'unsupported'); assert.deepEqual(r.nodes, []);
    assert.equal(analyzeSentence(`They are ${determiner} useful books.`).status, 'complete');
  });
}
for (const input of ['What a useful book it is!', 'What useful books they are!', 'What books they were!', '  WHAT A GOOD BOOK IT IS!  ']) {
  test(`What preserves supported indefinite phrase: ${input}`, () => {
    const r = analyzeSentence(input);
    assert.equal(r.status, 'complete'); assert.equal(r.purpose, 'exclamatory'); assert.equal(r.pattern, 'SVC');
    const complement = r.nodes.find(n => n.role === 'complement');
    const start = input.toLowerCase().indexOf('what');
    const end = input.toLowerCase().indexOf('book') + (input.toLowerCase().includes('books') ? 5 : 4);
    assert.deepEqual(complement.ranges, [{ start, end }]);
    validateAnalysisResult(r);
  });
}
for (const input of ['What book it is!', 'What a books they are!', 'What an old book it is!']) test(`What keeps existing noun restrictions: ${input}`, () => {
  assert.equal(analyzeSentence(input).status, 'unsupported');
});
