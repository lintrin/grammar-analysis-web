import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadStage33Acceptance,loadStage33Development,loadStage33Queries,checkStage33Independence,validateStage33Development} from './helpers/stage33-acceptance.mjs';
import {compareStage33Expectation,sha256} from './helpers/stage33-fixtures.mjs';
import {analyzeSentence,applyCorrection,validateAnalysisResult} from '../lib/grammar.ts';
import {queryDictionary,locationPolicyDetails,entryExamples,locationTeachingExamples} from '../lib/grammar/dictionary.ts';
const data=loadStage33Acceptance(),byId=new Map(data.fixtures.map(f=>[f.id,f]));
for(const f of data.fixtures)test(`33E independent full answer: ${f.id} ${f.input}`,()=>{
 const r=analyzeSentence(f.input,33);validateAnalysisResult(r);compareStage33Expectation(f.expected,r);assert.equal(r.input,f.input);
 assert.deepEqual(analyzeSentence(f.input,33),r);
 if(f.kind==='error'){
  const c=byId.get(f.controlId);const next=applyCorrection(r,r.corrections[0].id,f.input,33);assert.equal(next,c.input);compareStage33Expectation(c.expected,analyzeSentence(next,34));
  for(const stale of [{inputVersion:34},{ruleVersion:'stale'},{lexiconVersion:'stale'},{lexiconHash:'0'.repeat(64)}])assert.throws(()=>applyCorrection({...r,...stale},r.corrections[0].id,f.input,33),/过期/);
 }
});
for(const f of loadStage33Queries().fixtures)test(`33E independent query workflow ${f.id} ${f.query}`,()=>{
 assert.deepEqual(queryDictionary(f.query,f.filters[0]),[]);
 const rows=queryDictionary(f.query,f.filters[1]);assert.deepEqual(rows.map(e=>e.id),f.expectedIds);
 if(!rows.length)return;
 const [entry]=rows;assert.deepEqual(entry.frames.map(f=>f.id),f.frameIds);assert.deepEqual(entry.attributes.uses,f.uses);
 if(f.heads){const policies=locationPolicyDetails(entry);assert.deepEqual(policies.find(p=>p.heads!==null).heads.map(h=>h.lemma),f.heads);assert.deepEqual([...new Set(policies.flatMap(p=>p.verbs))].sort(),f.legacyVerbs);}
 assert.ok([...entryExamples(entry),...locationTeachingExamples(entry)].some(e=>e.text===f.example));const r=analyzeSentence(f.example);assert.equal(r.status,f.exampleExpectedStatus);assert.equal(r.pattern,f.examplePattern);
});
test('33E exclusion catches developer, normalization and duplicate reuse',()=>{
 assert.throws(()=>checkStage33Independence([{input:'  THE BOOK IS ON THE TABLE.  '}]),/reused/);
 assert.throws(()=>checkStage33Independence([data.fixtures[0],{...data.fixtures[0],input:data.fixtures[0].input.toUpperCase()}]),/repeated/);
 const b=loadStage33Development();b.inputs[0].input='tampered';assert.throws(()=>validateStage33Development(b));
});
test('33E frozen archived sources reject a changed byte',()=>assert.throws(()=>validateStage33Development(loadStage33Development(),()=>Buffer.from('tampered')),/Frozen source changed/));

test('33E supplementary browser sources also reject reuse without rewriting original answers',()=>{
 for(const input of ['The book is near the tall table.','The bags isn’t under the table.','The bags aren’t under the table.'])assert.throws(()=>checkStage33Independence([{input}]),/reused/);
 assert.equal(loadStage33Acceptance().fixtures.length,88);
 assert.equal(sha256(readFileSync('docs/verification/stage33e-first-run.json')),'b09aa6ca9b0ff132f71e2ef769fb1a12956b86fea12b66dab76c1336a65d0407');
});
