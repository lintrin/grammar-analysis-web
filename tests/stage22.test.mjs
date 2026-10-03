import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeSentence,applyCorrection,LEXICON_VERSION,LEXICON_HASH} from '../lib/grammar.ts';
import {compareLexiconExpectation} from './helpers/lexicon-expectations.mjs';
import {openDatabase,migrate,importData,query} from '../scripts/lexicon/store.mjs';
import {validateRelease,rebuild,review,publish} from '../scripts/lexicon/release.mjs';
import {canonical,normalizeEntry} from '../scripts/lexicon/data.mjs';
import {surfaceCandidates} from '../lib/grammar/vocabulary.ts';
import {analyzePurpose} from '../lib/grammar/purposes.ts';
import {tokenize} from '../lib/grammar/tokens.ts';
import {forkCandidate,createBoundaryBudget} from '../lib/grammar/context.ts';
const development=JSON.parse(readFileSync('tests/fixtures/lexicon-development.json'));
const byId=new Map(development.fixtures.map(f=>[f.id,f]));
for(const f of development.fixtures.filter(f=>f.stage===22)) test(`22 fixed answer: ${f.id} ${f.input}`,()=>{
  const r=analyzeSentence(f.input,9);compareLexiconExpectation(f.expected,r);
  assert.equal(r.lexiconVersion,LEXICON_VERSION);assert.equal(r.lexiconHash,LEXICON_HASH);
  if(f.kind==='error'){
    let next=f.input;
    for(const step of f.steps){const current=analyzeSentence(next,9);next=applyCorrection(current,current.corrections[0].id,next,9);assert.equal(next,step);}
    const control=byId.get(f.controlId);compareLexiconExpectation(control.expected,analyzeSentence(next));
    assert.throws(()=>applyCorrection(r,r.corrections[0].id,f.input,10),/过期/);
    assert.throws(()=>applyCorrection({...r,lexiconHash:'0'.repeat(64)},r.corrections[0].id,f.input,9),/过期/);
  }
});
const migrations=JSON.parse(readFileSync('tests/fixtures/lexicon-migrations.json'));
for(const m of migrations.migrations.filter(m=>m.stage===22)) test(`22 historical migration: ${m.id}`,()=>{
  const source=JSON.parse(readFileSync(m.source.file))[m.source.collection][m.source.index];
  assert.equal(source.id,m.source.id);assert.equal(source.input,m.input);assert.deepEqual(source.expected,m.newExpected);
  compareLexiconExpectation(m.newExpected,analyzeSentence(m.input));
});
const old=validateRelease(JSON.parse(readFileSync('data/lexicon/releases/1.1.0.json')));
const draft=JSON.parse(readFileSync('data/lexicon/stage22-import.json'));
const current=validateRelease(JSON.parse(readFileSync('data/lexicon/releases/1.2.0.json')));
test('22 audited possession frame preserves all old entries, auxiliaries and restrictions',()=>{
  assert.equal(current.entries.length,149);assert.equal(draft.entries.length,1);
  for(const entry of old.entries) assert.deepEqual(current.entries.find(e=>e.id===entry.id),entry);
  const e=draft.entries[0];assert.equal(e.sense,'possession');assert.equal(e.lemma,'have');
  assert.deepEqual(Object.fromEntries(e.forms.map(f=>[f.kind,f.surface])),{base:'have',third:'has',past:'had',participle:'had',progressive:'having'});
  assert.deepEqual(e.frames,[{id:'possession-svo',pattern:'SVO',recipient:null,complement:null,allowProgressive:false,allowPerfect:false,passivePromotion:null,allowedPurposes:['declarative','interrogative'],allowedPolarities:['positive','negative'],fixedTail:null}]);
  for(const change of [f=>f.allowProgressive=true,f=>f.allowPerfect=true,f=>f.passivePromotion='direct-object',f=>f.allowedPurposes.push('imperative')]){const bad=structuredClone(e);change(bad.frames[0]);assert.throws(()=>normalizeEntry(bad),/Unsupported frame combination/);}
});
test('22 import, hash review and explicit selection reproduce the new snapshot',t=>{
  const db=openDatabase(':memory:',true);t.after(()=>db.close());migrate(db);rebuild(db,old,old.lexiconHash);importData(db,draft);
  const row=query(db).find(r=>r.status==='draft');review(db,row.entry.revisionId,row.contentHash,'stage22-fixed-scope-audit','approve');
  const selection=JSON.parse(readFileSync('data/lexicon/stage22-selection.json'));assert.deepEqual(new Set(selection.revisionIds),new Set(query(db).map(r=>r.entry.revisionId)));
  assert.equal(canonical(publish(db,selection)),canonical(current));
});
test('22 have/had candidates retain both auxiliary identity and audited lexical forms, spending budget',()=>{
  const have=surfaceCandidates('have',()=>true);assert.deepEqual(new Set(have.map(c=>c.formKind)),new Set(['marker','base']));
  assert.deepEqual(new Set(surfaceCandidates('had',()=>true).map(c=>c.formKind)),new Set(['marker','past','participle']));
  let attempts=0;assert.equal(surfaceCandidates('had',()=>++attempts<=2),null);assert.equal(attempts,3);
  const r=forkCandidate(analyzeSentence('She has a book.'));analyzePurpose(tokenize('She has a book'),'.',r,createBoundaryBudget(0));
  assert.equal(r.status,'unsupported');assert.deepEqual(r.reasons,[{code:'budget-exceeded',ranges:[]}]);assert.deepEqual(r.nodes,[]);assert.deepEqual(r.corrections,[]);
});
