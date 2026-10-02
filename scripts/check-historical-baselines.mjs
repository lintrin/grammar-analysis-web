import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadHistoricalBaseline, normalizeHistoricalInput, baselineHash } from '../tests/helpers/historical-independence.mjs';
import { loadOriginalFixture } from '../tests/helpers/original-fixtures.mjs';

// Read immutable Git objects, never regenerate a baseline from the current checkout.
const verifiedSnapshots = new Set();
for (const stage of [12, 18]) {
  const baseline = loadHistoricalBaseline(stage), collected = new Map();
  for (const source of baseline.sources) {
    const text = execFileSync('git', ['show', `${baseline.baselineCommit}:${source.path}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(createHash('sha256').update(text).digest('hex'), source.sha256, source.path);
    const add = value => {
      const input = normalizeHistoricalInput(value);
      if (!collected.has(input)) collected.set(input, new Set());
      collected.get(input).add(source.path);
    };
    const visit = value => {
      if (typeof value === 'string') add(value);
      else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    };
    if (source.path.endsWith('.json')) {
      assert.deepEqual(loadOriginalFixture(source.path), JSON.parse(text), `Original fixture snapshot differs from Git: ${source.path}`);
      verifiedSnapshots.add(source.path);
      visit(JSON.parse(text));
    }
    else for (const match of text.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) add(match[2]);
  }
  const inputs = [...collected].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([input, sources]) => ({ input, sources: [...sources].sort() }));
  assert.deepEqual(inputs, baseline.inputs, `Stage ${stage} extraction differs from immutable provenance`);
  const { contentHash, ...payload } = baseline;
  assert.equal(baselineHash(payload), contentHash);
  console.log(`PASS stage ${stage}: ${inputs.length} normalized strings, ${baseline.sources.length} original sources, ${contentHash}`);
}
console.log(`PASS original fixtures: ${verifiedSnapshots.size} frozen snapshots match immutable Git sources`);
