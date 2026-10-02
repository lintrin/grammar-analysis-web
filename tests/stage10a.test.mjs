import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult, RULE_VERSION } from '../lib/grammar.ts';
import { stage10a, compareStage10a } from './helpers/stage10a-fixtures.mjs';
for (const fixture of stage10a.fixtures) test(`stage 10A fixed expectation: ${fixture.id}`, () => {
  const result = analyzeSentence(fixture.input, 10);
  compareStage10a(fixture.expected, result);
  validateAnalysisResult(result);
  assert.equal(result.ruleVersion, RULE_VERSION);
  assert.equal(result.inputVersion, 10);
  if (fixture.expected.status === 'complete') assert.match(result.messages[0], fixture.input.startsWith('If ') ? /条件.*主句/ : /原因.*主句/);
  if (result.status === 'partial') {
    assert.match(result.messages[0], /暂不提供纠错/);
    assert.doesNotMatch(result.messages[0], /请查看.*建议/);
  }
});

const corruptions = {
  'missing classification': r => { delete r.nodes[0].clause; },
  'swapped main and subordinate': r => { for (const n of r.nodes.filter(n => n.role === 'clause')) n.clause.kind = n.clause.kind === 'main' ? 'subordinate' : 'main'; },
  'independent main': r => { r.nodes[0].clause.kind = 'independent'; },
  'two main clauses': r => { r.nodes.find(n => n.clause?.kind === 'subordinate').clause.kind = 'main'; },
  'invalid clause kind': r => { r.nodes[0].clause.kind = 'reason'; },
  'question subordinate': r => { r.nodes.find(n => n.clause?.kind === 'subordinate').clause.purpose = 'interrogative'; },
  'top-level pattern': r => { r.pattern = 'SV'; },
  'top-level tense': r => { r.tense = 'past'; },
  'compound complexity': r => { r.complexity = 'compound'; },
  'wrong relation': r => { r.nodes.find(n => n.role === 'connector').relation = 'addition'; },
  'missing connector': r => { r.nodes = r.nodes.filter(n => n.role !== 'connector'); },
  'connector only covers part of because': r => { r.nodes.find(n => n.role === 'connector').ranges[0].end--; },
  'split because intervals': r => { const n = r.nodes.find(n => n.role === 'connector'); n.ranges = [{ start: 11, end: 14 }, { start: 14, end: 18 }]; },
  'cross-clause child': r => { r.nodes.find(n => n.role === 'subject').parentId = 'clause-2'; },
  'implicit subordinate': r => { const n = r.nodes.find(n => n.clause?.kind === 'subordinate'); n.implicit = true; n.ranges = []; },
  'orphan component': r => { r.nodes.find(n => n.role === 'subject').parentId = null; },
  'unowned trailing text': r => { r.input += ' unknown'; },
  'complex correction': r => { r.corrections.push({ id: 'edit', ruleId: 'fixture', reason: 'fixture', context: 'fixture', edits: [{ range: { start: 4, end: 10 }, expected: 'smiles', replacement: 'smiled' }] }); },
};
for (const [name, corrupt] of Object.entries(corruptions)) test(`reject because protocol: ${name}`, () => {
  const r = analyzeSentence('She smiles because she likes the book.');
  corrupt(r); assert.throws(() => validateAnalysisResult(r), /分析数据无效/);
});

test('because clauses share the boundary budget and never leak tentative components or edits', async () => {
  const { analyzeComplex } = await import('../lib/grammar/complex.ts');
  const { tokenize } = await import('../lib/grammar/tokens.ts');
  const input = 'She does not give him a book because he does not give her a book';
  const result = { ...analyzeSentence('unknown'), input, messages: [] };
  let boundaries = 0;
  const message = analyzeComplex(tokenize(input), null, result, () => ++boundaries <= 8);
  assert.match(message, /第 2 分句.*计算预算/);
  assert.equal(boundaries, 9);
  assert.equal(result.status, 'unsupported');
  assert.deepEqual(result.nodes, []); assert.deepEqual(result.corrections, []);
});
test('because at 1000 UTF-16 units keeps exact ranges and rejects excess input', () => {
  const sentence = 'She smiles because she likes the book.';
  const input = sentence + ' '.repeat(1000 - sentence.length);
  const r = analyzeSentence(input); assert.equal(r.status, 'complete'); validateAnalysisResult(r);
  assert.equal(analyzeSentence(input + ' ').status, 'invalid');
});
test('because analysis is deterministic and does not mutate fixed answers', () => {
  const fixture = stage10a.fixtures[6], before = JSON.stringify(fixture);
  const first = analyzeSentence(fixture.input, 42);
  first.nodes[0].clause.kind = 'subordinate';
  compareStage10a(fixture.expected, analyzeSentence(fixture.input, 42));
  assert.equal(JSON.stringify(fixture), before);
});
test('stage 8 fixed answers directly describe the current supported compound', async () => {
  const { compareStage8Input } = await import('./helpers/stage8-fixtures.mjs');
  const input = 'She does not sleep and he smiles.';
  compareStage8Input(input, analyzeSentence(input));
  assert.throws(() => compareStage8Input(input, { ...analyzeSentence(input), status: 'unsupported' }));
});
