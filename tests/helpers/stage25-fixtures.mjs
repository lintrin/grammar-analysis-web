import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadDevelopmentBaseline} from './development-baselines.mjs';
import {normalizeHistoricalInput, baselineHash} from './historical-independence.mjs';
import {compareLexiconExpectation, validateLexiconExpectation} from './lexicon-expectations.mjs';

export const STAGE25_BASELINE_HASH = '7a0ff0a5349c0d8eb6cf92ee071ef7e795b166c653e31a4c675fd00c476b7541';
export const STAGE25_ACCEPTANCE_HASH = 'dc787a182e700c3e9459a51db774f2110e45569f9f8d2af3e5bff65425974a76';
export const STAGE25_COMMIT = '5c527e892e2adf8341655f2242896c4106d9c020';
export function validateStage25Baseline(baseline) {
  assert.ok(baseline, 'Missing stage 25 baseline');
  const {contentHash, ...payload} = baseline;
  assert.equal(contentHash, STAGE25_BASELINE_HASH, 'Frozen stage 25 hash changed');
  assert.equal(baselineHash(payload), contentHash, 'Frozen stage 25 content changed');
  assert.equal(baseline.baselineCommit, STAGE25_COMMIT);
  assert.equal(baseline.formatVersion, 1); assert.equal(baseline.stage, 25);
  assert.equal(baseline.ruleVersion, '0.18.0'); assert.equal(baseline.lexiconVersion, '1.2.0');
  assert.equal(baseline.sources.length, 135); assert.equal(baseline.inputs.length, 5611);
  const sources = new Set(baseline.sources.map(s => s.path)), inputs = new Set();
  assert.equal(sources.size, 135);
  for (const source of baseline.sources) assert.match(source.sha256, /^[a-f0-9]{64}$/);
  for (const entry of baseline.inputs) {
    assert.equal(entry.input, normalizeHistoricalInput(entry.input));
    assert.equal(inputs.has(entry.input), false, 'Duplicate baseline input');
    assert.ok(entry.sources.length && entry.sources.every(s => sources.has(s)), 'Missing input provenance');
    inputs.add(entry.input);
  }
  return inputs;
}
export function loadStage25Baseline() {
  const baseline = loadDevelopmentBaseline(25);
  validateStage25Baseline(baseline); return baseline;
}
export function checkStage25Independence(fixtures, baseline = loadStage25Baseline()) {
  const previous = validateStage25Baseline(baseline), unique = new Set();
  for (const fixture of fixtures) {
    const input = normalizeHistoricalInput(fixture.input);
    assert.equal(previous.has(input), false, `Historical/development input reused: ${fixture.input}`);
    assert.equal(unique.has(input), false, `Duplicate independent input: ${fixture.input}`);
    unique.add(input);
  }
}
export function loadStage25Acceptance() {
  const bytes = readFileSync(new URL('../fixtures/lexicon-acceptance.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), STAGE25_ACCEPTANCE_HASH, 'Human answers changed after first analysis');
  const data = JSON.parse(bytes);
  assert.equal(data.baselineHash, STAGE25_BASELINE_HASH);
  assert.equal(data.status, 'human-fixed-before-first-analysis');
  assert.equal(data.fixtures.length, 120);
  const ids = new Set(data.fixtures.map(f => f.id)); assert.equal(ids.size, 120);
  for (const [category, count] of Object.entries({vocabulary:30, possession:15, contraction:15, mixed:20})) {
    assert.equal(data.fixtures.filter(f => f.category === category && f.kind === 'correct').length, count);
  }
  assert.equal(data.fixtures.filter(f => f.kind === 'error').length, 15);
  assert.equal(data.fixtures.filter(f => f.kind === 'boundary').length, 25);
  checkStage25Independence(data.fixtures);
  for (const fixture of data.fixtures) {
    validateLexiconExpectation(fixture.input, fixture.expected);
    if (fixture.kind === 'error') {
      const control = data.fixtures.find(f => f.id === fixture.controlId);
      assert.equal(control?.kind, 'correct');
      assert.deepEqual(fixture.steps, [control.input]);
      assert.equal(fixture.expected.corrections.length, 1);
    } else assert.deepEqual(fixture.expected.corrections, []);
  }
  return data;
}
export function checkStage25Fixture(fixture, analyzeSentence, applyCorrection) {
  const result = analyzeSentence(fixture.input, 25);
  compareLexiconExpectation(fixture.expected, result);
  assert.equal(result.input, fixture.input);
  if (fixture.kind === 'error') {
    let input = fixture.input;
    for (const step of fixture.steps) {
      const current = analyzeSentence(input, 25);
      input = applyCorrection(current, current.corrections[0].id, input, 25);
      assert.equal(input, step);
    }
    const control = loadStage25Acceptance().fixtures.find(f => f.id === fixture.controlId);
    compareLexiconExpectation(control.expected, analyzeSentence(input, 25));
    for (const stale of [{inputVersion:26}, {ruleVersion:'0.17.0'}, {lexiconVersion:'1.1.0'}, {lexiconHash:'0'.repeat(64)}]) {
      assert.throws(() => applyCorrection({...result,...stale}, result.corrections[0].id, fixture.input, 25), /过期/);
    }
    assert.throws(() => applyCorrection(result, result.corrections[0].id, input, 25), /过期/);
    assert.throws(() => applyCorrection(result, 'missing-suggestion', fixture.input, 25));
  }
}
