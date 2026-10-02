import { analyzeSentence, RULE_VERSION } from '../lib/grammar.ts';
import { compareStage9 } from '../tests/helpers/stage9-fixtures.mjs';
import { stage12, expectedStage12 } from '../tests/helpers/stage12-fixtures.mjs';
import assert from 'node:assert/strict';
const groups = Object.fromEntries(['simple', 'compound', 'because', 'if'].map(group => [group, { correct: 0, misclassified: 0, unrecognized: 0 }]));
const failures = [];
for (const f of stage12.fixtures) {
  const expected = expectedStage12(f);
  const result = analyzeSentence(f.input);
  if (result.status !== 'complete') { groups[f.group].unrecognized++; failures.push(`${f.id}: ${result.status}`); continue; }
  try { compareStage9(expected, result); assert.deepEqual(result.reasons, []); groups[f.group].correct++; }
  catch (error) { groups[f.group].misclassified++; failures.push(`${f.id}: ${error.message}`); }
}
let rejected = 0;
for (const f of stage12.boundaries) {
  const r = analyzeSentence(f.input);
  try {
    assert.equal(r.status, f.status); assert.equal(r.reasons[0].code, f.code);
    assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []); rejected++;
  } catch (error) { failures.push(`${f.input}: ${error.message}`); }
}
console.log(JSON.stringify({ ruleVersion: RULE_VERSION, groups, contrasts: { total: stage12.boundaries.length, matched: rejected }, failures }, null, 2));
if (failures.length) process.exitCode = 1;
