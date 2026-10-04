import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeSentence,applyCorrection} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';
const bytes=readFileSync('tests/fixtures/stage30-development.json'),{fixtures}=JSON.parse(bytes);
test('30 pre-implementation full answers and minimum coverage remain frozen',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'ae99f9081d292bec85a133c7c6adac44553ee0f9d56f0fcc836f3ab0e12e9d68');
 assert.equal(fixtures.filter(f=>f.kind==='correct').length,65);assert.equal(fixtures.filter(f=>f.kind==='error').length,10);assert.equal(fixtures.filter(f=>f.kind==='boundary').length,29);
 for(const f of fixtures)validateLexiconExpectation(f.input,f.expected);
});
for(const f of fixtures)test(`30 ${f.id}: ${f.input}`,()=>{
 const r=analyzeSentence(f.input,30);compareLexiconExpectation(f.expected,r);
 if(f.kind==='correct'){
  const signature=nodes=>nodes.map(n=>({role:n.role,ranges:n.ranges,ruleId:n.ruleId})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(signature(r.nodes),signature(f.expected.nodes));
 }
 if(f.kind==='error'){const c=fixtures.find(x=>x.id===f.controlId);assert.ok(c);const next=applyCorrection(r,r.corrections[0].id,f.input,30);assert.equal(next,c.input);compareLexiconExpectation(c.expected,analyzeSentence(next));assert.throws(()=>applyCorrection(r,r.corrections[0].id,f.input,31),/过期/);}
});

