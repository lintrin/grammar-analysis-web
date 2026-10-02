import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
import { stage9, compareStage9 } from '../tests/helpers/stage9-fixtures.mjs';
const ids = new Set();
for (const { id, input, expected } of stage9.fixtures) {
  assert.ok(!ids.has(id)); ids.add(id);
  const answer = { ...expected, input, inputVersion: 0, ruleVersion: stage9.targetRuleVersion,
    messages: ['Hand-authored expectation'], nodes: expected.nodes.map(n => ({ ...n, id: n.key, parentId: n.parentKey, ruleId: 'FIXTURE', explanation: 'Hand-authored classification and range' })) };
  validateAnalysisResult(answer);
  if (process.argv.includes('--implemented')) compareStage9(expected, analyzeSentence(input));
}
assert.ok(stage9.fixtures.filter(f => f.expected.status === 'complete').length >= 12);
assert.ok(stage9.fixtures.filter(f => f.expected.status !== 'complete').length >= 12);
console.log(`${process.argv.includes('--implemented') ? 'Grammar acceptance' : 'Fixture integrity only'}: ${ids.size} stage 9 fixtures.`);
