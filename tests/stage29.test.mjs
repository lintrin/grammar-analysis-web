import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeSentence,applyCorrection} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';
const bytes=readFileSync('tests/fixtures/stage29-development.json'),{fixtures}=JSON.parse(bytes);
test('29 pre-implementation full answers and minimum coverage remain frozen',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'4c69888afb86ce650971cef8545f717ac58f9f59e77f232b55b1485433616c44');
 assert.equal(fixtures.filter(f=>f.kind==='correct').length,93);assert.equal(fixtures.filter(f=>f.kind==='error').length,15);assert.equal(fixtures.filter(f=>f.kind==='boundary').length,30);
 for(const f of fixtures)validateLexiconExpectation(f.input,f.expected);
});
for(const f of fixtures)test(`29 ${f.id}: ${f.input}`,()=>{
 const r=analyzeSentence(f.input,29);compareLexiconExpectation(f.expected,r);
 if(f.kind==='correct'){
  const signature=nodes=>nodes.map(n=>({role:n.role,ranges:n.ranges,ruleId:n.ruleId})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(signature(r.nodes),signature(f.expected.nodes));
 }
 if(f.kind==='error'){const c=fixtures.find(x=>x.id===f.controlId);assert.ok(c);const next=applyCorrection(r,r.corrections[0].id,f.input,29);assert.equal(next,c.input);compareLexiconExpectation(c.expected,analyzeSentence(next));assert.throws(()=>applyCorrection(r,r.corrections[0].id,f.input,30),/过期/);}
});

import {validateAnalysisResult} from '../lib/grammar.ts';
test('29 questionType is required and validates source roles/purpose/pattern',()=>{
 for(const input of ['Does she sleep?','Who sleeps?','What does she read?','Where does she work?','She sleeps and he smiles.']){
  const r=analyzeSentence(input);assert.equal(r.status,'complete');const old=structuredClone(r);delete old.questionType;assert.throws(()=>validateAnalysisResult(old),/分析数据无效/);
  if(r.complexity==='simple'){
   const wrong=structuredClone(r);wrong.questionType=r.questionType==='wh-subject'?'wh-object':'wh-subject';assert.throws(()=>validateAnalysisResult(wrong),/特殊疑问/);
  }else{const missing=structuredClone(r);delete missing.nodes[0].clause.questionType;assert.throws(()=>validateAnalysisResult(missing),/分句分类/);}
 }
});
