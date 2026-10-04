// 33A scope gates only. Runtime acceptance is scripts/stage33/check-development.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {frozenStage33File,normalizeStage33Input,validateStage33Expectation,sha256} from './helpers/stage33-fixtures.mjs';
const development=frozenStage33File('tests/fixtures/stage33-development.json');
const migrations=frozenStage33File('tests/fixtures/stage33-migrations.json');
const matrix=JSON.parse(readFileSync('data/grammar/stage33-capabilities.json'));
const design=JSON.parse(readFileSync(matrix.locationPolicySource));
const {fixtures}=development;
test('33A frozen human answers meet all per-structure gates and retain exact controls',()=>{
  const inputs=fixtures.map(f=>normalizeStage33Input(f.input));assert.equal(new Set(inputs).size,inputs.length);
  const ids=new Map(fixtures.map(f=>[f.id,f]));assert.equal(ids.size,fixtures.length);
  for(const category of Object.keys(matrix.structures)) {
    assert.ok(fixtures.filter(f=>f.kind==='correct'&&f.category===category).length>=matrix.minimums.correctPerStructure);
    assert.ok(fixtures.filter(f=>f.kind==='error'&&f.category===category).length>=matrix.minimums.correctionPerStructure);
  }
  assert.ok(fixtures.filter(f=>f.kind==='boundary').length>=matrix.minimums.boundaries);
  for(const f of fixtures){
    validateStage33Expectation(f.input,f.expected);
    if(f.kind==='error'){
      const c=ids.get(f.controlId);assert.ok(c);assert.equal(c.expected.status,'complete');
      assert.equal(c.category,f.category);
      const edit=f.expected.corrections[0].edits[0];assert.equal(f.input.slice(0,edit.range.start)+edit.replacement+f.input.slice(edit.range.end),c.input);
      assert.equal(c.expected.tense,['was','were',"wasn't","weren't",'wasn’t','weren’t'].includes(edit.expected.toLowerCase())?'past':'present');
    }
    if(f.kind==='boundary')assert.deepEqual(f.expected.corrections,[]);
  }
});
test('33A policy authority covers ten pairs and retains the six old SV licenses',()=>{
  const snapshot=JSON.parse(readFileSync('data/lexicon/releases/1.7.0.json'));
  const entries=new Map(snapshot.entries.map(e=>[e.id,e]));
  const pairs=[];
  for(const p of design.prepositions){
    assert.equal(entries.get(p.entryId).lemma,p.lemma);assert.ok(entries.get(p.entryId).attributes.uses.includes('location-preposition'));
    const heads=p.locationHeadPolicies[matrix.locationPolicyId];assert.equal(new Set(heads).size,heads.length);
    for(const id of heads){assert.equal(entries.get(id).partOfSpeech,'noun');pairs.push([p.lemma,entries.get(id)]);}
  }
  assert.equal(pairs.length,10);
  for(const [preposition,head] of pairs)assert.ok(fixtures.some(f=>f.kind==='correct'&&f.expected.nodes.some(n=>n.role==='complement'&&n.ranges.some(q=>{
    const words=f.input.slice(q.start,q.end).toLowerCase().trim().split(/\s+/);return words[0]===preposition&&head.forms.some(form=>form.surface===words.at(-1));
  }))),`Uncovered pair ${preposition}/${head.lemma}`);
  for(const {entryId,frameId,policyId:policy} of design.legacySVFramePolicies){
    const previous=entries.get(entryId).frames.find(f=>f.id===frameId);assert.ok(previous);
    assert.deepEqual(design.prepositions.filter(p=>Object.hasOwn(p.locationHeadPolicies,policy)).map(p=>p.lemma).sort(),previous.fixedTail.slice(9).split(',').sort());
  }
  assert.equal(design.newFiniteBeFrame.location.presence,'required');assert.equal(design.legacySVMigration.presence,'optional');assert.equal(design.futureStage34Reference.enabledInStage33,false);
});
test('33A migration source answers and bytes remain unchanged',()=>{
  assert.equal(migrations.migrations.length,3);
  for(const m of migrations.migrations){
    const bytes=readFileSync(m.source.path);assert.equal(sha256(bytes),m.source.sha256);
    const row=JSON.parse(bytes).fixtures.find(f=>f.id===m.source.id);assert.equal(row.input,m.input);assert.deepEqual(row.expected,m.original);
    validateStage33Expectation(m.input,m.expected);
  }
});
test('33A negative fixture validation detects missing classification, split contraction and wrong ownership',()=>{
  const good=fixtures.find(f=>f.kind==='correct'&&f.category==='where');
  const missing=structuredClone(good.expected);delete missing.questionType;assert.throws(()=>validateStage33Expectation(good.input,missing));
  const split=fixtures.find(f=>f.kind==='correct'&&f.input.includes("isn't"));const bad=structuredClone(split.expected);bad.nodes.find(n=>n.role==='verb').ranges[0].end-=1;assert.throws(()=>validateStage33Expectation(split.input,bad),/Contraction/);
  const attributed=fixtures.find(f=>f.expected.nodes.some(n=>n.role==='attribute'));const wrong=structuredClone(attributed.expected);wrong.nodes.find(n=>n.role==='attribute').parentKey='missing';assert.throws(()=>validateStage33Expectation(attributed.input,wrong));
  const edit=fixtures.find(f=>f.kind==='error');const invalid=structuredClone(edit.expected);invalid.corrections[0].edits[0].expected='wrong';assert.throws(()=>validateStage33Expectation(edit.input,invalid));
});
