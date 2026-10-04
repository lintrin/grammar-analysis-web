import { migratedBehavior } from "./helpers/classification-migration.mjs";
import test from 'node:test';
import { checkHistoricalIndependence } from './helpers/historical-independence.mjs';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
import { compareStage9 } from './helpers/stage9-fixtures.mjs';
import { stage12, expectedStage12 } from './helpers/stage12-fixtures.mjs';
import { compareLexiconExpectation } from './helpers/lexicon-expectations.mjs';

test('stage 12 uses 40 new in-scope inputs and 20 new contrasts after completion of the rules', () => {
  assert.equal(stage12.fixtures.length, 40);
  assert.equal(stage12.boundaries.length, 20);
  assert.equal(new Set(stage12.fixtures.map(f => f.id)).size, 40);
  for (const group of ['simple', 'compound', 'because', 'if']) assert.equal(stage12.fixtures.filter(f => f.group === group).length, 10);
  checkHistoricalIndependence([...stage12.fixtures, ...stage12.boundaries], 12);
});

for (const f of stage12.fixtures) test(`stage 12 independent ${f.id}: ${f.input}`, () => {
  const expected = expectedStage12(f); // Translate fixed answers before analyzing.
  const result = analyzeSentence(f.input);
  compareStage9(expected, result);
  assert.deepEqual(result.reasons, []);
  validateAnalysisResult(result);
});
for (const f of stage12.boundaries) test(`stage 12 independent contrast: ${f.input}`, () => {
  const result = analyzeSentence(f.input);
  if (migratedBehavior(f.input)) compareLexiconExpectation(migratedBehavior(f.input).expected,result);
  else if (f.expected) compareLexiconExpectation(f.expected, result);
  else {
    assert.equal(result.status, f.status);
    if (f.status === 'complete') compareStage9(expectedStage12(f), result);
    else { assert.equal(result.reasons[0].code, f.code); assert.deepEqual(result.nodes, []); }
  }
  assert.deepEqual(result.corrections, []);
  validateAnalysisResult(result);
});
