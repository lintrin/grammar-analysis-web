import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, cpSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {openDatabase, migrate, query, revise} from '../scripts/lexicon/store.mjs';
import {trustedRelease, rebuild, exportRelease, review, publish} from '../scripts/lexicon/release.mjs';
import {clientSnapshot, verify} from '../scripts/lexicon/client.mjs';
import {canonical} from '../scripts/lexicon/data.mjs';
import {analyzeSentence, validateAnalysisResult} from '../lib/grammar.ts';
import {surfaceCandidates} from '../lib/grammar/vocabulary.ts';
import {loadStage25Acceptance} from './helpers/stage25-fixtures.mjs';
import {compareLexiconExpectation} from './helpers/lexicon-expectations.mjs';
import {instrumentBoundaries} from './helpers/stage12-performance.mjs';
import {stage25PerformanceCases} from './helpers/stage25-performance.mjs';

test('25 clean disk database, fixed release and generated client reproduce all independent answers', t => {
  const directory = mkdtempSync(join(tmpdir(), 'clause-25-rebuild-'));
  t.after(() => rmSync(directory, {recursive:true,force:true}));
  const db = openDatabase(join(directory,'working.sqlite'), true); t.after(() => db.close());
  const {release, manifest} = trustedRelease(); migrate(db);
  assert.deepEqual(rebuild(db, release, manifest.lexiconHash), release);
  assert.equal(query(db).length, 222);
  const exported = exportRelease(db, '1.3.0'); assert.deepEqual(exported, release);
  const regenerated = clientSnapshot(exported);
  assert.equal(canonical(regenerated)+'\n', readFileSync('lib/grammar/generated/lexicon.json','utf8'));
  assert.equal(verify().entries, 222);
  // Load the rebuilt snapshot in a separate source checkout and process.
  cpSync('lib', join(directory,'lib'), {recursive:true});
  writeFileSync(join(directory,'lib/grammar/generated/lexicon.json'), JSON.stringify(regenerated));
  const acceptance = loadStage25Acceptance(), inputs = acceptance.fixtures.map(f => f.input);
  const code = `import {analyzeSentence,applyCorrection} from ${JSON.stringify(join(directory,'lib/grammar.ts'))};
    console.log(JSON.stringify(${JSON.stringify(inputs)}.map(input=>{
      const result=analyzeSentence(input,25);
      const corrected=result.corrections.length?applyCorrection(result,result.corrections[0].id,input,25):null;
      return {result,corrected,control:corrected===null?null:analyzeSentence(corrected,25)};
    })));`;
  const child = spawnSync(process.execPath, ['--experimental-strip-types','--input-type=module','-e',code], {encoding:'utf8',maxBuffer:8*1024*1024});
  assert.equal(child.status, 0, child.stderr);
  for (const [index,row] of JSON.parse(child.stdout).entries()) {
    const fixture = acceptance.fixtures[index]; compareLexiconExpectation(fixture.expected, row.result);
    if (fixture.kind === 'error') {
      assert.equal(row.corrected, fixture.steps[0]);
      compareLexiconExpectation(acceptance.fixtures.find(f=>f.id===fixture.controlId).expected, row.control);
    }
  }
  const a = query(db,{lemma:'carry',partOfSpeech:'verb'})[0], b = structuredClone(a.entry);
  b.revisionId = 'verb:lexical:carry:stage25-draft'; b.frames[0].allowProgressive = false;
  const next = revise(db, a.entry.revisionId, b);
  assert.deepEqual(exportRelease(db,'1.3.0'), release);
  assert.throws(() => review(db,b.revisionId,a.contentHash,'stage25-synthetic-check','approve'), /current draft hash/);
  const selection = {lexiconVersion:'stage25-test-only',revisionIds:release.entries.map(e=>e.id===b.id?b.revisionId:e.revisionId)};
  assert.throws(() => publish(db,selection), /approved/);
  assert.deepEqual(clientSnapshot(exportRelease(db,'1.3.0')), regenerated);
  review(db,b.revisionId,next.contentHash,'stage25-synthetic-check','approve');
  const second = publish(db, selection); assert.notEqual(second.lexiconHash, release.lexiconHash);
  assert.deepEqual(exportRelease(db,'1.3.0'), release);
  assert.deepEqual(clientSnapshot(exportRelease(db,'1.3.0')), regenerated);
});
for (const fixture of stage25PerformanceCases) test(`25 substantive high-candidate pressure: ${fixture.id}`, () => {
  assert.equal(fixture.input.length, 1000);
  assert.equal(analyzeSentence(fixture.input).status, fixture.status);
  const full = instrumentBoundaries(fixture.input);
  assert.equal(full.result.status, fixture.status); assert.ok(full.accepted <= 4000);
  validateAnalysisResult(full.result);
  assert.equal(analyzeSentence(fixture.input+' ').status, 'invalid');
  const empty = instrumentBoundaries(fixture.input, 0);
  assert.equal(empty.attempts, 1); assert.equal(empty.result.status, 'unsupported');
  assert.equal(empty.result.reasons[0].code, 'budget-exceeded');
  assert.deepEqual(empty.result.nodes, []); assert.deepEqual(empty.result.corrections, []);
  for (const key of ['purpose','pattern','complexity','tense','aspect','voice']) assert.equal(empty.result[key], null);
});
test('25 high-candidate forms retain every audited interpretation', () => {
  for (const [surface,count] of [['read',3],['her',2],['carried',2]]) assert.equal(surfaceCandidates(surface,()=>true).length, count);
  assert.equal(analyzeSentence('').status, 'invalid');
  assert.equal(analyzeSentence(' '.repeat(1000)).status, 'invalid');
});
