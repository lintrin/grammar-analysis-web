import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult, RULE_VERSION } from '../lib/grammar.ts';
import { stage10b, compareStage10b } from './helpers/stage10b-fixtures.mjs';
for (const fixture of stage10b.fixtures) test(`stage 10B fixed expectation: ${fixture.id}`, () => {
  const result = analyzeSentence(fixture.input, 11);
  compareStage10b(fixture.expected, result);
  validateAnalysisResult(result);
  assert.equal(result.ruleVersion, RULE_VERSION);
  assert.equal(result.inputVersion, 11);
  if (result.status === 'complete') assert.match(result.messages[0], /条件.*主句/);
  if (result.status === 'partial') {
    assert.match(result.messages[0], /暂不提供纠错/);
    assert.doesNotMatch(result.messages[0], /请查看.*建议/);
  }
});

const corruptions = {
  'missing clause classification': r => { delete r.nodes[0].clause; },
  'swapped main and condition': r => { for (const n of r.nodes.filter(n => n.role === 'clause')) n.clause.kind = n.clause.kind === 'main' ? 'subordinate' : 'main'; },
  'independent condition': r => { r.nodes[0].clause.kind = 'independent'; },
  'invalid condition tense': r => { r.nodes[0].clause.tense = 'future'; },
  'question main clause': r => { r.nodes.find(n => n.clause?.kind === 'main').clause.purpose = 'interrogative'; },
  'top-level pattern': r => { r.pattern = 'SV'; },
  'top-level tense': r => { r.tense = 'present'; },
  'compound complexity': r => { r.complexity = 'compound'; },
  'causal relation': r => { r.nodes.find(n => n.role === 'connector').relation = 'cause'; },
  'missing connector': r => { r.nodes = r.nodes.filter(n => n.role !== 'connector'); },
  'if without comma interval': r => { r.nodes.find(n => n.role === 'connector').ranges.pop(); },
  'comma without if interval': r => { r.nodes.find(n => n.role === 'connector').ranges.shift(); },
  'partial if interval': r => { r.nodes.find(n => n.role === 'connector').ranges[0].end--; },
  'comma interval on period': r => { r.nodes.find(n => n.role === 'connector').ranges[1] = { start: r.input.length - 1, end: r.input.length }; },
  'connector includes condition words': r => { const n = r.nodes.find(n => n.role === 'connector'); n.ranges = [{ start: 0, end: r.input.indexOf(',') + 1 }]; },
  'unowned leading text': r => { r.input = 'xx' + r.input; for (const n of r.nodes) for (const q of n.ranges) { q.start += 2; q.end += 2; } },
  'missing explicit verb': r => { r.nodes = r.nodes.filter(n => !(n.role === 'verb' && n.parentId === 'clause-1')); },
  'implicit condition': r => { r.nodes[0].implicit = true; r.nodes[0].ranges = []; },
  'orphan component': r => { r.nodes.find(n => n.role === 'subject').parentId = null; },
  'complex correction': r => { r.corrections.push({ id: 'edit', ruleId: 'fixture', reason: 'fixture', context: 'fixture', edits: [{ range: { start: 7, end: 13 }, expected: 'sleeps', replacement: 'slept' }] }); },
};
for (const [name, corrupt] of Object.entries(corruptions)) test(`reject if protocol: ${name}`, () => {
  const r = analyzeSentence('If she sleeps, he smiles.');
  corrupt(r); assert.throws(() => validateAnalysisResult(r), /分析数据无效/);
});
test('if clauses share the boundary budget without leaking tentative nodes or edits', async () => {
  const { analyzeComplex } = await import('../lib/grammar/complex.ts');
  const { tokenize } = await import('../lib/grammar/tokens.ts');
  const input = 'If she does not give him a book, he does not give her a book';
  const r = { ...analyzeSentence('unknown'), input, messages: [] };
  let boundaries = 0;
  const message = analyzeComplex(tokenize(input), null, r, () => ++boundaries <= 8);
  assert.match(message, /第 2 分句.*计算预算/); assert.equal(boundaries, 9);
  assert.equal(r.status, 'unsupported'); assert.deepEqual(r.nodes, []); assert.deepEqual(r.corrections, []);
});
test('if input limit preserves positions and rejects excess UTF-16 units', () => {
  const input = 'If she sleeps, he smiles.'.padEnd(1000);
  const r = analyzeSentence(input); assert.equal(r.status, 'complete'); validateAnalysisResult(r);
  assert.equal(analyzeSentence(input + ' ').status, 'invalid');
});
test('if analysis does not mutate answers or share nodes across calls', () => {
  const f = stage10b.fixtures[6], before = JSON.stringify(f);
  const r = analyzeSentence(f.input); r.nodes[0].clause.kind = 'main'; r.nodes[1].ranges[0].start++;
  compareStage10b(f.expected, analyzeSentence(f.input)); assert.equal(JSON.stringify(f), before);
});
test('stage 10A fixed answers directly describe the current supported if structure', async () => {
  const { stage10a, compareStage10a } = await import('./helpers/stage10a-fixtures.mjs');
  const f = stage10a.fixtures.find(f => f.input.startsWith('If '));
  assert.equal(f.expected.status, 'complete');
  compareStage10a(f.expected, analyzeSentence(f.input));
  assert.throws(() => compareStage10a(f.expected, { ...analyzeSentence(f.input), status: 'unsupported' }));
});
