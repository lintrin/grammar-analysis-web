import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeSentence,applyCorrection,LEXICON_VERSION,LEXICON_HASH} from '../lib/grammar.ts';
import {compareLexiconExpectation,validateLexiconExpectation} from './helpers/lexicon-expectations.mjs';
import {loadVerbExpansion,prepareVerbExpansion} from '../scripts/prepare-stage26-lexicon.mjs';
import {openDatabase,migrate,importData,query} from '../scripts/lexicon/store.mjs';
import {validateRelease,rebuild,review,publish,trustedRelease} from '../scripts/lexicon/release.mjs';
import {canonical} from '../scripts/lexicon/data.mjs';
import {surfaceCandidates} from '../lib/grammar/vocabulary.ts';
import {instrumentBoundaries} from './helpers/stage12-performance.mjs';

const scope = JSON.parse(readFileSync('data/lexicon/stage26-scope.json'));
const answerBytes = readFileSync('tests/fixtures/stage26-verbs.json');
const {fixtures} = JSON.parse(answerBytes);
const byId = new Map(fixtures.map(f=>[f.id,f]));
const draft = JSON.parse(readFileSync('data/lexicon/stage26-import.json'));
const old = validateRelease(JSON.parse(readFileSync('data/lexicon/releases/1.2.0.json')));
const current = trustedRelease().release;

