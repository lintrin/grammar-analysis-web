import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeSentence,applyCorrection,validateAnalysisResult,tokenize} from '../lib/grammar.ts';
import {analyzePurpose} from '../lib/grammar/purposes.ts';
import {forkCandidate} from '../lib/grammar/context.ts';
import {frozenStage33File,compareStage33Expectation} from './helpers/stage33-fixtures.mjs';
const fixtures=frozenStage33File('tests/fixtures/stage33-development.json').fixtures;
const migrations=frozenStage33File('tests/fixtures/stage33-migrations.json').migrations;
const byId=new Map(fixtures.map(f=>[f.id,f]));
for(const f of [...fixtures,...migrations])test(`33C frozen complete comparison: ${f.id??f.source.id} ${f.input}`,()=>{
 const r=analyzeSentence(f.input,33);validateAnalysisResult(r);compareStage33Expectation(f.expected,r);
 assert.deepEqual(analyzeSentence(f.input,33),r);assert.equal(r.input,f.input);
 if(f.kind==='error'){
  const control=byId.get(f.controlId);const next=applyCorrection(r,r.corrections[0].id,f.input,33);assert.equal(next,control.input);compareStage33Expectation(control.expected,analyzeSentence(next,34));
  for(const stale of [{inputVersion:34},{ruleVersion:'stale'},{lexiconVersion:'stale'},{lexiconHash:'0'.repeat(64)}])assert.throws(()=>applyCorrection({...r,...stale},r.corrections[0].id,f.input,33),/过期/);
  assert.throws(()=>applyCorrection(r,r.corrections[0].id,f.input+' ',33),/过期/);
 }
});
for(const input of ['The book is on the table.','The young teachers aren’t near the blue buses.','Is the old book under the small chair?','Where were the young artists?','The books is near the bus.'])test(`33C shared budget clears every tentative role and correction: ${input}`,()=>{
 const tokens=tokenize(input),punctuation=tokens.pop().text;
 let total=0;const full=forkCandidate(analyzeSentence(input));analyzePurpose(tokens,punctuation,full,()=>{total++;return true;});assert.ok(total<4000);assert.ok(['complete','partial'].includes(full.status));
 let attempts=0;const empty=forkCandidate(analyzeSentence(input));analyzePurpose(tokens,punctuation,empty,()=>++attempts<total);
 assert.equal(empty.status,'unsupported');assert.equal(empty.reasons[0].code,'budget-exceeded');assert.deepEqual(empty.nodes,[]);assert.deepEqual(empty.corrections,[]);
 for(const field of ['purpose','pattern','complexity','tense','aspect','voice','modal','questionType'])assert.equal(empty[field],null);
 validateAnalysisResult(empty);
});
for(const input of ['Where were the young artists?','The old books are not under the tall chairs.'])test(`33C exact input limit retains original offsets: ${input}`,()=>{
 const r=analyzeSentence(input.padEnd(1000,' '));assert.equal(r.status,'complete');validateAnalysisResult(r);assert.equal(analyzeSentence(input.padEnd(1001,' ')).status,'invalid');
 const prefix=' '.repeat(1000-input.length);const moved=analyzeSentence(prefix+input);assert.equal(moved.status,'complete');assert.deepEqual(moved.nodes.map(n=>n.ranges),r.nodes.map(n=>n.ranges.map(q=>({start:q.start+prefix.length,end:q.end+prefix.length}))));
});
test('33C bag repair preserves all 231 reviewed entries and the frozen fixture hashes',()=>{
 const old=JSON.parse(readFileSync('data/lexicon/releases/1.8.0.json'));
 const release=JSON.parse(readFileSync('data/lexicon/releases/1.8.1.json'));assert.equal(release.entries.length,232);
 for(const e of old.entries)assert.deepEqual(release.entries.find(n=>n.id===e.id),e);
 const bag=release.entries.find(e=>e.id==='noun:lexical:bag');assert.deepEqual(bag.forms.map(f=>[f.kind,f.surface]),[['plural','bags'],['singular','bag']]);assert.equal(bag.attributes.person,false);
 assert.equal(analyzeSentence('The bag is on the table.').status,'complete');
 assert.equal(analyzeSentence('The book is near the bag.').status,'unsupported');
 frozenStage33File('tests/fixtures/stage33-development.json');frozenStage33File('tests/fixtures/stage33-migrations.json');
});

test('33C corrections require the target be frame license as well as the original frame',async()=>{
 const {default:snapshot}=await import('../lib/grammar/generated/lexicon.json',{with:{type:'json'}});
 const target=snapshot.entries.find(e=>e.lemma==='are').frames.find(f=>f.id==='location');
 const purposes=target.allowedPurposes;target.allowedPurposes=['interrogative'];
 try{const r=analyzeSentence('The books is near the car.');assert.equal(r.status,'partial');assert.deepEqual(r.corrections,[]);assert.deepEqual(r.nodes,[]);}finally{target.allowedPurposes=purposes;}
 assert.equal(analyzeSentence('The books is near the car.').corrections.length,1);
});
test('33C runtime consumes audited head policies rather than a second whitelist',async()=>{
 const {default:snapshot}=await import('../lib/grammar/generated/lexicon.json',{with:{type:'json'}});
 const entry=snapshot.entries.find(e=>e.lemma==='on');const heads=entry.attributes.locationHeadPolicies['basic-object-location'];
 entry.attributes.locationHeadPolicies['basic-object-location']=['noun:lexical:chair'];
 try{const r=analyzeSentence('The book is on the table.');assert.equal(r.status,'unsupported');assert.deepEqual(r.nodes,[]);assert.deepEqual(r.corrections,[]);}finally{entry.attributes.locationHeadPolicies['basic-object-location']=heads;}
 assert.equal(analyzeSentence('The book is on the table.').status,'complete');
});
