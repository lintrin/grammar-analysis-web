import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeSentence,applyCorrection} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';

const bytes=readFileSync('tests/fixtures/stage29-30-review-fixes.json');
const {fixtures}=JSON.parse(bytes);
const byId=new Map(fixtures.map(f=>[f.id,f]));
test('29/30 scope fixes preserve pre-implementation human answers and controls',()=>{
  const digest='474330ecb063136da255c3462054b1e303bedc2979ee38db0315309d0288b66c';
  assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);
  assert.equal(readFileSync('tests/fixtures/stage29-30-review-fixes.sha256','utf8').trim(),digest);
  assert.equal(fixtures.length,89);
  assert.equal(byId.size,fixtures.length);
  for(const f of fixtures)validateLexiconExpectation(f.input,f.expected);
});
for(const f of fixtures)test(`29/30 scope fix ${f.id}: ${f.input}`,()=>{
  const result=analyzeSentence(f.input,30);
  compareLexiconExpectation(f.expected,result);
  const signature=nodes=>nodes.map(n=>({role:n.role,ranges:n.ranges,ruleId:n.ruleId})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(signature(result.nodes),signature(f.expected.nodes));
  if(f.kind==='error'){
    const control=byId.get(f.controlId);assert.ok(control);
    const next=applyCorrection(result,result.corrections[0].id,f.input,30);
    assert.equal(next,control.input);
    compareLexiconExpectation(control.expected,analyzeSentence(next));
    assert.throws(()=>applyCorrection(result,result.corrections[0].id,f.input,31),/过期/);
  }
});
