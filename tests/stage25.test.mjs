import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSentence, applyCorrection, validateAnalysisResult, RULE_VERSION, LEXICON_VERSION, LEXICON_HASH} from '../lib/grammar.ts';
import {loadStage25Acceptance, loadStage25Baseline, validateStage25Baseline, checkStage25Independence, checkStage25Fixture} from './helpers/stage25-fixtures.mjs';
import {baselineHash} from './helpers/historical-independence.mjs';
import {compareLexiconExpectation} from './helpers/lexicon-expectations.mjs';

const acceptance = loadStage25Acceptance();
test('25 fixed independent corpus and current release identity', () => {
  assert.equal(RULE_VERSION, '0.18.0'); assert.equal(LEXICON_VERSION, '1.2.0');
  assert.equal(LEXICON_HASH, '1ca918e6aece84056d8548cf3b6ac9f0cad3945acdc1bf861bc9cba13645bbce');
  assert.equal(acceptance.fixtures.length, 120);
});
for (const fixture of acceptance.fixtures) test(`25 independent ${fixture.id}: ${fixture.input}`, () => {
  checkStage25Fixture(fixture, analyzeSentence, applyCorrection);
  validateAnalysisResult(analyzeSentence(fixture.input));
});
test('25 immutable baseline rejects missing, changed or self-rehashed content', () => {
  assert.throws(() => validateStage25Baseline(null), /Missing/);
  const changed = structuredClone(loadStage25Baseline()); changed.inputs.pop();
  assert.throws(() => validateStage25Baseline(changed), /content changed/);
  const payload = {...changed}; delete payload.contentHash;
  changed.contentHash = baselineHash(payload);
  assert.throws(() => validateStage25Baseline(changed), /hash changed/);
});
test('25 independence rejects historical development, acceptance, migration and normalized duplicates', () => {
  const baseline = loadStage25Baseline();
  for (const path of ['tests/fixtures/lexicon-development.json', 'tests/fixtures/predicate-acceptance.json', 'tests/fixtures/lexicon-migrations.json']) {
    const entry = baseline.inputs.find(i => i.sources.includes(path) && /\.$/.test(i.input));
    assert.ok(entry);
    assert.throws(() => checkStage25Independence([{input:entry.input}], baseline), /reused/);
  }
  const f = acceptance.fixtures[0];
  assert.throws(() => checkStage25Independence([f, {...f,input:`  ${f.input.toUpperCase().replaceAll(' ', '  ')}  `}]), /Duplicate/);
});
test('25 checker rejects changed role, ownership, classification, reason and edit', () => {
  const good = acceptance.fixtures.find(f => f.id === 'vocabulary-04'), actual = analyzeSentence(good.input);
  for (const mutate of [e=>{e.pattern='SVO';}, e=>{e.nodes[0].role='object';}, e=>{e.nodes.find(n=>n.role==='attribute').parentKey=null;}, e=>{e.nodes[0].ranges[0].end--; }]) {
    const wrong = structuredClone(good.expected); mutate(wrong);
    assert.throws(() => compareLexiconExpectation(wrong, actual));
  }
  const bad = acceptance.fixtures.find(f => f.kind === 'error'), result = analyzeSentence(bad.input);
  for (const mutate of [e=>{e.reasons=[];},e=>{e.corrections[0].edits[0].replacement='were';}]) {
    const wrong = structuredClone(bad.expected); mutate(wrong);
    assert.throws(() => compareLexiconExpectation(wrong, result));
  }
});
