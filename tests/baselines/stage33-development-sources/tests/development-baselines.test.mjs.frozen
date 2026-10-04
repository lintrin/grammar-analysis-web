import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeDevelopmentBaseline, loadDevelopmentBaseline} from './helpers/development-baselines.mjs';
import {validateHistoricalBaseline} from './helpers/historical-independence.mjs';
import {validateStage25Baseline} from './helpers/stage25-fixtures.mjs';
import {validateStage32Baseline} from './helpers/stage32-fixtures.mjs';

test('shared archive preserves every frozen stage payload and has no duplicate strings', () => {
  const archive = JSON.parse(readFileSync(new URL('./baselines/development.json', import.meta.url)));
  assert.deepEqual(Object.keys(archive.stages), ['12', '18', '25', '32']);
  assert.equal(archive.strings.length, 13067);
  assert.equal(new Set(archive.strings).size, archive.strings.length);
  for (const stage of [12, 18]) validateHistoricalBaseline(loadDevelopmentBaseline(stage), stage);
  validateStage25Baseline(loadDevelopmentBaseline(25));
  validateStage32Baseline(loadDevelopmentBaseline(32));
});

test('loading a stage isolates nested mutations from subsequent loads', () => {
  const before = loadDevelopmentBaseline(32), changed = loadDevelopmentBaseline(32);
  changed.inputs[0].sources.pop();
  changed.sources[0].sha256 = 'modified';
  assert.deepEqual(loadDevelopmentBaseline(32), before);
});

test('archive rejects missing stages and invalid shared string or source references', () => {
  const valid = {formatVersion: 1, strings: ['example'], stages: {12: {sources: [{path: 'example.json'}], inputs: [[0, [0]]]}}};
  assert.throws(() => decodeDevelopmentBaseline(valid, 18), /Missing development baseline/);
  for (const index of [-1, 1, 0.5, '0']) {
    for (const position of ['input', 'source']) {
      const changed = structuredClone(valid);
      if (position === 'input') changed.stages[12].inputs[0][0] = index;
      else changed.stages[12].inputs[0][1][0] = index;
      assert.throws(() => decodeDevelopmentBaseline(changed, 12), /Invalid baseline reference/);
    }
  }
});
