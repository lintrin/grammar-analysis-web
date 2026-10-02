import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSentence, applyCorrection, validateAnalysisResult } from '../lib/grammar.ts';
import { compare } from './helpers/stage8-fixtures.mjs';
const plan = JSON.parse(readFileSync(new URL('./fixtures/stage8.json', import.meta.url), 'utf8'));
for (const { id, input, expected, afterApply } of plan.fixtures) {
  test(`stage 8 fixed expectation: ${id}`, () => {
    const r = analyzeSentence(input, 7);
    compare(input, expected, r); validateAnalysisResult(r);
    if (afterApply) {
      const next = applyCorrection(r, r.corrections[0].id, input, 7);
      assert.equal(next, afterApply.input);
      compare(next, afterApply, analyzeSentence(next, 8));
      assert.throws(() => applyCorrection(r, r.corrections[0].id, next, 8), /过期/);
    }
  });
}
