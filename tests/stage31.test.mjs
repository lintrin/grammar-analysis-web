import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {queryDictionary,matchingForms,frameCapabilities,frameExample,entryNotes,entrySources,assertDictionaryIdentity} from '../lib/grammar/dictionary.ts';
import {analyzeSentence,applyCorrection} from '../lib/grammar.ts';
const read=p=>JSON.parse(readFileSync(p));
const fixturePath='tests/fixtures/stage31-queries.json',fixtures=read(fixturePath).fixtures;
const snapshot=read('lib/grammar/generated/lexicon.json'),examples=read('data/grammar/query-examples.json').examples;
const stage26=read('data/lexicon/stage26-scope.json'),stage28=read('data/grammar/stage28-capabilities.json'),stage30=read('data/grammar/stage30-capabilities.json');
test('Stage 31 fixed query and teaching answers retain their pre-implementation hashes',()=>{
  for(const [path,hash] of [[fixturePath,'tests/fixtures/stage31-queries.sha256'],['data/grammar/query-examples.json','tests/fixtures/stage31-examples.sha256']])assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),readFileSync(hash,'utf8').trim());
  assert.equal(fixtures.length,27);assert.equal(examples.filter(e=>e.frameId!==null).length,105);
});
for(const f of fixtures)test(`Stage 31 query ${JSON.stringify(f.query)} / ${f.pos}`,()=>{
  const results=queryDictionary(f.query,f.pos);assert.deepEqual(results.map(e=>e.id),f.ids);
  if(f.formKinds)assert.deepEqual(matchingForms(results[0],f.query).map(f=>f.kind),f.formKinds);
  if(f.patterns)assert.deepEqual(results[0].frames.map(f=>f.pattern),f.patterns);
  const c=results[0]?.frames[0]&&frameCapabilities(results[0],results[0].frames[0]);
  for(const key of ['progressive','perfect','passive','modals','location'])if(key in f)assert.deepEqual(c[key],f[key]);
  if(f.sourceLicense)assert.equal(entrySources(results[0]).every(s=>s.license===f.sourceLicense),true);
});
test('Stage 31 rule, release version and hash drift fail closed',()=>{
  const manifest=read('data/analysis-manifest.json');assert.doesNotThrow(()=>assertDictionaryIdentity(manifest));
  for(const key of ['ruleVersion','lexiconVersion','lexiconHash'])assert.throws(()=>assertDictionaryIdentity({...manifest,[key]:'changed'}),/不一致/);
});
test('Stage 31 all released uses have Chinese teaching descriptions and complete provenance',()=>{
  for(const e of snapshot.entries){
    assert.equal(entrySources(e).length,e.sourceIds.length,e.id);
    assert.ok(examples.some(x=>x.entryId===e.id),e.id);
    for(const note of entryNotes(e))assert.equal(typeof note,'string',e.id);
    if(e.partOfSpeech==='function-word')assert.equal(entryNotes(e).length,e.attributes.uses.length,e.id);
  }
});
for(const e of examples)test(`Stage 31 reviewed teaching example ${e.entryId}/${e.frameId}`,()=>{
  const result=analyzeSentence(e.text);
  for(const [key,value] of Object.entries(e.expected))assert.deepEqual(result[key],value,`${e.text}: ${key}`);
  assert.deepEqual(result.reasons,[]);assert.deepEqual(result.corrections,[]);
});
const verbs=snapshot.entries.filter(e=>e.partOfSpeech==='verb');
test('Stage 31 every one of the 100 verbs / 105 frames matches the audited rule matrices',()=>{
 assert.equal(verbs.length,100);assert.equal(verbs.flatMap(e=>e.frames).length,105);
 for(const e of verbs)for(const f of e.frames){
  const c=frameCapabilities(e,f),v=stage26.verbs.find(v=>v.lemma===e.lemma),second=stage30.frames[f.id];
  assert.equal(c.progressive,second?.allowProgressive??v?.progressive??f.allowProgressive);
  assert.equal(c.perfect,second?.allowPerfect??v?.perfect??f.allowPerfect);
  assert.equal(c.passive,second?false:v?.passive??(f.passivePromotion!==null));
  const locationId=`${e.lemma}-sv`;
  assert.deepEqual(c.location,stage28.frames[locationId]??[]);
  assert.equal(c.compound,!second);assert.deepEqual(c.modals,e.sense==='possession'?[]:['can','will']);
  assert.equal(c.perfectProgressive,c.perfect&&c.progressive);
  assert.equal(c.perfectPassive,c.perfect&&c.passive);
  assert.equal(c.progressivePassive,c.progressive&&c.passive);
  assert.equal(c.purposes.length,f.allowedPurposes.length);assert.ok(frameExample(e,f));
 }
});
// Human-fixed carriers from the already reviewed simple teaching sentences, not analyzer-generated expectations.
for(const e of verbs)for(const f of e.frames){
 const ex=frameExample(e,f).text,forms=Object.fromEntries(e.forms.map(f=>[f.kind,f.surface]));
 const split=ex.indexOf(` ${forms.past}`),subject=ex.slice(0,split),tail=ex.slice(split+forms.past.length+1).replace(/(?: yesterday)?\.$/,'');
 const second=!!stage30.frames[f.id],possession=e.sense==='possession';
 const carriers=[
   ['progressive',`${subject} is ${forms.progressive}${tail}.`,f.allowProgressive],
   ['perfect',`${subject} has ${forms.participle}${tail}.`,f.allowPerfect],
   ['perfect-progressive',`${subject} has been ${forms.progressive}${tail}.`,f.allowPerfect&&f.allowProgressive],
   ['can',`${subject} can ${forms.base}${tail}.`,!possession],
   ['will',`${subject} will ${forms.base}${tail}.`,!possession],
   ['compound',`${ex.slice(0,-1)} and he smiled yesterday.`,!second],
 ];
 for(const [name,input,allowed] of carriers)test(`Stage 31 ${e.lemma}/${f.id} ${name} advertised carrier`,()=>{
   const result=analyzeSentence(input);assert.equal(result.status,allowed?'complete':'unsupported',input);
   if(allowed){assert.deepEqual(result.corrections,[]);if(name!=='compound')assert.equal(result.pattern,f.pattern);}
 });
 if(f.passivePromotion!==null){
  // Reviewed SVO nouns are lifted; SVOO retains a to-recipient, according to the existing conversion rules.
  const object=tail.trim().replace(/^him /,''),passiveSubject=object[0].toUpperCase()+object.slice(1),recipient=f.pattern==='SVOO'?' to him':'';
  for(const [name,aux,allowed] of [['passive','is',true],['perfect-passive','has been',f.allowPerfect],['progressive-passive','is being',f.allowProgressive]])test(`Stage 31 ${e.lemma}/${f.id} ${name} advertised carrier`,()=>{
    const input=`${passiveSubject} ${aux} ${forms.participle}${recipient}.`,result=analyzeSentence(input);
    assert.equal(result.status,allowed?'complete':'unsupported',input);if(allowed)assert.equal(result.voice,'passive');
  });
 }
}

