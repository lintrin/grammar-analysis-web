import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, applyCorrection, validateAnalysisResult } from '../lib/grammar.ts';

// Expectations fixed independently, for interactions not covered by the stage 7 manifest.
test('negative double error requires fresh analysis after each edit', () => {
  const input = 'She do not gives her a book.';
  const r = analyzeSentence(input, 3);
  assert.equal(r.status, 'partial'); assert.deepEqual(r.nodes, []);
  assert.deepEqual(r.corrections.map(c => c.ruleId), ['AGREEMENT-001', 'DO-BASE-001']);
  const next = applyCorrection(r, r.corrections[0].id, input, 3);
  assert.equal(next, 'She does not gives her a book.');
  assert.throws(() => applyCorrection(r, r.corrections[1].id, next, 4), /过期/);
  const updated = analyzeSentence(next, 4);
  assert.equal(updated.corrections.length, 1);
  const fixed = applyCorrection(updated, updated.corrections[0].id, next, 4);
  assert.equal(fixed, 'She does not give her a book.');
  assert.equal(analyzeSentence(fixed, 5).status, 'complete');
});
test('negative edits preserve capitals, repeated spaces and terminal punctuation', () => {
  const input = '  SHE  DO NOT GO TO SCHOOL.  ', r = analyzeSentence(input, 2);
  assert.deepEqual(r.corrections[0].edits, [{ range: { start: 7, end: 9 }, expected: 'DO', replacement: 'DOES' }]);
  const fixed = applyCorrection(r, r.corrections[0].id, input, 2);
  assert.equal(fixed, '  SHE  DOES NOT GO TO SCHOOL.  ');
  assert.equal(analyzeSentence(fixed).status, 'complete');
  assert.throws(() => applyCorrection(r, r.corrections[0].id, input, 3), /过期/);
  assert.throws(() => applyCorrection({ ...r, ruleVersion: '0.4.0' }, r.corrections[0].id, input, 2), /过期/);
});
test('can question retains repeated nouns and disjoint raw intervals', () => {
  const input = '  CAN  THE OLD TEACHER GIVE THE TEACHER AN OLD BOOK?  ';
  const r = analyzeSentence(input);
  assert.equal(r.status, 'complete'); assert.equal(r.purpose, 'interrogative'); assert.equal(r.tense, null);
  assert.deepEqual(r.nodes.filter(n => n.parentId === null).map(n => [n.role, n.ranges.map(q => input.slice(q.start, q.end))]), [
    ['subject', ['THE OLD TEACHER']], ['verb', ['CAN', 'GIVE']], ['indirectObject', ['THE TEACHER']], ['object', ['AN OLD BOOK']],
  ]);
  assert.deepEqual(r.nodes.find(n => n.role === 'verb').ranges, [{ start: 2, end: 5 }, { start: 23, end: 27 }]);
  for (const n of r.nodes.filter(n => n.role === 'attribute')) assert.ok(r.nodes.find(p => p.id === n.parentId).ranges.some(p => p.start <= n.ranges[0].start && p.end >= n.ranges[0].end));
  validateAnalysisResult(r);
});
for (const [input, pattern, tense] of [
  ['She does not see it.', 'SVO', 'present'], ['Can she be an old teacher?', 'SVC', null],
  ['We can not find it useful.', 'SVOC', null], ['The teacher does not give the teacher an old book.', 'SVOO', 'present'],
  ['An old useful book is good.', 'SVC', 'present'], ['A useful old book is good.', 'SVC', 'present'],
  ['Does she find it useful?', 'SVOC', 'present'], ['She did not sleep yesterday.', 'SV', 'past'],
  ['She was not kind yesterday.', 'SVC', 'past'], ['Can she sleep', 'SV', null],
]) test(`expanded composition: ${input}`, () => {
  const r = analyzeSentence(input); assert.equal(r.status, 'complete'); assert.equal(r.pattern, pattern); assert.equal(r.tense, tense);
  assert.deepEqual(r.corrections, []); validateAnalysisResult(r);
});
for (const input of [
  'She do not sleeps yesterday.', 'She can not goes yesterday.', 'Can she goes yesterday?',
  'She do not sees unknown.', 'She can not gives him book.', 'Can she gives him book?',
  'She do not sleeps?', 'Can she sleeps.', 'She do not not sleep.', 'Can can she sleep?',
  'She does not can sleep.', 'She can not does sleep.', 'She is not do sleep.', 'Is she not kind?',
  'Does she not sleep?', 'She does not be kind.', 'She do not like him a book.',
  'She sees they.', 'She can not give it a book.', 'Can she give him it?', 'It is an useful old book.',
  'It is a old useful book.', 'What an useful book it is!', 'She can not go to school today.',
]) test(`no unsafe expanded analysis or suggestion: ${input}`, () => {
  const r = analyzeSentence(input); assert.equal(r.status, 'unsupported'); assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []);
});
test('negative parse handles the input limit without losing positions', () => {
  const input = ('She does not give him an ' + 'old '.repeat(220) + 'book.').padEnd(1000, ' ');
  assert.equal(input.length, 1000);
  const r = analyzeSentence(input);
  assert.equal(r.status, 'complete'); assert.equal(r.pattern, 'SVOO');
  assert.equal(r.nodes.filter(n => n.role === 'attribute').length, 220);
  validateAnalysisResult(r);
  assert.equal(analyzeSentence(input + ' ').status, 'invalid');
});
