import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { analyzeSentence, RULE_VERSION } from '../lib/grammar.ts';
import { instrumentBoundaries } from '../tests/helpers/stage12-performance.mjs';
import { predicatePerformanceCases } from '../tests/helpers/predicate-performance.mjs';
const cases = [];
for (const fixture of predicatePerformanceCases) {
  const times = [];
  for (let i=0;i<100;i++) {
    const start = performance.now(), result = analyzeSentence(fixture.input);
    times.push(performance.now()-start); assert.equal(result.status,'complete'); assert.deepEqual(result.corrections,[]);
  }
  const { attempts, accepted, result } = instrumentBoundaries(fixture.input);
  assert.equal(result.status,'complete'); assert.ok(accepted <= 4000);
  assert.equal(analyzeSentence(fixture.input+' ').status,'invalid');
  const sorted = [...times].sort((a,b) => a-b);
  cases.push({ id: fixture.id, utf16Length: fixture.input.length, samples: times.length, boundaryAttempts: attempts, accepted,
    medianMs: sorted[50], p95Ms: sorted[95], maxMs: sorted[99] });
}
console.log(JSON.stringify({ ruleVersion: RULE_VERSION, node: process.version, platform: process.platform, cases, limitation: 'Local synchronous engine timings, 100 samples per fixed input; excludes browser rendering.' },null,2));
