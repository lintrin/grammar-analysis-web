import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';

// Human-declared expected segments, before adding the new rules.
const fixtures = [
  ['SV', 'present', 'She sleeps.', ['She', 'sleeps']],
  ['SV', 'past', 'The children smiled yesterday.', ['The children', 'smiled', 'yesterday']],
  ['SV', 'present', 'I run today.', ['I', 'run', 'today']],
  ['SV', 'past', 'My father slept.', ['My father', 'slept']],
  ['SV', 'present', 'The young boys smile.', ['The young boys', 'smile']],
  ['SVO', 'present', 'She likes him.', ['She', 'likes', 'him']],
  ['SVO', 'past', 'We liked the useful book.', ['We', 'liked', 'the useful book']],
  ['SVO', 'present', 'The teacher enjoys books today.', ['The teacher', 'enjoys', 'books', 'today']],
  ['SVO', 'past', 'They saw the children yesterday.', ['They', 'saw', 'the children', 'yesterday']],
  ['SVO', 'present', 'I see her.', ['I', 'see', 'her']],
  ['SVC', 'present', 'I am kind.', ['I', 'am', 'kind']],
  ['SVC', 'present', 'The teachers are good.', ['The teachers', 'are', 'good']],
  ['SVC', 'past', 'She was a young teacher.', ['She', 'was', 'a young teacher']],
  ['SVC', 'past', 'You were kind yesterday.', ['You', 'were', 'kind', 'yesterday']],
  ['SVC', 'present', 'The book is useful.', ['The book', 'is', 'useful']],
  ['SVOC', 'present', 'She makes him kind.', ['She', 'makes', 'him', 'kind']],
  ['SVOC', 'past', 'We found the book useful.', ['We', 'found', 'the book', 'useful']],
  ['SVOC', 'present', 'The boys find her kind.', ['The boys', 'find', 'her', 'kind']],
  ['SVOC', 'past', 'My teacher made the children good.', ['My teacher', 'made', 'the children', 'good']],
  ['SVOC', 'present', 'I find the new picture beautiful today.', ['I', 'find', 'the new picture', 'beautiful', 'today']],
];
const roles = { SV: ['subject', 'verb'], SVO: ['subject', 'verb', 'object'], SVC: ['subject', 'verb', 'complement'], SVOC: ['subject', 'verb', 'object', 'complement'] };
for (const [pattern, tense, input, segments] of fixtures) test(`${pattern}: ${input}`, () => {
  const r = analyzeSentence(input, 5);
  assert.equal(r.status, 'complete'); assert.equal(r.pattern, pattern); assert.equal(r.tense, tense);
  assert.equal(r.purpose, 'declarative'); assert.equal(r.complexity, 'simple'); assert.equal(r.inputVersion, 5);
  const roots = r.nodes.filter(n => n.parentId === null);
  assert.deepEqual(roots.map(n => n.role), [...roles[pattern], ...(segments.length > roles[pattern].length ? ['adverbial'] : [])]);
  let cursor = 0;
  for (const [i, segment] of segments.entries()) {
    const start = input.indexOf(segment, cursor); cursor = start + segment.length;
    assert.deepEqual(roots[i].ranges, [{ start, end: cursor }]);
    assert.equal(roots[i].ruleId, `${pattern}-001`); assert.ok(roots[i].explanation.length > 10);
  }
  for (const node of r.nodes.filter(n => n.role === 'attribute')) {
    assert.ok(r.nodes.some(parent => parent.id === node.parentId));
    assert.ok(node.explanation.includes('修饰'));
  }
  assert.deepEqual(r.corrections, []); validateAnalysisResult(r);
});
for (const input of ['She sleep.', 'They sleeps.', 'I is kind.', 'You was kind.', 'The boys is good.', 'She am kind.', 'We enjoys books.', 'She make him good.']) test(`agreement: ${input}`, () => {
  const r = analyzeSentence(input); assert.equal(r.status, 'partial'); assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []);
});
for (const input of ['She sleeps books.', 'She likes.', 'She enjoys him a book.', 'She is him.', 'She makes him a teacher.', 'She finds him.', 'She is very kind.', 'She is good kind.', 'She runs yesterday.', 'She gave her book.', 'The weather is beautiful today.', 'Does she sleep, today?', 'Sleeps.', 'How kind she is?', 'She slept and smiled.']) test(`unsupported: ${input}`, () => {
  assert.equal(analyzeSentence(input).status, 'unsupported');
});
test('new structures preserve spacing, capitalization and nested noun attributes', () => {
  const input = '  THE   YOUNG TEACHER FOUND THE SMALL BOOK USEFUL.  ';
  const r = analyzeSentence(input); assert.equal(r.status, 'complete'); assert.equal(r.input, input);
  assert.deepEqual(r.nodes.filter(n => n.role === 'attribute').map(n => input.slice(n.ranges[0].start, n.ranges[0].end)), ['YOUNG', 'SMALL']);
});
