// Deterministic data migration from immutable 1.7.0 and the frozen 33A policy design.
// Never runs the analyzer or rewrites historical releases.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {canonical,normalizeEntry} from '../lexicon/data.mjs';
const old=JSON.parse(readFileSync('data/lexicon/releases/1.7.0.json'));
const design=JSON.parse(readFileSync('data/lexicon/stage33-location-policy-design.json'));
const source={id:'clause-stage33-data',version:'1',title:'Clause stage33 frozen finite-be location data contract',license:'MIT',attribution:'Copyright (c) 2026 lintrin; project-maintained restricted location policies and protocol'};
const entries=old.entries.map(({contentHash,reviewId,...entry})=>{
  void contentHash;void reviewId;entry=structuredClone(entry);
  let changed=entry.frames.length>0;
  for(const f of entry.frames){
    f.location=null;
    const binding=design.legacySVFramePolicies.find(b=>b.entryId===entry.id&&b.frameId===f.id);
    if(binding){f.location={policyId:binding.policyId,attachment:'adverbial',presence:'optional'};f.fixedTail=null;}
  }
  const preposition=design.prepositions.find(p=>p.entryId===entry.id);
  if(preposition){entry.attributes.locationHeadPolicies=structuredClone(preposition.locationHeadPolicies);changed=true;}
  if(design.finiteBeEntries.includes(entry.id)){entry.frames.push(structuredClone(design.newFiniteBeFrame));changed=true;}
  if(entry.id===design.whereEntry.entryId){entry.attributes.uses=[...design.whereEntry.uses];changed=true;}
  if(changed){entry.revisionId=`${entry.id}:stage33-r1`;entry.sourceIds.push(source.id);}
  return normalizeEntry(entry);
});
const changed=entries.filter(e=>e.sourceIds.includes(source.id));
if(changed.length!==110)throw new Error('Unexpected changed entry count');
const data={sources:[...old.sources,source],entries};
const selection={lexiconVersion:'1.8.0',revisionIds:entries.map(e=>e.revisionId)};
for(const [path,value] of [['data/lexicon/stage33-import.json',data],['data/lexicon/stage33-selection.json',selection]]){
  const bytes=canonical(value)+'\n';
  if(existsSync(path)){if(readFileSync(path,'utf8')!==bytes)throw new Error(`Frozen migration changed: ${path}`);}
  else writeFileSync(path,bytes);
}
// Current format-2 seed for store/CLI regression, preserving the original 91-entry inventory.
const seed=JSON.parse(readFileSync('data/lexicon/seed.json'));for(const e of seed.entries)for(const f of e.frames)f.location=null;
const seedPath='data/lexicon/current-seed.json',seedBytes=canonical(seed)+'\n';
if(existsSync(seedPath)){if(readFileSync(seedPath,'utf8')!==seedBytes)throw new Error('Current seed migration differs');}else writeFileSync(seedPath,seedBytes);
console.log(JSON.stringify({entries:entries.length,changed:changed.length,lexiconVersion:selection.lexiconVersion,formatVersion:2}));
