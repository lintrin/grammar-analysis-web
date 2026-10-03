import { LEXICON_VERSION, LEXICON_HASH } from "../lib/grammar/vocabulary.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
import { lexicalVerbs } from '../lib/grammar/vocabulary.ts';
import { finiteAgreement, lexicalForm } from '../lib/grammar/predicate.ts';
import { forkCandidate } from '../lib/grammar/context.ts';
import { tenseLabel, voiceLabel } from '../lib/grammar/classification.ts';
import { development } from './helpers/predicate-fixtures.mjs';
import { expectedStage12 } from './helpers/stage12-fixtures.mjs';
import { loadOriginalFixture } from './helpers/original-fixtures.mjs';
const originalDevelopment = loadOriginalFixture('tests/fixtures/predicate-development.json');

test('stage 13 manual answers fix six capability groups and their original-text partitions before implementation', () => {
  for (const category of ['progressive','perfect','passive','perfect-progressive','perfect-passive','progressive-passive']) {
    const fixtures = development.fixtures.filter(f => f.category === category && f.group === 'simple');
    assert.ok(fixtures.filter(f => f.purpose === 'declarative' && !f.input.includes(' not ')).length >= 5);
    assert.ok(fixtures.filter(f => f.input.includes(' not ')).length >= 3);
    assert.ok(fixtures.filter(f => f.purpose === 'interrogative').length >= 3);
  }
  for (const stage of [14,15,16,17]) {
    assert.ok(originalDevelopment.boundaries.filter(f => f.stage === stage && f.status === 'partial').length >= 10);
    assert.ok(originalDevelopment.boundaries.filter(f => f.stage === stage && f.status === 'unsupported').length >= 10);
  }
  for (const fixture of development.fixtures) {
    const expected = expectedStage12(fixture);
    validateAnalysisResult({ ...expected, input: fixture.input, inputVersion: 0, ruleVersion: 'planned', lexiconVersion: LEXICON_VERSION, lexiconHash: LEXICON_HASH, reasons: [], messages: ['人工固定答案'],
      nodes: expected.nodes.map(n => ({ ...n, id: n.key, parentId: n.parentKey, ruleId: 'PLANNED', explanation: '人工标注的分类与成分区间' })) });
  }
});

test('stage 13 audited participles include irregular and doubled-letter forms', () => {
  assert.equal(lexicalVerbs.length, 100);
  for (const [base, participle, progressive] of [['give','given','giving'],['show','shown','showing'],['go','gone','going'],['run','run','running'],['see','seen','seeing'],['make','made','making']]) {
    assert.equal(lexicalForm(participle).base, base);
    assert.equal(lexicalForm(progressive).base, base);
  }
  assert.deepEqual(finiteAgreement('were', true, true), { tense: 'past', expected: 'was' });
  assert.deepEqual(finiteAgreement('have', true, false), { tense: 'present', expected: 'has' });
});
test('stage 13 all existing complete purposes have explicit simple active classification', () => {
  for (const input of ['She sleeps.', 'Does she sleep?', 'She does not sleep.', 'Can she sleep?', 'She can sleep.', 'Sleep.', 'How kind she is!']) {
    const result = analyzeSentence(input);
    assert.equal(result.status, 'complete'); assert.equal(result.aspect, 'simple'); assert.equal(result.voice, 'active');
  }
  const result = analyzeSentence('If she sleeps, he smiles.');
  assert.equal(result.aspect, null); assert.equal(result.voice, null);
  for (const node of result.nodes.filter(n => n.role === 'clause')) {
    assert.equal(node.clause.aspect, 'simple'); assert.equal(node.clause.voice, 'active');
  }
});
for (const field of ['aspect', 'voice']) test(`stage 13 rejects missing ${field} without historical adaptation`, () => {
  const result = analyzeSentence('She sleeps.'); delete result[field];
  assert.throws(() => validateAnalysisResult(result), /分析数据无效/);
});
for (const field of ['aspect', 'voice']) test(`stage 13 rejects missing clause ${field}`, () => {
  const result = analyzeSentence('She sleeps and he smiles.'); delete result.nodes[0].clause[field];
  assert.throws(() => validateAnalysisResult(result), /分析数据无效/);
});
test('stage 13 candidate classifications and references cannot leak from a previous parse', () => {
  const previous = analyzeSentence('She sleeps.'); const candidate = forkCandidate(previous);
  for (const field of ['purpose','pattern','complexity','tense','aspect','voice']) assert.equal(candidate[field], null);
  candidate.messages.push('new'); candidate.nodes.push({});
  assert.equal(previous.nodes.length, 2); assert.equal(previous.messages.includes('new'), false);
});
test('stage 13 classification labels derive from explicit aspect and voice', () => {
  assert.equal(tenseLabel('past','perfect-progressive'), '过去完成进行时');
  assert.equal(tenseLabel('present','progressive'), '现在进行时'); assert.equal(voiceLabel('passive'), '被动语态');
});
