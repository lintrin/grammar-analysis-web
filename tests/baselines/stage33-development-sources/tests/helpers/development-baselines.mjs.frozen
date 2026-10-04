import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Storage indices only: each reconstructed stage retains its original payload hash.
const archive = JSON.parse(readFileSync(new URL('../baselines/development.json', import.meta.url)));

export function decodeDevelopmentBaseline(data, stage) {
  assert.equal(data.formatVersion, 1, 'Unknown development archive format');
  assert.ok(Array.isArray(data.strings), 'Missing shared baseline strings');
  const snapshot = data.stages?.[stage];
  assert.ok(snapshot, `Missing development baseline: ${stage}`);
  const baseline = structuredClone(snapshot);
  const reference = (rows, index) => {
    assert.ok(Number.isInteger(index) && index >= 0 && index < rows.length, 'Invalid baseline reference');
    return rows[index];
  };
  baseline.inputs = baseline.inputs.map(([input, sources]) => {
    const text = reference(data.strings, input);
    assert.equal(typeof text, 'string', 'Invalid baseline string');
    return {input: text, sources: sources.map(index => reference(baseline.sources, index).path)};
  });
  return baseline;
}

export const loadDevelopmentBaseline = stage => decodeDevelopmentBaseline(archive, stage);
