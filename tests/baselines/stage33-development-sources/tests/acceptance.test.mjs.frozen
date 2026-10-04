import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
// Additional sentences chosen after rules were finished, before running acceptance.
// These inputs were not used to implement the rules; expected answers are handwritten.
const fixtures = [
  ['My father sleeps today.', 'SV', 'declarative', 'present', ['My father', 'sleeps', 'today']],
  ['The young girls ran.', 'SV', 'declarative', 'past', ['The young girls', 'ran']],
  ['Our friend goes to school.', 'SV', 'declarative', 'present', ['Our friend', 'goes', 'to school']],
  ['The teachers can smile.', 'SV', 'declarative', null, ['The teachers', 'can … smile']],
  ['The small boy enjoys toys.', 'SVO', 'declarative', 'present', ['The small boy', 'enjoys', 'toys']],
  ['My mother saw the beautiful pictures.', 'SVO', 'declarative', 'past', ['My mother', 'saw', 'the beautiful pictures']],
  ['Did the children enjoy the new gifts?', 'SVO', 'interrogative', 'past', ['the children', 'Did … enjoy', 'the new gifts']],
  ['They can see the good teacher.', 'SVO', 'declarative', null, ['They', 'can … see', 'the good teacher']],
  ['Our teachers were kind.', 'SVC', 'declarative', 'past', ['Our teachers', 'were', 'kind']],
  ['Is your father a teacher?', 'SVC', 'interrogative', 'present', ['your father', 'Is', 'a teacher']],
  ['How big the gifts are!', 'SVC', 'exclamatory', 'present', ['the gifts', 'are', 'How big']],
  ['What young boys they are!', 'SVC', 'exclamatory', 'present', ['they', 'are', 'What young boys']],
  ['The good girl sends her father a letter.', 'SVOO', 'declarative', 'present', ['The good girl', 'sends', 'her father', 'a letter']],
  ['Our mothers lent the students pens.', 'SVOO', 'declarative', 'past', ['Our mothers', 'lent', 'the students', 'pens']],
  ['Does your teacher offer the boys books?', 'SVOO', 'interrogative', 'present', ['your teacher', 'Does … offer', 'the boys', 'books']],
  ['Show the children a small toy.', 'SVOO', 'imperative', null, ['(you)', 'Show', 'the children', 'a small toy']],
  ['The teachers make the children good.', 'SVOC', 'declarative', 'present', ['The teachers', 'make', 'the children', 'good']],
  ['My father found the gifts beautiful.', 'SVOC', 'declarative', 'past', ['My father', 'found', 'the gifts', 'beautiful']],
  ['Do the students find the old book useful?', 'SVOC', 'interrogative', 'present', ['the students', 'Do … find', 'the old book', 'useful']],
  ['She can make the small toy big.', 'SVOC', 'declarative', null, ['She', 'can … make', 'the small toy', 'big']],
];
const roles = { SV: ['subject', 'verb'], SVO: ['subject', 'verb', 'object'], SVC: ['subject', 'verb', 'complement'], SVOO: ['subject', 'verb', 'indirectObject', 'object'], SVOC: ['subject', 'verb', 'object', 'complement'] };
for (const [input, pattern, purpose, tense, segments] of fixtures) test(`additional acceptance: ${input}`, () => {
  const r = analyzeSentence(input);
  assert.equal(r.status, 'complete'); assert.equal(r.pattern, pattern); assert.equal(r.purpose, purpose); assert.equal(r.tense, tense);
  assert.deepEqual(r.corrections, []);
  const roots = r.nodes.filter(n => n.parentId === null);
  assert.deepEqual(roots.map(n => n.role), [...roles[pattern], ...(segments.length > roles[pattern].length ? ['adverbial'] : [])]);
  assert.deepEqual(roots.map(n => n.implicit ? '(you)' : n.ranges.map(q => input.slice(q.start, q.end)).join(' … ')), segments);
  for (const node of r.nodes) assert.ok(node.explanation.length > 10);
  validateAnalysisResult(r);
});
