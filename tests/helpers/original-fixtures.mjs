import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadHistoricalBaseline } from './historical-independence.mjs';

// These hashes come from the immutable pre-stage-19 baselines, not from the
// current development fixtures or the migration records being checked.
const originalFixtureHashes = new Map();
for (const stage of [12, 18]) {
  for (const source of loadHistoricalBaseline(stage).sources) {
    if (!source.path.startsWith('tests/fixtures/')) continue;
    if (originalFixtureHashes.has(source.path)) assert.equal(originalFixtureHashes.get(source.path), source.sha256);
    originalFixtureHashes.set(source.path, source.sha256);
  }
}
export const originalFixtureFiles = Object.freeze([...originalFixtureHashes.keys()].sort());

export function validateOriginalFixtureSource(file, content) {
  assert.ok(originalFixtureHashes.has(file), `Unknown original fixture: ${file}`);
  assert.equal(createHash('sha256').update(content).digest('hex'), originalFixtureHashes.get(file), `Original fixture content hash mismatch: ${file}`);
  return JSON.parse(content);
}

export function loadOriginalFixture(file) {
  assert.ok(originalFixtureHashes.has(file), `Unknown original fixture: ${file}`);
  const path = file.slice('tests/fixtures/'.length);
  const content = readFileSync(new URL(`../baselines/original-fixtures/${path}`, import.meta.url), 'utf8');
  return validateOriginalFixtureSource(file, content);
}

export function validateOriginalFixtureAudit(audit) {
  // Enumerate the frozen, hash-verified sources rather than trusting audit length.
  const expected = new Set();
  for (const file of originalFixtureFiles) {
    const original = loadOriginalFixture(file);
    for (const collection of ['fixtures', 'boundaries']) {
      for (const [index] of (original[collection] ?? []).entries()) {
        expected.add(JSON.stringify([file, collection, index]));
      }
    }
  }
  const actual = new Set(audit.map(({ file, collection, index }) => JSON.stringify([file, collection, index])));
  assert.equal(actual.size, audit.length, 'Duplicate original fixture audit source');
  assert.deepEqual(actual, expected, 'Original fixture audit sources differ from frozen snapshots');
}
