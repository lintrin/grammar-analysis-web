import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSentence,applyCorrection,validateAnalysisResult} from '../lib/grammar.ts';
import {queryDictionary,matchingForms} from '../lib/grammar/dictionary.ts';
import {loadStage32Acceptance,loadStage32Queries,loadStage32Baseline,validateStage32Baseline,checkStage32Independence,compareStage32} from './helpers/stage32-fixtures.mjs';
import {baselineHash} from './helpers/historical-independence.mjs';
const data=loadStage32Acceptance(),byId=new Map(data.fixtures.map(f=>[f.id,f]));
for(const f of data.fixtures)test(`32 independent ${f.id}: ${f.input}`,()=>{
 const r=analyzeSentence(f.input,32);validateAnalysisResult(r);compareStage32(f.expected,r);
 assert.equal(r.input,f.input);assert.equal(r.inputVersion,32);
 if(f.kind==='error'){
  const c=byId.get(f.controlId);assert.equal(c.kind,'control');const next=applyCorrection(r,r.corrections[0].id,f.input,32);assert.equal(next,c.input);compareStage32(c.expected,analyzeSentence(next,33));
  for(const stale of [{inputVersion:33},{ruleVersion:'stale'},{lexiconVersion:'stale'},{lexiconHash:'0'.repeat(64)}])assert.throws(()=>applyCorrection({...r,...stale},r.corrections[0].id,f.input,32),/过期/);
  assert.throws(()=>applyCorrection(r,r.corrections[0].id,next,32),/过期/);
 }
});
for(const f of loadStage32Queries().fixtures)test(`32 independent query ${f.query}/${f.pos}`,()=>{
 const rows=queryDictionary(f.query,f.pos);assert.deepEqual(rows.map(e=>e.id),f.ids);assert.deepEqual(matchingForms(rows[0],f.query).map(f=>f.kind),f.formKinds);assert.deepEqual(rows[0].frames.map(f=>f.pattern),f.patterns);
});
test('32 immutable provenance rejects missing, edited and self-rehashed baseline',()=>{
 assert.throws(()=>validateStage32Baseline(null),/Missing/);const b=structuredClone(loadStage32Baseline());b.inputs.pop();assert.throws(()=>validateStage32Baseline(b),/content changed/);const payload={...b};delete payload.contentHash;b.contentHash=baselineHash(payload);assert.throws(()=>validateStage32Baseline(b),/hash changed/);
});
test('32 independence rejects historical, migration, teaching, generated carriers and internal duplicates',()=>{
 const b=loadStage32Baseline();for(const path of ['tests/fixtures/stage12.json','tests/fixtures/structure-migrations.json','data/grammar/query-examples.json','tests/baselines/stage32-runtime-inputs.json']){const row=b.inputs.find(i=>i.sources.includes(path)&&/\.$/.test(i.input));assert.ok(row,path);assert.throws(()=>checkStage32Independence([{input:row.input}],b),/reused/);}
 const f=data.fixtures[0];assert.throws(()=>checkStage32Independence([f,{input:`  ${f.input.toUpperCase().replaceAll(' ','  ')} `}],b),/Duplicate/);
});
test('32 complete comparison rejects wrong rule, range, ownership, modal, WH role, reason and edit',()=>{
 for(const mutate of [e=>{e.modal=null;},e=>{e.nodes[0].ruleId='wrong';},e=>{e.nodes[0].ranges[0].end--;},e=>{e.nodes.find(n=>n.role==='attribute').parentKey=null;}]){const f=data.fixtures[0],e=structuredClone(f.expected);mutate(e);assert.throws(()=>compareStage32(e,analyzeSentence(f.input)));}
 const w=data.fixtures.find(f=>f.category==='wh'),we=structuredClone(w.expected);we.nodes[0].role='object';assert.throws(()=>compareStage32(we,analyzeSentence(w.input)));
 const f=data.fixtures.find(f=>f.kind==='error');for(const mutate of [e=>{e.reasons=[];},e=>{e.corrections[0].edits[0].replacement='wrong';}]){const e=structuredClone(f.expected);mutate(e);assert.throws(()=>compareStage32(e,analyzeSentence(f.input)));}
});
