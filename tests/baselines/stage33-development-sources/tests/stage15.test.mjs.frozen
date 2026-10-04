import test from 'node:test';
import { development, distinctDevelopmentBoundaries, checkPredicate, checkBoundary } from './helpers/predicate-fixtures.mjs';
for (const fixture of development.fixtures.filter(f => f.stage === 15)) test(`stage 15 ${fixture.id}`, () => checkPredicate(fixture));
for (const fixture of distinctDevelopmentBoundaries.filter(f => f.stage === 15)) test(`stage 15 ${fixture.id}`, () => checkBoundary(fixture));

import assert from 'node:assert/strict';
import { analyzeSentence } from '../lib/grammar.ts';
test('stage 15 perfect copula questions and negatives preserve the entire predicate', () => {
  const question = analyzeSentence('Had the young teacher been a good mother?');
  assert.equal(question.status, 'complete'); assert.equal(question.pattern, 'SVC'); assert.equal(question.aspect, 'perfect');
  assert.deepEqual(question.nodes.find(n => n.role === 'verb').ranges, [{start:0,end:3},{start:22,end:26}]);
  const negative = analyzeSentence('I have not been kind.');
  assert.equal(negative.status, 'complete'); assert.equal(negative.pattern, 'SVC');
  const range = negative.nodes.find(n => n.role === 'verb').ranges[0];
  assert.equal(negative.input.slice(range.start, range.end), 'have not been');
});
