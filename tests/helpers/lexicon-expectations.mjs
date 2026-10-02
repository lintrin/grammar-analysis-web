import assert from 'node:assert/strict';
import { validateAnalysisResult } from '../../lib/grammar/protocol.ts';
import { compareStage9 } from './stage9-fixtures.mjs';

// Translate hand-fixed grammatical expectations for protocol validation only.
// This helper neither tokenizes sentences nor calls the analyzer.
export function validateLexiconExpectation(input, expected) {
  assert.ok(Object.hasOwn(expected, 'reasons'));
  assert.ok(Object.hasOwn(expected, 'corrections'));
  for (const field of ['status', 'purpose', 'pattern', 'complexity', 'tense', 'aspect', 'voice', 'nodes']) assert.ok(Object.hasOwn(expected, field), `Missing ${field}`);
  const result = {
    ...expected, input, inputVersion: 0, ruleVersion: 'future-expectation', messages: ['人工固定的未来语法答案'],
    nodes: expected.nodes.map(node => ({ ...node, id: node.key, parentId: node.parentKey, ruleId: 'HUMAN-EXPECTED', explanation: '人工固定的角色、原文位置和层级关系' })),
    corrections: expected.corrections.map((correction, index) => ({ ...correction, id: `fixed-${index}`, reason: '人工固定的唯一形式替换', context: input })),
  };
  validateAnalysisResult(result);
  for (const correction of result.corrections) for (const edit of correction.edits) assert.equal(input.slice(edit.range.start, edit.range.end), edit.expected);
  return result;
}

export function compareLexiconExpectation(expected, result) {
  // Preserve all classification, exact range, ownership and edit assertions.
  compareStage9({ ...expected, corrections: [] }, { ...result, corrections: [] });
  assert.deepEqual(result.reasons, expected.reasons);
  assert.deepEqual(result.corrections.map(({ ruleId, edits }) => ({ ruleId, edits })), expected.corrections);
}
