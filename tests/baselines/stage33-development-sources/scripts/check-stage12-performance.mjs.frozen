import assert from 'node:assert/strict';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { analyzeSentence, RULE_VERSION } from '../lib/grammar.ts';
import { performanceCases, instrumentBoundaries, exhaustedCases } from '../tests/helpers/stage12-performance.mjs';
const repetitions = 100;
const cases = performanceCases.map(f => {
  const firstStart = performance.now();
  const first = analyzeSentence(f.input);
  const firstMs = performance.now() - firstStart;
  assert.equal(first.status, f.status);
  for (let i = 0; i < 10; i++) analyzeSentence(f.input);
  const times = [];
  for (let i = 0; i < repetitions; i++) {
    const start = performance.now(); const r = analyzeSentence(f.input);
    times.push(performance.now() - start); assert.equal(r.status, f.status);
  }
  times.sort((a, b) => a - b);
  const { accepted, attempts } = instrumentBoundaries(f.input);
  return { id: f.id, utf16Length: f.input.length, status: first.status, boundariesAccepted: accepted, boundaryAttempts: attempts,
    firstMs, medianMs: times[49], p95Ms: times[94], maxMs: times.at(-1) };
});
const controlled = exhaustedCases.map(f => {
  const { result, attempts, accepted } = instrumentBoundaries(f.input, f.limit);
  assert.equal(result.status, 'unsupported'); assert.equal(result.reasons[0].code, 'budget-exceeded');
  assert.deepEqual(result.nodes, []); assert.deepEqual(result.corrections, []);
  return { input: f.input, injectedLimit: f.limit, accepted, attempts, status: result.status, reasons: result.reasons };
});
console.log(JSON.stringify({ ruleVersion: RULE_VERSION, environment: { node: process.version, platform: process.platform, architecture: process.arch, os: os.release(), cpu: os.cpus()[0].model }, repetitions, warmups: 10, cases, controlled,
  limitation: 'Natural 1000-code-unit inputs do not necessarily exhaust the 4000-boundary budget. Exhaustion uses explicitly injected test limits. Timings include protocol validation; they are local measurements, not a universal latency guarantee.' }, null, 2));