test('Stage 31 initial answer review is preserved and based on the released scope',()=>{
 for(const kind of ['queries','examples'])assert.equal(createHash('sha256').update(readFileSync(`tests/fixtures/stage31-${kind}-initial.json`)).digest('hex'),readFileSync(`tests/fixtures/stage31-${kind}-initial.sha256`,'utf8').trim());
 assert.equal(snapshot.entries.find(e=>e.lemma==='buy').frames[0].pattern,'SVO');
 assert.equal(snapshot.entries.some(e=>e.forms.some(f=>f.surface==='story')),false);
 for(const input of ['She bought him a gift yesterday.','She told him a story yesterday.']){
  const result=analyzeSentence(input);assert.equal(result.status,'unsupported');assert.deepEqual(result.corrections,[]);
 }
});
test('Stage 31 go retains destination and the historical simple time-tail boundary',()=>{
 const input='She went to school.',r=analyzeSentence(input);
 assert.equal(r.status,'complete');assert.equal(r.tense,'past');
 assert.deepEqual(r.nodes.filter(n=>n.role==='adverbial').map(n=>n.ranges.map(q=>input.slice(q.start,q.end)).join('')),['to school']);
 for(const sentence of ['She went to school yesterday.','She goes to school yesterday.','She can not go to school today.']){const invalid=analyzeSentence(sentence);assert.equal(invalid.status,'unsupported');assert.deepEqual(invalid.corrections,[]);}
});
for(const lemma of ['eat','read','write','open','close'])for(const [prefix,suffix] of [['She has been','ing.'],['Has she been','ing?'],['She has not been','ing.']])test(`Stage 31 second SV perfect-progressive ${lemma} ${prefix} stays outside scope`,()=>{
 const e=verbs.find(e=>e.lemma===lemma),progressive=e.forms.find(f=>f.kind==='progressive').surface,subject=['open','close'].includes(lemma)?prefix.replace('She','The door').replace('she','the door'):prefix;
 const r=analyzeSentence(`${subject} ${progressive}${suffix.endsWith('?')?'?':'.'}`);assert.equal(r.status,'unsupported');assert.deepEqual(r.corrections,[]);assert.deepEqual(r.nodes,[]);
});

