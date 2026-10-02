import test from 'node:test';
import { development, distinctDevelopmentBoundaries, checkPredicate, checkBoundary } from './helpers/predicate-fixtures.mjs';
for (const fixture of development.fixtures.filter(f => f.stage === 14)) test(`stage 14 ${fixture.id}`, () => checkPredicate(fixture));
for (const fixture of distinctDevelopmentBoundaries.filter(f => f.stage === 14)) test(`stage 14 ${fixture.id}`, () => checkBoundary(fixture));

import assert from 'node:assert/strict';
import { analyzeSentence } from '../lib/grammar.ts';
test('stage 14 split predicate keeps repeated words, spaces, casing and noun attributes', () => {
  const input = '  WERE  the young teachers  giving  the teachers  a useful book  yesterday?  ';
  const result = analyzeSentence(input);
  assert.equal(result.status, 'complete'); assert.equal(result.purpose, 'interrogative');
  const verb = result.nodes.find(n => n.role === 'verb');
  assert.deepEqual(verb.ranges, [{start:2,end:6},{start:28,end:34}]);
  assert.deepEqual(result.nodes.filter(n => n.role === 'attribute').map(n => input.slice(n.ranges[0].start,n.ranges[0].end)), ['young','useful']);
  assert.equal(result.input, input);
});
