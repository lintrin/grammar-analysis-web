// Frozen 33A correct subjects use bag/bags. Add the missing noun; never rewrite those answers.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {openDatabase,migrate,importData,query} from '../lexicon/store.mjs';
import {review,publish,atomicWrite} from '../lexicon/release.mjs';
import {canonical} from '../lexicon/data.mjs';
const previous=JSON.parse(readFileSync('data/lexicon/releases/1.8.0.json'));
const source={id:'clause-stage33-bag',version:'1',title:'Stage33 frozen subject noun bag/bags',license:'MIT',attribution:'Copyright (c) 2026 lintrin; manual noun audit against frozen 33A correct inputs'};
const bag={id:'noun:lexical:bag',revisionId:'noun:lexical:bag:r1',lemma:'bag',partOfSpeech:'noun',sense:'lexical',attributes:{person:false,initialSound:'consonant'},forms:[{kind:'singular',surface:'bag',initialSound:'consonant'},{kind:'plural',surface:'bags',initialSound:'consonant'}],frames:[],sourceIds:[source.id]};
const draft={sources:[...previous.sources,source],entries:[...previous.entries.map(({contentHash,reviewId,...e})=>{void contentHash;void reviewId;return e;}),bag]};
const db=openDatabase(':memory:',true);
try{
 migrate(db);importData(db,draft);
 for(const row of query(db)){
  const old=previous.entries.find(e=>e.id===row.entry.id);
  const reviewer=old?previous.reviews.find(r=>r.id===old.reviewId).reviewer:'stage33-frozen-noun-audit';
  const approval=review(db,row.entry.revisionId,row.contentHash,reviewer,'approve');
  if(old&&(old.contentHash!==row.contentHash||old.reviewId!==approval.id))throw new Error('Existing approval changed');
 }
 const selection={lexiconVersion:'1.8.1',revisionIds:draft.entries.map(e=>e.revisionId)};
 const release=publish(db,selection);const path='data/lexicon/releases/1.8.1.json';
 if(existsSync(path)){if(readFileSync(path,'utf8')!==canonical(release)+'\n')throw new Error('Immutable release bytes differ');}else atomicWrite(path,release);
 writeFileSync('data/lexicon/stage33c-import.json',canonical(draft)+'\n');writeFileSync('data/lexicon/stage33c-selection.json',canonical(selection)+'\n');
 const manifest={ruleVersion:'0.23.1',lexiconVersion:release.lexiconVersion,lexiconHash:release.lexiconHash,lexiconFormatVersion:2};writeFileSync('data/analysis-manifest.json',canonical(manifest)+'\n');console.log(manifest);
}finally{db.close();}