// Fixed scope contrasts: these subjects cannot select the restricted second SV.
// Their original SVO perfect-passive correction must remain available.
const passiveFormRegressions = [
 ['The book has been reading.','reading','read','The book has been read.'],
 ['The letter has been writing.','writing','written','The letter has been written.'],
 ['The apple has been eating.','eating','eaten','The apple has been eaten.'],
 ['The car has been opening.','opening','opened','The car has been opened.'],
 ['The car has been closing.','closing','closed','The car has been closed.'],
 ['The books have not been reading.','reading','read','The books have not been read.'],
 ['The letter had been writing yesterday.','writing','written','The letter had been written yesterday.'],
 ['Has the book been reading?','reading','read','Has the book been read?'],
 ['Had the letter been writing yesterday?','writing','written','Had the letter been written yesterday?'],
];
for(const [input,expected,replacement,corrected] of passiveFormRegressions)test(`Stage 31 preserves passive correction outside second SV subject scope: ${input}`,()=>{
 const r=analyzeSentence(input);
 assert.equal(r.status,'partial');assert.deepEqual(r.reasons.map(reason=>reason.code),['form-mismatch']);
 assert.equal(r.corrections.length,1);assert.equal(r.corrections[0].ruleId,'PREDICATE-FORM-001');
 assert.deepEqual(r.corrections[0].edits,[{range:{start:input.indexOf(expected),end:input.indexOf(expected)+expected.length},expected,replacement}]);
 assert.equal(applyCorrection(r,r.corrections[0].id,input,r.inputVersion),corrected);
 const complete=analyzeSentence(corrected);
 assert.equal(complete.status,'complete');assert.equal(complete.aspect,'perfect');assert.equal(complete.voice,'passive');
 assert.deepEqual(complete.reasons,[]);assert.deepEqual(complete.corrections,[]);
});

for(const input of [
 'The teacher has been reading.','Has the teacher been reading?',
 'The teachers have not been writing.','Had the girl been eating yesterday?',
 'It has been opening.','Have the windows been closing?',
 'The doors had not been opening yesterday.',
])test(`Stage 31 eligible second SV subjects still reject perfect-progressive: ${input}`,()=>{
 const r=analyzeSentence(input);assert.equal(r.status,'unsupported');assert.deepEqual(r.corrections,[]);assert.deepEqual(r.nodes,[]);
});

