import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeSentence,applyCorrection,validateAnalysisResult} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';
const read=file=>JSON.parse(readFileSync(file));
const development=read('tests/fixtures/lexicon-development.json');
const supplement=read('tests/fixtures/stage24-supplement.json');
const fixtures=[...development.fixtures.filter(f=>f.stage===24),...supplement.fixtures];
const byId=new Map(fixtures.map(f=>[f.id,f]));
const migrations=read('tests/fixtures/lexicon-migrations.json').migrations.filter(m=>m.stage===24);
for(const f of fixtures)test(`24 fixed: ${f.id} ${f.input}`,()=>{
 validateLexiconExpectation(f.input,f.expected);
 const r=analyzeSentence(f.input,24);compareLexiconExpectation(f.expected,r);validateAnalysisResult(r);
 assert.equal(r.input,f.input);
 if(f.kind==='error'){
   let input=f.input;
   for(const step of f.steps){const current=analyzeSentence(input,24);input=applyCorrection(current,current.corrections[0].id,input,24);assert.equal(input,step);}
   compareLexiconExpectation(byId.get(f.controlId).expected,analyzeSentence(input));
   const id=r.corrections[0].id;
   for(const stale of [{inputVersion:25},{ruleVersion:'0.17.0'},{lexiconVersion:'1.1.0'},{lexiconHash:'0'.repeat(64)}])assert.throws(()=>applyCorrection({...r,...stale},id,f.input,24),/过期/);
   assert.throws(()=>applyCorrection(r,id,input,24),/过期/);
   assert.throws(()=>applyCorrection(r,'absent',f.input,24));
 }
});
for(const m of migrations)test(`24 migration: ${m.id} ${m.input}`,()=>{
 const source=read(m.source.file)[m.source.collection][m.source.index];
 assert.equal(source.input,m.input);assert.equal(source.id??null,m.source.id);assert.deepEqual(source.expected,m.newExpected);
 const r=analyzeSentence(m.input,24);compareLexiconExpectation(m.newExpected,r);
 let input=m.input;
 for(const c of r.corrections)input=applyCorrection(r,c.id,input,24);
 assert.equal(input,m.control.input);compareLexiconExpectation(m.control.expected,analyzeSentence(input));
});
test('24 at least ten errors and full controls for each declared category',()=>{
 const pairs=[...fixtures.filter(f=>f.kind==='error').map(f=>({input:f.input,expected:f.expected,control:byId.get(f.controlId)})),...migrations.map(m=>({input:m.input,expected:m.newExpected,control:m.control}))];
 const categories=[p=>p.expected.corrections.some(c=>c.ruleId==='PREDICATE-AGREEMENT-001'),p=>p.expected.corrections.some(c=>c.ruleId==='PREDICATE-FORM-001'),p=>p.expected.corrections.some(c=>c.edits.some(e=>/[’']/.test(e.expected)))];
 for(const category of categories){const rows=pairs.filter(category);assert.ok(new Set(rows.map(p=>p.input)).size>=10);assert.ok(new Set(rows.map(p=>p.control.input)).size>=10);for(const p of rows)assert.equal(p.control.expected.status,'complete');}
 assert.ok(fixtures.filter(f=>f.kind==='boundary'&&f.expected.corrections.length===0).length>=20);
});
for(const [input,ranges] of [
 ['She have sleep.',[{start:4,end:8},{start:9,end:14}]],
 ["They isn't sleep.",[{start:5,end:10},{start:11,end:16}]],
 ["I isn't sleeping.",[{start:2,end:7}]],
 ['She has being sleeping.',[{start:8,end:13}]],
])test(`24 dependent/bridge/unavailable contraction refuses edit: ${input}`,()=>{
 const r=analyzeSentence(input);assert.equal(r.status,'partial');assert.deepEqual(r.reasons,[{code:'form-mismatch',ranges}]);
 for(const field of ['purpose','pattern','complexity','tense','aspect','voice'])assert.equal(r[field],null);
 assert.deepEqual(r.nodes,[]);assert.deepEqual(r.corrections,[]);
});
