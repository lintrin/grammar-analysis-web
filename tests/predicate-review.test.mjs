import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSentence } from '../lib/grammar.ts';
import { checkPredicate, checkBoundary } from './helpers/predicate-fixtures.mjs';

const review = JSON.parse(readFileSync(new URL('./fixtures/predicate-review.json', import.meta.url), 'utf8'));
for (const fixture of review.fixtures) test(`predicate review ${fixture.id}`, () => {
  const result = checkPredicate(fixture);
  const agent = result.nodes.find(n => n.role === 'adverbial' && /by /i.test(result.input.slice(n.ranges[0].start, n.ranges[0].end)));
  assert.match(agent.explanation, /施事/);
});
for (const fixture of review.boundaries) test(`predicate review ${fixture.id}`, () => {
  checkBoundary(fixture);
  if (fixture.clauseIndex) assert.equal(analyzeSentence(fixture.input).reasons[0].clauseIndex, fixture.clauseIndex);
  if (fixture.errors) {
    const result = analyzeSentence(fixture.input);
    const ranges = fixture.errors.map(word => {
      const start = fixture.input.indexOf(word);
      return { start, end: start + word.length };
    });
    assert.deepEqual(result.reasons, [{ code: 'form-mismatch', ranges, ...(fixture.clauseIndex ? { clauseIndex: fixture.clauseIndex } : {}) }]);
  }
});
