import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadStage25Baseline} from '../tests/helpers/stage25-fixtures.mjs';
import {normalizeHistoricalInput} from '../tests/helpers/historical-independence.mjs';
const baseline = loadStage25Baseline(), collected = new Map();
for (const source of baseline.sources) {
  const text = execFileSync('git', ['show', `${baseline.baselineCommit}:${source.path}`], {encoding:'utf8',maxBuffer:8*1024*1024});
  assert.equal(createHash('sha256').update(text).digest('hex'), source.sha256, source.path);
  const add = s => {
    const input = normalizeHistoricalInput(s);
    if (!collected.has(input)) collected.set(input, new Set());
    collected.get(input).add(source.path);
  };
  const visit = value => {
    if (typeof value === 'string') add(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  if (source.path.endsWith('.json')) visit(JSON.parse(text));
  else for (const match of text.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) add(match[2]);
}
const inputs = [...collected].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([input,sources])=>({input,sources:[...sources].sort()}));
assert.deepEqual(inputs, baseline.inputs);
console.log(`PASS stage 25 provenance: ${inputs.length} strings, ${baseline.sources.length} immutable Git sources, ${baseline.contentHash}`);
