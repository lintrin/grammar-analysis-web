import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RULE_VERSION, analyzeSentence, applyCorrection, validateAnalysisResult } from '../lib/grammar.ts';

const plan = JSON.parse(await readFile(new URL('../tests/fixtures/stage8.json', import.meta.url), 'utf8'));
const implemented = process.argv.includes('--implemented');
const ids = new Set();
const counts = new Map();
import { compare } from "../tests/helpers/stage8-fixtures.mjs";

for (const fixture of plan.fixtures) {
  const { id, group, input, expected, afterApply } = fixture;
  assert.ok(!ids.has(id), `Duplicate fixture: ${id}`); ids.add(id);
  counts.set(group, (counts.get(group) ?? 0) + 1);
  // Protocol checks verify literal positions and hierarchy, not future grammar support.
  for (const [text, answer] of [[input, expected], ...(afterApply ? [[afterApply.input, afterApply]] : [])]) {
    validateAnalysisResult({ input: text, inputVersion: 0, ruleVersion: plan.targetRuleVersion,
      purpose: null, pattern: null, complexity: null, tense: null, ...answer,
      messages: ['Planned fixture'], nodes: answer.nodes.map(n => ({ ...n, id: n.key, parentId: n.parentKey, ruleId: 'PLANNED', explanation: 'Handwritten expected role' })),
      corrections: answer.corrections.map((c, i) => ({ ...c, id: `planned-${i}`, context: 'Planned context', reason: 'Planned correction' })) });
  }
  if (afterApply) {
    const edits = expected.corrections.flatMap(c => c.edits).sort((a, b) => b.range.start - a.range.start);
    const fixed = edits.reduce((text, e) => text.slice(0, e.range.start) + e.replacement + text.slice(e.range.end), input);
    assert.equal(fixed, afterApply.input, `${id}: handwritten corrected input`);
  }
  if (implemented) {
    const result = analyzeSentence(input, 7);
    assert.equal(result.ruleVersion, RULE_VERSION, 'Check the current rules, including explicitly recorded later-stage migrations.');
    compare(input, expected, result);
    if (afterApply) {
      const next = applyCorrection(result, result.corrections[0].id, input, 7);
      assert.equal(next, afterApply.input);
      compare(next, afterApply, analyzeSentence(next, 8));
      assert.throws(() => applyCorrection(result, result.corrections[0].id, next, 8), /过期/);
    }
  }
}
for (const group of ['negative-do', 'negative-be', 'negative-can', 'question-can', 'article', 'object-pronoun', 'agreement-negative-do', 'base-negative-do', 'agreement-negative-be', 'base-negative-can', 'base-question-can']) assert.ok(counts.get(group) >= 5, group);
assert.ok(counts.get('boundary') >= 15);
console.log(`${implemented ? 'Grammar acceptance' : 'Fixture integrity only (grammar not checked)'}: ${ids.size} fixtures, ${plan.fixtures.filter(f => f.afterApply).length} paired controls.`);
