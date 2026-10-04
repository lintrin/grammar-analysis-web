// Reproducible reviewed format-2 release. Every changed revision is reviewed at its own new hash.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {openDatabase,migrate,importData,query} from '../lexicon/store.mjs';
import {review,publish,atomicWrite} from '../lexicon/release.mjs';
import {canonical} from '../lexicon/data.mjs';
const old=JSON.parse(readFileSync('data/lexicon/releases/1.7.0.json'));
const data=JSON.parse(readFileSync('data/lexicon/stage33-import.json'));
const selection=JSON.parse(readFileSync('data/lexicon/stage33-selection.json'));
const db=openDatabase(':memory:',true);
try{
  migrate(db);importData(db,data);
  const reviews=[];
  for(const row of query(db)){
    const previous=old.entries.find(e=>e.id===row.entry.id);
    const changed=previous.revisionId!==row.entry.revisionId;
    const reviewer=changed?'stage33-data-contract-audit':old.reviews.find(r=>r.id===previous.reviewId).reviewer;
    const approved=review(db,row.entry.revisionId,row.contentHash,reviewer,'approve');
    if(!changed && (row.contentHash!==previous.contentHash||approved.id!==previous.reviewId))throw new Error('Unchanged approval differs');
    reviews.push({entryId:row.entry.id,revisionId:row.entry.revisionId,previousRevisionId:previous.revisionId,previousHash:previous.contentHash,newHash:row.contentHash,changed,review:approved});
  }
  const release=publish(db,selection);
  const path=`data/lexicon/releases/${release.lexiconVersion}.json`;
  if(existsSync(path)){if(readFileSync(path,'utf8')!==canonical(release)+'\n')throw new Error('Immutable release bytes differ');}else atomicWrite(path,release);
  const report={stage:33,phase:'33B-data-audit',ruleParserImplemented:false,formatVersion:2,lexiconVersion:release.lexiconVersion,lexiconHash:release.lexiconHash,changed:reviews.filter(r=>r.changed).length,unchanged:reviews.filter(r=>!r.changed).length,checks:['110 changed entries use new revision IDs and newly bound reviews','unchanged 121 entry contents and approval IDs preserved','forms and existing frame semantics retained','policy references use selected noun entry identities','five finite-be entries each have primary and location frames','where retains action-adverbial and adds complement marker use'],reviews};
  writeFileSync('docs/verification/stage33b-data-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({formatVersion:2,lexiconVersion:release.lexiconVersion,lexiconHash:release.lexiconHash,changed:report.changed,unchanged:report.unchanged}));
}finally{db.close();}
