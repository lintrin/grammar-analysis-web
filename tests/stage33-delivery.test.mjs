import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,cpSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {openDatabase,migrate,query,revise} from '../scripts/lexicon/store.mjs';
import {trustedRelease,rebuild,exportRelease,validateRelease,review,publish} from '../scripts/lexicon/release.mjs';
import {clientSnapshot} from '../scripts/lexicon/client.mjs';
import {canonical} from '../scripts/lexicon/data.mjs';
import {analyzeSentence,validateAnalysisResult} from '../lib/grammar.ts';
import {loadStage33Acceptance} from './helpers/stage33-acceptance.mjs';
import {compareStage33Expectation as compareStage33} from './helpers/stage33-fixtures.mjs';
import {instrumentBoundaries} from './helpers/stage12-performance.mjs';
import {stage33PerformanceCases} from './helpers/stage33-performance.mjs';
const data=loadStage33Acceptance();
test('33F empty disk SQLite rebuild reproduces release, snapshot and all 88 frozen independent answers',t=>{
 const directory=mkdtempSync(join(tmpdir(),'clause-33f-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const db=openDatabase(join(directory,'working.sqlite'),true);t.after(()=>db.close());const {release,manifest}=trustedRelease();
 assert.equal(release.lexiconVersion,'1.8.1');migrate(db);assert.deepEqual(rebuild(db,release,manifest.lexiconHash),release);assert.equal(query(db).length,232);
 const exported=exportRelease(db,'1.8.1');assert.deepEqual(exported,release);const snapshot=clientSnapshot(exported);assert.equal(canonical(snapshot)+'\n',readFileSync('lib/grammar/generated/lexicon.json','utf8'));
 cpSync('lib',join(directory,'lib'),{recursive:true});cpSync('data/grammar',join(directory,'data/grammar'),{recursive:true});cpSync('data/analysis-manifest.json',join(directory,'data/analysis-manifest.json'));writeFileSync(join(directory,'lib/grammar/generated/lexicon.json'),canonical(snapshot));
 // No maintenance database is copied. Isolated analyzer uses only rebuilt static snapshot.
 const code=`import {analyzeSentence} from ${JSON.stringify(join(directory,'lib/grammar.ts'))}; console.log(JSON.stringify(${JSON.stringify(data.fixtures.map(f=>f.input))}.map(input=>analyzeSentence(input,33))));`;
 const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(child.status,0,child.stderr);JSON.parse(child.stdout).forEach((r,i)=>compareStage33(data.fixtures[i].expected,r));
 const original=query(db,{lemma:'carry',partOfSpeech:'verb'})[0],draft=structuredClone(original.entry);draft.revisionId='verb:lexical:carry:stage33f-draft';draft.frames[0].allowProgressive=false;
 const row=revise(db,original.entry.revisionId,draft);assert.throws(()=>review(db,draft.revisionId,original.contentHash,'33f-test','approve'),/current draft hash/);
 const selection={lexiconVersion:'33f-test-only',revisionIds:release.entries.map(e=>e.id===draft.id?draft.revisionId:e.revisionId)};assert.throws(()=>publish(db,selection),/approved/);
 assert.throws(()=>db.prepare('UPDATE lexicon_frames SET location_json=NULL WHERE revision_id=?').run(release.entries.find(e=>e.lemma==='is').revisionId),/immutable/);
 review(db,draft.revisionId,row.contentHash,'33f-test','approve');assert.notEqual(publish(db,selection).lexiconHash,release.lexiconHash);assert.deepEqual(exportRelease(db,'1.8.1'),release);
 const tampered=structuredClone(release);tampered.entries[0].forms[0].surface='tampered';assert.throws(()=>validateRelease(tampered));
});
for(const f of stage33PerformanceCases)test(`33F 1000/1001 UTF-16 and shared budget: ${f.id}`,()=>{
 assert.equal(f.input.length,1000);assert.equal(analyzeSentence(f.input).status,f.status);assert.equal(analyzeSentence(f.input+' ').status,'invalid');const bounded=instrumentBoundaries(f.input);assert.equal(bounded.result.status,f.status);assert.ok(bounded.accepted<=4000);validateAnalysisResult(bounded.result);
 for(const limit of [0,1,10]){const exhausted=instrumentBoundaries(f.input,limit);assert.ok(exhausted.accepted<=limit);assert.equal(exhausted.result.status,'unsupported');assert.equal(exhausted.result.reasons[0].code,'budget-exceeded');assert.deepEqual(exhausted.result.nodes,[]);assert.deepEqual(exhausted.result.corrections,[]);for(const field of ['purpose','pattern','complexity','tense','modal','questionType','aspect','voice'])assert.equal(exhausted.result[field],null);}
});
test('33F performance inputs and human statuses stay frozen',()=>{
 const hash=createHash('sha256').update(readFileSync('tests/helpers/stage33-performance.mjs')).digest('hex');assert.equal(hash,readFileSync('tests/fixtures/stage33f-performance.sha256','utf8').trim().split(/\s+/)[0]);
});