// Purpose, WH and location carriers are fixed from the audited frame/matrices, independent of query output.
for(const e of verbs)for(const f of e.frames){
 const forms=Object.fromEntries(e.forms.map(f=>[f.kind,f.surface])),ex=frameExample(e,f).text;
 const index=ex.indexOf(` ${forms.past}`),subject=ex.slice(0,index),tail=ex.slice(index+forms.past.length+1).replace(/(?: yesterday)?\.$/,'');
 const second=stage30.frames[f.id],lowerSubject=subject[0].toLowerCase()+subject.slice(1);
 for(const [name,input,allowed]of [
  ['yes-no',`Does ${lowerSubject} ${forms.base}${tail}?`,f.allowedPurposes.includes('interrogative')],
  ['imperative',`${forms.base[0].toUpperCase()+forms.base.slice(1)}${tail}.`,f.allowedPurposes.includes('imperative')],
 ])test(`Stage 31 ${e.lemma}/${f.id} ${name} teaching permission`,()=>{
  const r=analyzeSentence(input);assert.equal(r.status,allowed?'complete':'unsupported',input);if(allowed)assert.equal(r.purpose,name==='imperative'?'imperative':'interrogative');
 });
 if(['SV','SVO'].includes(f.pattern)){
  const whSubject=second?.subject==='door-window-it'?'What':'Who';
  const wh=[['wh-subject',`${whSubject} ${forms.third}${tail}?`],['wh-adverbial',`When does ${lowerSubject} ${forms.base}${tail}?`],['wh-adverbial',`Why does ${lowerSubject} ${forms.base}${tail}?`]];
  if(f.pattern==='SVO')wh.push(['wh-object',`What does ${lowerSubject} ${forms.base}?`]);
  if(stage28.frames[`${e.lemma}-sv`])wh.push(['wh-adverbial',`Where does ${lowerSubject} ${forms.base}?`]);
  for(const [i,[type,input]]of wh.entries())test(`Stage 31 ${e.lemma}/${f.id} WH ${i} teaching permission`,()=>{
   const r=analyzeSentence(input);assert.equal(r.status,'complete',input);assert.equal(r.questionType,type);assert.equal(r.modal,null);assert.equal(r.aspect,'simple');
  });
 }
 const location=stage28.frames[`${e.lemma}-sv`];
 if(location)for(const preposition of ['in','on','under','near'])test(`Stage 31 ${e.lemma} audited ${preposition} tail`,()=>{
  const input=`She ${forms.third} ${preposition} the car.`,r=analyzeSentence(input);
  assert.equal(r.status,location.includes(preposition)?'complete':'unsupported',input);
 });
}

test('Stage 31 finite be markers retain their own function examples despite SVC frames',()=>{
 for(const word of ['am','are','is','was','were']){
  const entry=queryDictionary(word,'function-word')[0];assert.equal(entry.partOfSpeech,'function-word');assert.equal(entry.frames[0].pattern,'SVC');
  assert.equal(examples.filter(e=>e.entryId===entry.id&&e.frameId===null).length,1);
  assert.match(entryNotes(entry).join(''),/系表、进行或被动/);
 }
});

test('Stage 31 build verifier rejects stale metadata, missing examples and descriptions',async t=>{
 const {verify}=await import('../scripts/lexicon/client.mjs');
 const {mkdtempSync,cpSync,rmSync,writeFileSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'clause-stage31-verify-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 for(const p of ['lib','data'])cpSync(p,join(dir,p),{recursive:true});const root=new URL(`file://${dir}/`);assert.equal(verify(root).entries,231);
 const path=join(dir,'data/grammar/query-capabilities.json'),bytes=readFileSync(path,'utf8');
 for(const key of ['ruleVersion','lexiconVersion','lexiconHash','exampleBasisRuleVersion']){const d=JSON.parse(bytes);d[key]='stale';writeFileSync(path,JSON.stringify(d));assert.throws(()=>verify(root),/metadata version mismatch/);}
 const missing=JSON.parse(bytes);delete missing.useLabels['modal-will'];writeFileSync(path,JSON.stringify(missing));assert.throws(()=>verify(root),/description missing/);writeFileSync(path,bytes);
 const examplePath=join(dir,'data/grammar/query-examples.json'),d=JSON.parse(readFileSync(examplePath));d.examples.pop();writeFileSync(examplePath,JSON.stringify(d));assert.throws(()=>verify(root),/coverage mismatch/);
});
