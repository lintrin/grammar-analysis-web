import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const baselineHashes = Object.freeze({
  12: 'e3817b0426d3f53e63dec8732d522fa96aa75daca22c4901419615e525e4a603',
  18: '8596a195480777d9b868bf75fcfd053cf0ef6bca31831e98702c4f7491b63b85',
});
export const normalizeHistoricalInput = input => input.toLowerCase().replace(/\s+/g, ' ').trim();
export const baselineHash = payload => createHash('sha256').update(JSON.stringify(payload)).digest('hex');

export function validateHistoricalBaseline(baseline, stage) {
  assert.ok(baseline, 'Missing historical development baseline');
  const { contentHash, ...payload } = baseline;
  assert.equal(baseline.formatVersion, 1);
  assert.equal(baseline.stage, stage);
  assert.equal(baseline.ruleVersion, '0.14.3');
  assert.equal(baseline.baselineCommit, '9708002c8606afaebfc5bd9b7b80537e20149cfe');
  assert.equal(contentHash, baselineHashes[stage], 'Historical baseline hash changed');
  assert.equal(baselineHash(payload), contentHash, 'Historical baseline content hash mismatch');
  assert.equal(baseline.inputs.length, stage === 12 ? 2224 : 2039);
  assert.equal(baseline.sources.length, stage === 12 ? 29 : 31);
  const paths = new Set(baseline.sources.map(s => s.path));
  assert.equal(paths.size, baseline.sources.length);
  for (const source of baseline.sources) assert.match(source.sha256, /^[a-f0-9]{64}$/);
  const inputs = new Set();
  for (const entry of baseline.inputs) {
    assert.equal(entry.input, normalizeHistoricalInput(entry.input));
    assert.equal(inputs.has(entry.input), false, 'Duplicate baseline input');
    assert.ok(entry.sources.length && entry.sources.every(path => paths.has(path)), 'Missing baseline provenance');
    inputs.add(entry.input);
  }
  return inputs;
}

export function loadHistoricalBaseline(stage) {
  const baseline = JSON.parse(readFileSync(new URL(`../baselines/stage${stage}-development.json`, import.meta.url), 'utf8'));
  validateHistoricalBaseline(baseline, stage);
  return baseline;
}

export function checkHistoricalIndependence(fixtures, stage, baseline = loadHistoricalBaseline(stage)) {
  const previous = validateHistoricalBaseline(baseline, stage), unique = new Set();
  for (const fixture of fixtures) {
    const input = normalizeHistoricalInput(fixture.input);
    assert.equal(previous.has(input), false, `Development input reused: ${fixture.input}`);
    assert.equal(unique.has(input), false, `Duplicate independent input: ${fixture.input}`);
    unique.add(input);
  }
}
