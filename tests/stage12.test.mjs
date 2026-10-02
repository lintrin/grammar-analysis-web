import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { analyzeSentence, validateAnalysisResult } from '../lib/grammar.ts';
import { compareStage9 } from './helpers/stage9-fixtures.mjs';
import { stage12, expectedStage12 } from './helpers/stage12-fixtures.mjs';

test('stage 12 uses 40 new in-scope inputs and 20 new contrasts after completion of the rules', () => {
  assert.equal(stage12.fixtures.length, 40);
  assert.equal(stage12.boundaries.length, 20);
  assert.equal(new Set(stage12.fixtures.map(f => f.id)).size, 40);
  for (const group of ['simple', 'compound', 'because', 'if']) assert.equal(stage12.fixtures.filter(f => f.group === group).length, 10);
  const normalize = text => text.toLowerCase().replace(/\s+/g, ' ').trim();
  const previous = new Set();
  const visit = value => {
    if (typeof value === 'string') previous.add(normalize(value));
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  const directory = new URL('./fixtures/', import.meta.url);
  for (const file of readdirSync(directory).filter(f => f.endsWith('.json') && f !== 'stage12.json')) visit(JSON.parse(readFileSync(new URL(file, directory), 'utf8')));
  // Earlier hand-written tests and teaching examples also count as development inputs.
  for (const path of [...readdirSync(new URL('./', import.meta.url)).filter(f => f.endsWith('.mjs') && !f.startsWith('stage12') && f !== 'ui-stage12.mjs').map(f => new URL(f, import.meta.url)), new URL('../lib/grammar/learning.ts', import.meta.url)]) {
    const source = readFileSync(path, 'utf8');
    for (const match of source.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) previous.add(normalize(match[2]));
  }
  const unique = new Set();
  for (const f of [...stage12.fixtures, ...stage12.boundaries]) {
    const input = normalize(f.input);
    assert.equal(previous.has(input), false, `Previously used input: ${f.input}`);
    assert.equal(unique.has(input), false, `Duplicate acceptance input: ${f.input}`);
    unique.add(input);
  }
});

for (const f of stage12.fixtures) test(`stage 12 independent ${f.id}: ${f.input}`, () => {
  const expected = expectedStage12(f); // Translate fixed answers before analyzing.
  const result = analyzeSentence(f.input);
  compareStage9(expected, result);
  assert.deepEqual(result.reasons, []);
  validateAnalysisResult(result);
});
for (const f of stage12.boundaries) test(`stage 12 independent contrast: ${f.input}`, () => {
  const result = analyzeSentence(f.input);
  assert.equal(result.status, f.status);
  assert.equal(result.reasons[0].code, f.code);
  assert.deepEqual(result.nodes, []);
  assert.deepEqual(result.corrections, []);
  validateAnalysisResult(result);
});
