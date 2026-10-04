import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {queryDictionary,locationPolicyDetails,locationTeachingExamples,entryNotes} from '../lib/grammar/dictionary.ts';
import {analyzeSentence} from '../lib/grammar.ts';
const path='data/grammar/stage33d-teaching.json',fixed=JSON.parse(readFileSync(path));
test('33D human teaching expectations retain frozen hash',()=>assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),readFileSync('tests/fixtures/stage33d-teaching.sha256','utf8').trim()));
for(const q of fixed.queries)test(`33D released policy query ${q.word}`,()=>{
 const [entry]=queryDictionary(q.word,'function-word'),policies=locationPolicyDetails(entry);
 assert.deepEqual(policies.find(p=>p.heads!==null).heads.map(h=>h.lemma),q.heads);
 assert.deepEqual([...new Set(policies.flatMap(p=>p.verbs))].sort(),q.verbs);
 for(const p of policies.filter(p=>p.heads!==null))for(const h of p.heads)assert.equal(h.forms.length,2);
});
for(const e of fixed.examples)test(`33D reviewed teaching ${e.text}`,()=>{
 const result=analyzeSentence(e.text);
 for(const [key,value]of Object.entries(e.expected))assert.deepEqual(result[key],value,key);
 assert.deepEqual(result.reasons,[]);assert.deepEqual(result.corrections,[]);
 const entry=queryDictionary(e.text.startsWith('I am')?'am':e.entryId.split(':').at(-1),'function-word')[0];
 assert.ok(locationTeachingExamples(entry).some(x=>x.text===e.text));
 if(e.frameId)assert.equal(entry.frames.find(f=>f.id===e.frameId).location.attachment,'complement');
});
for(const sentence of fixed.boundaries)test(`33D displayed boundary ${sentence}`,()=>{
 const r=analyzeSentence(sentence);assert.equal(r.status,'unsupported');assert.deepEqual(r.corrections,[]);
});
test('33D be bridge explicitly excludes new location inheritance',()=>assert.match(entryNotes(queryDictionary('be')[0]).join(''),/地点表语不继承/));
test('33D unknown local query stays empty',()=>assert.deepEqual(queryDictionary('planet'),[]));
test('33D finite be retains two independent frames',()=>{
 for(const word of ['am','is','are','was','were']){
  const [e]=queryDictionary(word,'function-word');assert.deepEqual(e.frames.map(f=>f.id),['location','primary']);
  const location=e.frames[0];assert.equal(location.allowPerfect,false);assert.equal(location.allowProgressive,false);
  assert.equal(e.frames[1].allowPerfect,true);assert.equal(locationTeachingExamples(e).length,1);
 }
});
