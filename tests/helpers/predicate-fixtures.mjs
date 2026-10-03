import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSentence, validateAnalysisResult } from '../../lib/grammar.ts';
import { expectedStage12 } from './stage12-fixtures.mjs';
import { compareStage9 } from './stage9-fixtures.mjs';
import { compareLexiconExpectation } from './lexicon-expectations.mjs';
export const development = JSON.parse(readFileSync(new URL('../fixtures/predicate-development.json', import.meta.url), 'utf8'));
// Keep historical stage labels in the manifest; run identical boundary answers once.
// Compare every answer field so a changed expectation receives its own regression.
const boundaryAnswers = new Set();
export const distinctDevelopmentBoundaries = development.boundaries.filter(({ id, stage, ...answer }) => {
  void id; void stage;
  const key = JSON.stringify(Object.fromEntries(Object.entries(answer).sort(([a], [b]) => a.localeCompare(b))));
  if (boundaryAnswers.has(key)) return false;
  boundaryAnswers.add(key);
  return true;
});
export function checkPredicate(fixture) {
  const expected = expectedStage12(fixture);
  const result = analyzeSentence(fixture.input, 23);
  compareStage9(expected, result);
  assert.equal(result.inputVersion, 23); assert.deepEqual(result.reasons, []);
  for (const node of result.nodes) assert.ok(node.explanation.length > 10, `${fixture.id}: explanation`);
  for (const node of result.nodes.filter(n => n.role === 'verb')) {
    assert.match(node.explanation, /谓语|动词/);
    if (fixture.category.includes('passive') || fixture.category === 'passive') assert.match(node.explanation, /被动|动词/);
  }
  validateAnalysisResult(result);
  return result;
}
export function checkBoundary(fixture) {
  const result = analyzeSentence(fixture.input);
  if (fixture.expected) {
    compareLexiconExpectation(fixture.expected, result);
    validateAnalysisResult(result);
    return;
  }
  assert.equal(result.status, fixture.status, fixture.input);
  assert.equal(result.reasons[0].code, fixture.code, fixture.input);
  for (const field of ['purpose','pattern','complexity','tense','aspect','voice']) assert.equal(result[field], null, `${fixture.input}: ${field}`);
  assert.deepEqual(result.nodes, []); assert.deepEqual(result.corrections, []);
  validateAnalysisResult(result);
}
