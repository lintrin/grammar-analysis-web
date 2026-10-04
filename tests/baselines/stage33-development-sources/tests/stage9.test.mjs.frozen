import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult, RULE_VERSION } from '../lib/grammar.ts';
import { stage9, compareStage9 } from './helpers/stage9-fixtures.mjs';
import { analyzeCompound } from '../lib/grammar/compound.ts';
import { tokenize } from '../lib/grammar/tokens.ts';
for (const fixture of stage9.fixtures) test(`stage 9 fixed expectation: ${fixture.id}`, () => {
  const result = analyzeSentence(fixture.input, 9);
  compareStage9(fixture.expected, result);
  validateAnalysisResult(result);
  assert.equal(result.inputVersion, 9);
  if (result.status === 'complete') assert.equal(result.ruleVersion, RULE_VERSION);
  if (result.status === 'partial') {
    assert.match(result.messages[0], /暂不提供纠错/);
    assert.doesNotMatch(result.messages[0], /请查看.*建议/);
  }
});

const corruptions = {
  'missing clause classification': r => { delete r.nodes[0].clause; },
  'null clause pattern': r => { r.nodes[0].clause.pattern = null; },
  'invalid clause tense': r => { r.nodes[0].clause.tense = 'future'; },
  'question clause': r => { r.nodes[0].clause.purpose = 'interrogative'; },
  'top-level pattern': r => { r.pattern = 'SV'; },
  'top-level tense': r => { r.tense = 'present'; },
  'missing connector': r => { r.nodes = r.nodes.filter(n => n.role !== 'connector'); },
  'wrong relationship': r => { r.nodes.find(n => n.role === 'connector').relation = 'contrast'; },
  'missing relationship': r => { delete r.nodes.find(n => n.role === 'connector').relation; },
  'cross-clause child': r => { r.nodes.find(n => n.role === 'subject').parentId = 'clause-2'; },
  'orphan component': r => { r.nodes.find(n => n.role === 'subject').parentId = null; },
  'implicit subject': r => { const n = r.nodes.find(n => n.role === 'subject'); n.implicit = true; n.ranges = []; },
  'implicit clauses without ranges': r => { r.nodes = r.nodes.filter(n => n.parentId === null); for (const n of r.nodes.filter(n => n.role === 'clause')) { n.implicit = true; n.ranges = []; } },
  'compound correction': r => { r.corrections.push({ id: 'edit', ruleId: 'fixture', reason: 'fixture', context: 'fixture', edits: [{ range: { start: 4, end: 10 }, expected: 'sleeps', replacement: 'slept' }] }); },
  'trailing unowned text': r => { r.input += ' unknown'; },
  'unowned comma': r => { r.nodes.find(n => n.role === 'connector').ranges.shift(); },
  'classification on ordinary node': r => { r.nodes.find(n => n.role === 'subject').clause = r.nodes[0].clause; },
  'relationship on ordinary node': r => { r.nodes.find(n => n.role === 'subject').relation = 'addition'; },
};
for (const [name, corrupt] of Object.entries(corruptions)) test(`reject compound protocol: ${name}`, () => {
  const r = analyzeSentence(name === 'unowned comma' ? 'She sleeps, and he smiles.' : 'She sleeps and he smiles.');
  corrupt(r); assert.throws(() => validateAnalysisResult(r), /分析数据无效/);
});
test('both clause parses consume one shared boundary budget without leaking edits or nodes', () => {
  const input = 'She does not give him a book and he does not give her a book';
  const result = { ...analyzeSentence('unknown'), input, messages: [] };
  let boundaries = 0;
  const message = analyzeCompound(tokenize(input), null, result, () => ++boundaries <= 15);
  assert.match(message, /第 2 分句.*计算预算/);
  assert.equal(boundaries, 16);
  assert.equal(result.status, 'unsupported');
  assert.deepEqual(result.nodes, []); assert.deepEqual(result.corrections, []);
});
test('compound at the input limit retains positions and rejects a longer input', () => {
  const input = `She sleeps and he smiles.${' '.repeat(975)}`;
  assert.equal(input.length, 1000);
  const r = analyzeSentence(input); assert.equal(r.status, 'complete'); validateAnalysisResult(r);
  assert.equal(analyzeSentence(input + ' ').status, 'invalid');
});
test('compound parses are deterministic and cannot mutate the fixed expectations', () => {
  const fixture = stage9.fixtures[6];
  const before = JSON.stringify(fixture);
  const first = analyzeSentence(fixture.input, 42);
  first.nodes[0].clause.pattern = 'SV';
  compareStage9(fixture.expected, analyzeSentence(fixture.input, 42));
  assert.equal(JSON.stringify(fixture), before);
});