test('26 human-fixed inventory and full answers precede analyzer checks',()=>{
  assert.equal(createHash('sha256').update(answerBytes).digest('hex'),'45a39ee3e0b14dec5727028859d5342df597c417b35e5a28cb3a9e4f1038bb0e');
  assert.equal(scope.verbs.length,73);assert.equal(fixtures.length,812);assert.equal(byId.size,812);
  assert.equal(new Set(fixtures.map(f=>f.input.toLowerCase().replace(/\s+/g,' ').trim())).size,812);
  for(const f of fixtures)validateLexiconExpectation(f.input,f.expected);
  for(const v of scope.verbs) {
    for(const tag of ['base','third','past','participle','progressive','negative','do-error','participle-error','wrong-frame'])assert.ok(byId.has(`${v.lemma}-${tag}`));
    assert.equal(byId.get(`${v.lemma}-progressive`).expected.status,v.progressive?'complete':'unsupported');
    assert.equal(byId.has(`${v.lemma}-passive`),v.passive);assert.equal(byId.has(`${v.lemma}-imperative`),v.imperative);
  }
});
for(const f of fixtures)test(`26 fixed answer: ${f.id} ${f.input}`,()=>{
  const result=analyzeSentence(f.input,26);compareLexiconExpectation(f.expected,result);
  assert.equal(result.lexiconVersion,LEXICON_VERSION);assert.equal(result.lexiconHash,LEXICON_HASH);
  if(f.kind==='error') {
    assert.equal(result.corrections.length,1);
    const next=applyCorrection(result,result.corrections[0].id,f.input,26),control=byId.get(f.controlId);
    assert.equal(next,control.input);compareLexiconExpectation(control.expected,analyzeSentence(next,27));
    assert.throws(()=>applyCorrection(result,result.corrections[0].id,f.input,27),/过期/);
    assert.throws(()=>applyCorrection({...result,lexiconVersion:'1.2.0'},result.corrections[0].id,f.input,26),/过期/);
  }
});
test('26 source-backed drafts preserve exactly the reviewed old entries and reach 100 lemmas',()=>{
  assert.equal(current.lexiconVersion,'1.3.0');assert.equal(current.entries.length,222);
  assert.equal(current.lexiconHash,'186cc285dde606b71eea12526a65aa0a0290f585987b99e1bc9a530b480abf1c');
  for(const e of old.entries)assert.deepEqual(current.entries.find(x=>x.id===e.id),e);
  const verbs=current.entries.filter(e=>e.partOfSpeech==='verb');assert.equal(verbs.length,100);assert.equal(new Set(verbs.map(e=>e.lemma)).size,100);
  assert.deepEqual(Object.fromEntries(['SV','SVO','SVOO','SVOC'].map(p=>[p,verbs.filter(e=>e.frames.some(f=>f.pattern===p)).length])),{SV:26,SVO:59,SVOO:12,SVOC:3});
  assert.equal(canonical(loadVerbExpansion()),canonical(draft));
  assert.equal(readFileSync('public/licenses/lemminflect.txt','utf8'),readFileSync('data/lexicon/sources/lemminflect/LICENSE','utf8'));
});
test('26 source adapter rejects tampering and unsupported spellings without guessing',()=>{
  const sourceFiles=Object.fromEntries(['verbs.csv','overrides.csv','LICENSE'].map(n=>[n,readFileSync(`data/lexicon/sources/lemminflect/${n}`)]));
  const provenance=JSON.parse(readFileSync('data/lexicon/sources/lemminflect/provenance.json'));
  assert.equal(provenance.commit,'b7699808106a4ce843fc7f0e8e5d87fcb84cc636');
  assert.throws(()=>prepareVerbExpansion(scope,{...sourceFiles,'verbs.csv':Buffer.from('bad')},provenance),/hash mismatch/);
  const bad=structuredClone(scope);bad.verbs.find(v=>v.lemma==='swim').forms.past='swimmed';
  assert.throws(()=>prepareVerbExpansion(bad,sourceFiles,provenance),/Unreviewed source spelling/);
  // The upstream override must take precedence, rather than silently accepting staid.
  const stay=draft.entries.find(e=>e.lemma==='stay');assert.equal(stay.forms.find(f=>f.kind==='participle').surface,'stayed');
});
test('26 draft approval binding and explicit release selection reproduce 1.3.0 from an empty database',t=>{
  const db=openDatabase(':memory:',true);t.after(()=>db.close());migrate(db);rebuild(db,old,old.lexiconHash);importData(db,draft);
  const rows=query(db).filter(r=>r.status==='draft');assert.equal(rows.length,73);
  const selection=JSON.parse(readFileSync('data/lexicon/stage26-selection.json'));
  assert.throws(()=>publish(db,selection),/approved/);
  assert.throws(()=>review(db,rows[0].entry.revisionId,'0'.repeat(64),'stage26-fixed-scope-audit','approve'),/current draft hash/);
  for(const row of rows)review(db,row.entry.revisionId,row.contentHash,'stage26-fixed-scope-audit','approve');
  assert.equal(canonical(publish(db,selection)),canonical(current));
});
test('26 lexical/adjective collisions and homographs retain every source interpretation',()=>{
  assert.deepEqual(new Set(surfaceCandidates('clean',()=>true).map(c=>c.formKind)),new Set(['base','positive']));
  for(const word of ['cut','hit'])assert.deepEqual(new Set(surfaceCandidates(word,()=>true).map(c=>c.formKind)),new Set(['base','past','participle']));
  const candidates=surfaceCandidates('clean',()=>true);assert.equal(candidates.length,2);
  let n=0;assert.equal(surfaceCandidates('cut',()=>++n<=2),null);assert.equal(n,3);
});
test('26 expanded dictionary keeps the input and shared ambiguity budget bounded',()=>{
  const ordinary=('The '+ 'tall '.repeat(145)+'teacher opens the door.').padEnd(1000,' ');
  assert.equal(analyzeSentence(ordinary).status,'complete');
  assert.equal(analyzeSentence(ordinary+' ').status,'invalid');
  const collision=('The '+ 'clean '.repeat(145)+'teacher opens the door.').padEnd(1000,' ');
  const bounded=instrumentBoundaries(collision);
  assert.ok(bounded.accepted<=4000);assert.equal(bounded.result.status,'complete');
  assert.deepEqual(bounded.result.reasons,[]);assert.deepEqual(bounded.result.corrections,[]);
  assert.equal(bounded.result.nodes.filter(n=>n.role==='attribute').length,145);
  assert.equal(bounded.result.nodes.find(n=>n.role==='verb').ranges[0].start,collision.indexOf('opens'));
  const empty=instrumentBoundaries('She has eaten the apple.',0);
  assert.equal(empty.attempts,1);assert.equal(empty.result.status,'unsupported');
  assert.deepEqual(empty.result.nodes,[]);assert.deepEqual(empty.result.corrections,[]);
});
test('26 determiner pruning preserves finite clean and every fixed role and modifier',()=>{
  const input='The clean teacher cleans the clean door.';
  const roots=[['subject','The clean teacher'],['verb','cleans'],['object','the clean door']];
  let cursor=0;
  const nodes=roots.map(([role,text],i)=>{const start=input.indexOf(text,cursor);cursor=start+text.length;return {key:String(i),parentKey:null,role,implicit:false,ranges:[{start,end:cursor}]};});
  for(const [key,parentKey,start] of [['a1','0',4],['a2','2',29]])nodes.push({key,parentKey,role:'attribute',implicit:false,ranges:[{start,end:start+5}]});
  const expected={status:'complete',purpose:'declarative',pattern:'SVO',complexity:'simple',tense:'present',aspect:'simple',voice:'active',nodes,reasons:[],corrections:[]};
  compareLexiconExpectation(expected,analyzeSentence(input));
  const wrong='She clean the door.',partial=analyzeSentence(wrong);
  assert.equal(partial.status,'partial');assert.deepEqual(partial.corrections.map(({ruleId,edits})=>({ruleId,edits})),[{ruleId:'AGREEMENT-001',edits:[{range:{start:4,end:9},expected:'clean',replacement:'cleans'}]}]);
  assert.equal(applyCorrection(partial,partial.corrections[0].id,wrong,0),'She cleans the door.');
});
