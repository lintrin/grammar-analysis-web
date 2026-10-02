import test from 'node:test';
import { development, checkPredicate, checkBoundary } from './helpers/predicate-fixtures.mjs';
for (const fixture of development.fixtures.filter(f => f.stage === 16)) test(`stage 16 ${fixture.id}`, () => checkPredicate(fixture));
for (const fixture of development.boundaries.filter(f => f.stage === 16)) test(`stage 16 ${fixture.id}`, () => checkBoundary(fixture));

import assert from 'node:assert/strict';
import { analyzeSentence } from '../lib/grammar.ts';
import { adjectives } from '../lib/grammar/vocabulary.ts';
test('stage 16 passive transformations retain lexical-frame explanations and agent attributes', () => {
  const result = analyzeSentence('The useful book was given to the young girl by the kind teacher.');
  assert.equal(result.status, 'complete'); assert.equal(result.pattern, 'SV'); assert.equal(result.voice, 'passive');
  assert.match(result.nodes.find(n => n.role === 'subject').explanation, /SVOO.*原宾语.*SV/);
  assert.deepEqual(result.nodes.filter(n => n.role === 'adverbial').map(n => result.input.slice(n.ranges[0].start,n.ranges[0].end)), ['to the young girl','by the kind teacher']);
  for (const node of result.nodes.filter(n => n.role === 'attribute')) assert.ok(result.nodes.find(n => n.id === node.parentId));
});
test('stage 16 unresolved participle/adjective overlap is ambiguous without edits', () => {
  adjectives.add('seen');
  try {
    const result = analyzeSentence('It is seen.');
    assert.equal(result.status, 'ambiguous'); assert.equal(result.reasons[0].code, 'ambiguous');
    assert.deepEqual(result.nodes, []); assert.deepEqual(result.corrections, []);
  } finally { adjectives.delete('seen'); }
});
