import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeSentence,applyCorrection} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';

const bytes=readFileSync('tests/fixtures/stage29-review-fixes.json');
const {fixtures}=JSON.parse(bytes);
const byId=new Map(fixtures.map(f=>[f.id,f]));
test('29 review fixes retain manually fixed full expectations and safe controls',()=>{
  const digest='8392301ec6f58ba2f54ee489dc65765add4c6585bfc81c6cfaec9a7c18612aea';
  assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);
  assert.equal(readFileSync('tests/fixtures/stage29-review-fixes.sha256','utf8').trim(),digest);
  assert.equal(fixtures.length,40);
  assert.equal(createHash('sha256').update(readFileSync('tests/fixtures/stage29-review-fixes-initial.json')).digest('hex'),JSON.parse(bytes).revisions[0].fromSha256);
  for(const f of fixtures)validateLexiconExpectation(f.input,f.expected);
});
for(const f of fixtures)test(`29 review fix ${f.id}: ${f.input}`,()=>{
  const result=analyzeSentence(f.input,29);
  compareLexiconExpectation(f.expected,result);
  const signature=nodes=>nodes.map(n=>({role:n.role,ranges:n.ranges,ruleId:n.ruleId})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(signature(result.nodes),signature(f.expected.nodes));
  if(f.kind==='error'){
    const control=byId.get(f.controlId);assert.ok(control);
    const next=applyCorrection(result,result.corrections[0].id,f.input,29);
    assert.equal(next,control.input);
    compareLexiconExpectation(control.expected,analyzeSentence(next));
    assert.throws(()=>applyCorrection(result,result.corrections[0].id,f.input,30),/过期/);
  }
});
