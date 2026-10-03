import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {instrumentBoundaries} from '../tests/helpers/stage12-performance.mjs';
import {stage25PerformanceCases} from '../tests/helpers/stage25-performance.mjs';
import {surfaceCandidates} from '../lib/grammar/vocabulary.ts';
import {analyzeSentence, RULE_VERSION} from '../lib/grammar.ts';
import {spawnSync} from 'node:child_process';
const init = spawnSync(process.execPath, ['--experimental-strip-types','--input-type=module','-e', `
  import {performance} from 'node:perf_hooks';
  const start=performance.now(); const v=await import('./lib/grammar/vocabulary.ts');
  console.log(JSON.stringify({importMs:performance.now()-start,indexSurfaces:Object.keys(v.surfaceIndex).length}));
`], {encoding:'utf8'});
assert.equal(init.status, 0, init.stderr);
const cases = stage25PerformanceCases.map(f => {
  const times = [];
  for (let i=0;i<100;i++) {
    const start = performance.now(), result = analyzeSentence(f.input);
    times.push(performance.now()-start); assert.equal(result.status, f.status);
  }
  const bounded = instrumentBoundaries(f.input); times.sort((a,b)=>a-b);
  return {id:f.id,status:f.status,utf16Length:f.input.length,samples:100,boundaryAttempts:bounded.attempts,accepted:bounded.accepted,medianMs:times[50],p95Ms:times[95],maxMs:times[99]};
});
const snapshot = readFileSync('lib/grammar/generated/lexicon.json');
console.log(JSON.stringify({ruleVersion:RULE_VERSION,node:process.version,platform:process.platform,initialization:JSON.parse(init.stdout),snapshotBytes:snapshot.length,snapshotGzipBytes:gzipSync(snapshot).length,candidates:Object.fromEntries(['read','her','carried'].map(s=>[s,surfaceCandidates(s,()=>true).length])),cases,limitation:'Local synchronous timings and one cold vocabulary module import including dependency loading. Browser rendering measured separately.'},null,2));
