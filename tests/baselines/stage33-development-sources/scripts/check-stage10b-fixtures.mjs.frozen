import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
import { stage10b, compareStage10b } from '../tests/helpers/stage10b-fixtures.mjs';
const ids = new Set();
for (const { id, input, expected } of stage10b.fixtures) {
  assert.ok(!ids.has(id)); ids.add(id);
  const answer = { ...expected, input, inputVersion: 0, ruleVersion: stage10b.targetRuleVersion,
    messages: ['Hand-authored expectation'], nodes: expected.nodes.map(n => ({ ...n, id: n.key, parentId: n.parentKey, ruleId: 'FIXTURE', explanation: 'Hand-authored classification and range' })) };
  validateAnalysisResult(answer);
  if (process.argv.includes('--implemented')) compareStage10b(expected, analyzeSentence(input));
}
assert.ok(stage10b.fixtures.filter(f => f.expected.status === 'complete').length >= 10);
assert.ok(stage10b.fixtures.filter(f => f.expected.status !== 'complete').length >= 10);
console.log(`${process.argv.includes('--implemented') ? 'Grammar acceptance' : 'Fixture integrity only'}: ${ids.size} stage 10B fixtures.`);
