import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeSentence,applyCorrection,validateAnalysisResult} from '../lib/grammar.ts';
import {tokenize} from '../lib/grammar/tokens.ts';
import {compareLexiconExpectation} from './helpers/lexicon-expectations.mjs';
const development=JSON.parse(readFileSync('tests/fixtures/lexicon-development.json'));
const byId=new Map(development.fixtures.map(f=>[f.id,f]));
for(const f of development.fixtures.filter(f=>f.stage===23)) test(`23 fixed answer: ${f.id} ${f.input}`,()=>{
  const r=analyzeSentence(f.input,23);compareLexiconExpectation(f.expected,r);
  assert.equal(r.input,f.input);validateAnalysisResult(r);
});
// These three pre-existing future answers exercise only the existing do rule IDs.
// New be/have predicate corrections remain stage 24 work.
for(const id of ['predicate-error-17','predicate-error-18','predicate-two-errors']) test(`23 existing do correction: ${id}`,()=>{
  const f=byId.get(id);const r=analyzeSentence(f.input,23);compareLexiconExpectation(f.expected,r);
  let input=f.input;
  for(const step of f.steps){const current=analyzeSentence(input,23);input=applyCorrection(current,current.corrections[0].id,input,23);assert.equal(input,step);}
  compareLexiconExpectation(byId.get(f.controlId).expected,analyzeSentence(input));
  assert.throws(()=>applyCorrection(r,r.corrections[0].id,f.input,24),/过期/);
  assert.throws(()=>applyCorrection({...r,ruleVersion:'0.16.0'},r.corrections[0].id,f.input,23),/过期/);
  assert.throws(()=>applyCorrection({...r,lexiconHash:'0'.repeat(64)},r.corrections[0].id,f.input,23),/过期/);
  if(f.id==='predicate-two-errors'){
    const alternate=applyCorrection(r,r.corrections[1].id,f.input,23);
    assert.equal(alternate,"She don't like books.");compareLexiconExpectation(byId.get('predicate-error-17').expected,analyzeSentence(alternate));
  }
});
for(const [input,edits,steps] of [
  ["  She  DON'T  likes books.  ",[[7,12,"DON'T","DOESN'T"],[14,19,'likes','like']],["  She  DOESN'T  likes books.  ","  She  DOESN'T  like books.  "]],
  ["She Don’t like books.",[[4,9,'Don’t','Doesn’t']],["She Doesn’t like books."]],
  ["They doesn’t have books.",[[5,12,'doesn’t','don’t']],["They don’t have books."]],
  ["She didn’t gave him a book.",[[11,15,'gave','give']],["She didn’t give him a book."]],
  ["She can’t goes to school.",[[10,14,'goes','go']],["She can’t go to school."]],
  ["They isn’t kind.",[[5,10,'isn’t','aren’t']],["They aren’t kind."]],
]) test(`23 full-token edit preserves original case, whitespace and negative polarity: ${input}`,()=>{
  const r=analyzeSentence(input,23);assert.equal(r.status,'partial');assert.deepEqual(r.nodes,[]);
  assert.deepEqual(r.corrections.flatMap(c=>c.edits),edits.map(([start,end,expected,replacement])=>({range:{start,end},expected,replacement})));
  if(input==='They isn’t kind.')assert.deepEqual(r.reasons,[{code:'form-mismatch',ranges:[{start:5,end:10}]}]);
  let text=input;
  for(const step of steps){const current=analyzeSentence(text,23);text=applyCorrection(current,current.corrections[0].id,text,23);assert.equal(text,step);}
  const complete=analyzeSentence(text);assert.equal(complete.status,'complete');assert.deepEqual(complete.corrections,[]);
  assert.throws(()=>applyCorrection(r,r.corrections[0].id,text,23),/过期/);
});
for(const input of ["They isn't sleeping.","She haven't slept.","She isn't sleep.","Don't sleep.","She doesn't like books and he don't sleep."]) test(`23 no premature predicate or cross-clause edit: ${input}`,()=>{
  const r=analyzeSentence(input);assert.notEqual(r.status,'complete');assert.deepEqual(r.corrections,[]);assert.deepEqual(r.nodes,[]);
});
test('23 unknown words retain repeated raw offsets; ordinary prototype names are not contractions',()=>{
  const r=analyzeSentence("She doesn’t like music because he doesn’t like music.");
  assert.deepEqual(r.reasons,[{code:'unknown-word',ranges:[{start:17,end:22}],clauseIndex:1},{code:'unknown-word',ranges:[{start:47,end:52}],clauseIndex:2}]);
  assert.deepEqual(r.corrections,[]);assert.deepEqual(tokenize('constructor')[0],{text:'constructor',normalized:'constructor',start:0,end:11});
  assert.equal(analyzeSentence('She likes constructor.').reasons[0].code,'unknown-word');
});
test('23 length boundary and exhausted budget retain the existing limits',async()=>{
  const input="If she doesn’t sleep, he hasn’t smiled.".padEnd(1000,' ');
  assert.equal(analyzeSentence(input).status,'complete');assert.equal(analyzeSentence(input+' ').status,'invalid');
  const {analyzePurpose}=await import('../lib/grammar/purposes.ts');
  const {createBoundaryBudget,forkCandidate}=await import('../lib/grammar/context.ts');
  const r=forkCandidate(analyzeSentence("She doesn’t like books."));
  analyzePurpose(tokenize(r.input),'.',r,createBoundaryBudget(0));assert.equal(r.status,'unsupported');
  assert.deepEqual(r.reasons,[{code:'budget-exceeded',ranges:[]}]);assert.deepEqual(r.nodes,[]);assert.deepEqual(r.corrections,[]);
});
const migrations=JSON.parse(readFileSync('tests/fixtures/lexicon-migrations.json'));
for(const m of migrations.migrations.filter(m=>m.stage===23)) test(`23 historical migration: ${m.id}`,()=>{
  const source=JSON.parse(readFileSync(m.source.file))[m.source.collection][m.source.index];
  assert.equal(source.id??null,m.source.id);assert.equal(source.input,m.input);assert.deepEqual(source.expected,m.newExpected);
  compareLexiconExpectation(m.newExpected,analyzeSentence(m.input));
});
test('23 virtual auxiliary and not share one full original contraction, including UTF-16 offsets',()=>{
  const input='😀  She  DOESN’T sleep.';
  const pair=tokenize(input).filter(t=>t.contraction);
  assert.deepEqual(pair.map(({normalized,text,start,end})=>({normalized,text,start,end})),[
    {normalized:'does',text:'DOESN’T',start:9,end:16},{normalized:'not',text:'DOESN’T',start:9,end:16},
  ]);
  assert.equal(analyzeSentence(input).status,'unsupported');
});
for(const target of ['component','reason','edit'])test(`23 range validation rejects a split contraction: ${target}`,()=>{
  const r=analyzeSentence(target==='component'?"She doesn't sleep.":"She don't like books.");
  if(target==='component')r.nodes.find(n=>n.role==='verb').ranges[0].start=7;
  if(target==='reason')r.reasons[0].ranges=[{start:4,end:6}];
  if(target==='edit')r.corrections[0].edits=[{range:{start:4,end:6},expected:'do',replacement:'does'}];
  assert.throws(()=>validateAnalysisResult(r),/拆分缩写/);
});
