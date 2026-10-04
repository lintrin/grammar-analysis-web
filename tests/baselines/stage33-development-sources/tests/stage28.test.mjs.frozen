import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeSentence,applyCorrection} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';
const bytes=readFileSync('tests/fixtures/stage28-development.json'),{fixtures}=JSON.parse(bytes);
test('28 pre-implementation full answers and minimum coverage remain frozen',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'cc486237ad22de513e8f6052b8d4cd65b9e5a7aafdaf9cd44610a23803a7cb91');
 assert.equal(fixtures.filter(f=>f.kind==='correct').length,48);assert.equal(fixtures.filter(f=>f.kind==='error').length,12);assert.equal(fixtures.filter(f=>f.kind==='boundary').length,24);
 for(const f of fixtures)validateLexiconExpectation(f.input,f.expected);
});
for(const f of fixtures)test(`28 ${f.id}: ${f.input}`,()=>{
 const r=analyzeSentence(f.input,28);compareLexiconExpectation(f.expected,r);
 if(f.kind==='correct'){
  const signature=nodes=>nodes.map(n=>({role:n.role,ranges:n.ranges,ruleId:n.ruleId})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(signature(r.nodes),signature(f.expected.nodes));
 }
 if(f.kind==='error'){const c=fixtures.find(x=>x.id===f.controlId);assert.ok(c);const next=applyCorrection(r,r.corrections[0].id,f.input,28);assert.equal(next,c.input);compareLexiconExpectation(c.expected,analyzeSentence(next));assert.throws(()=>applyCorrection(r,r.corrections[0].id,f.input,29),/过期/);}
});

import {instrumentBoundaries} from './helpers/stage12-performance.mjs';
test('28 all location boundaries share the lexical and core budget',()=>{
 for(const input of ['She sleeps near the table.','She is sleeping near the table.','Does she sleep near the tall table?']){
  const empty=instrumentBoundaries(input,0);assert.equal(empty.attempts,1);assert.equal(empty.result.reasons[0].code,'budget-exceeded');assert.deepEqual(empty.result.nodes,[]);assert.deepEqual(empty.result.corrections,[]);
  const normal=instrumentBoundaries(input);assert.ok(normal.accepted<=4000);assert.equal(normal.result.status,'complete');
 }
});
