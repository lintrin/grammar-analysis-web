import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
import { createBoundaryBudget } from '../lib/grammar/context.ts';
import { performanceCases, instrumentBoundaries, exhaustedCases } from './helpers/stage12-performance.mjs';

for (const f of performanceCases) test(`stage 12 input limit and boundaries: ${f.id}`, () => {
  assert.equal(f.input.length, 1000);
  const result = analyzeSentence(f.input);
  assert.equal(result.status, f.status);
  assert.deepEqual(result.corrections, []);
  validateAnalysisResult(result);
  const { result: instrumented, accepted } = instrumentBoundaries(f.input);
  assert.deepEqual(instrumented.nodes, result.nodes);
  assert.deepEqual(instrumented.reasons, result.reasons);
  assert.equal(instrumented.status, result.status);
  assert.ok(accepted <= 4000);
  const tooLong = analyzeSentence(f.input + ' ');
  assert.equal(tooLong.status, 'invalid');
  assert.equal(tooLong.reasons[0].code, 'invalid-input');
});
for (const f of exhaustedCases) test(`stage 12 controlled budget stops without partial nodes: ${f.input}`, () => {
  const { result, attempts, accepted } = instrumentBoundaries(f.input, f.limit);
  assert.equal(result.status, 'unsupported');
  assert.equal(result.reasons[0].code, 'budget-exceeded');
  if (f.clauseIndex) assert.equal(result.reasons[0].clauseIndex, f.clauseIndex);
  assert.deepEqual(result.nodes, []); assert.deepEqual(result.corrections, []);
  assert.equal(accepted, f.limit); assert.equal(attempts, f.limit + 1);
});
test('stage 12 production budget accepts exactly 4000 boundaries and permanently refuses further work', () => {
  const consume = createBoundaryBudget();
  for (let i = 0; i < 4000; i++) assert.equal(consume(), true);
  assert.equal(consume(), false); assert.equal(consume(), false);
});
