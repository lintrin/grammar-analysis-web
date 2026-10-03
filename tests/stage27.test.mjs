import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeSentence,applyCorrection,validateAnalysisResult} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';
const bytes=readFileSync('tests/fixtures/stage27-development.json'),{fixtures}=JSON.parse(bytes);
test('27 pre-implementation full answers and minimum coverage remain frozen',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'eeb07adc4ee3058842bb222f86be9d2ab0c2a2c6c1d716f662ae49723da9fef9');
 assert.equal(fixtures.filter(f=>f.kind==='correct').length,40);assert.equal(fixtures.filter(f=>f.kind==='error').length,15);assert.equal(fixtures.filter(f=>f.kind==='boundary').length,25);
 for(const f of fixtures)validateLexiconExpectation(f.input,f.expected);
});
for(const f of fixtures)test(`27 ${f.id}: ${f.input}`,()=>{
 const r=analyzeSentence(f.input,27);compareLexiconExpectation(f.expected,r);
 if(f.kind==='correct'){
  const signature=nodes=>nodes.map(n=>({role:n.role,ranges:n.ranges,ruleId:n.ruleId})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(signature(r.nodes),signature(f.expected.nodes));
 }
 if(f.kind==='error'){const c=fixtures.find(x=>x.id===f.controlId);assert.ok(c);const next=applyCorrection(r,r.corrections[0].id,f.input,27);assert.equal(next,c.input);compareLexiconExpectation(c.expected,analyzeSentence(next));assert.throws(()=>applyCorrection(r,r.corrections[0].id,f.input,28),/过期/);}
});
test('27 mandatory modal rejects missing/invalid classifications including clauses',()=>{
 for(const input of ['She reads the book.','She can read the book.','She will read the book.','She will sleep and he reads the book.']){
  const r=analyzeSentence(input);assert.equal(r.status,'complete');const missing=structuredClone(r);delete missing.modal;assert.throws(()=>validateAnalysisResult(missing),/分析数据无效/);
  if(r.complexity==='simple'){const invalid={...r,modal:'will',tense:'present'};assert.throws(()=>validateAnalysisResult(invalid),/情态分类/);}else{const invalid=structuredClone(r);delete invalid.nodes[0].clause.modal;assert.throws(()=>validateAnalysisResult(invalid),/分句分类/);}
 }
});

for(const f of JSON.parse(readFileSync('tests/fixtures/structure-migrations.json')).migrations)test(`27 migrated ${f.input}`,()=>compareLexiconExpectation(f.expected,analyzeSentence(f.input)));

test('27 modal must agree with the actual predicate, including a clause',()=>{
 for(const input of ['She can sleep.','She will sleep.','She can sleep and he smiles.']){
  const r=analyzeSentence(input),bad=structuredClone(r);
  if(r.complexity==='simple')bad.modal=r.modal==='can'?'will':null;else bad.nodes[0].clause.modal='will';
  assert.throws(()=>validateAnalysisResult(bad),/情态/);
 }
});
