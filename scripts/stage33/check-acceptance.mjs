// Behavior validation only: expected answers are already frozen. First report is never overwritten.
import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {loadStage33Acceptance,loadStage33Queries,STAGE33_BROWSER_INPUTS_HASH} from '../../tests/helpers/stage33-acceptance.mjs';
import {compareStage33Expectation} from '../../tests/helpers/stage33-fixtures.mjs';
import {analyzeSentence,applyCorrection,RULE_VERSION,LEXICON_VERSION,LEXICON_HASH} from '../../lib/grammar.ts';
import {queryDictionary,locationPolicyDetails,entryExamples,locationTeachingExamples} from '../../lib/grammar/dictionary.ts';
const path=process.argv[2];if(!path||existsSync(path))throw Error('Choose a new immutable acceptance report path');
const data=loadStage33Acceptance(),byId=new Map(data.fixtures.map(f=>[f.id,f])),rows=[];
for(const f of data.fixtures){
 const actual=analyzeSentence(f.input,33);let difference=null;
 try{compareStage33Expectation(f.expected,actual);if(f.kind==='error'){const c=byId.get(f.controlId),next=applyCorrection(actual,actual.corrections[0].id,f.input,33);assert.equal(next,c.input);compareStage33Expectation(c.expected,analyzeSentence(next,34));}}catch(error){difference=error.message;}
 const observed=Object.fromEntries(['status','purpose','pattern','complexity','tense','modal','questionType','aspect','voice','reasons'].map(k=>[k,actual[k]]));observed.nodes=actual.nodes.map(({id,parentId,role,implicit,ranges,ruleId})=>({id,parentId,role,implicit,ranges,ruleId}));observed.corrections=actual.corrections.map(({ruleId,edits})=>({ruleId,edits}));
 rows.push({id:f.id,kind:f.kind,pass:difference===null,difference,observed});
}
for(const f of loadStage33Queries().fixtures){
 let difference=null;const before=queryDictionary(f.query,f.filters[0]),after=queryDictionary(f.query,f.filters[1]);
 try{
  assert.deepEqual(before,[]);assert.deepEqual(after.map(e=>e.id),f.expectedIds);if(after.length){const [e]=after;assert.deepEqual(e.frames.map(f=>f.id),f.frameIds);assert.deepEqual(e.attributes.uses,f.uses);
   if(f.heads){const p=locationPolicyDetails(e);assert.deepEqual(p.find(x=>x.heads!==null).heads.map(h=>h.lemma),f.heads);assert.deepEqual([...new Set(p.flatMap(x=>x.verbs))].sort(),f.legacyVerbs);}
   assert.ok([...entryExamples(e),...locationTeachingExamples(e)].some(x=>x.text===f.example));const r=analyzeSentence(f.example);assert.equal(r.status,f.exampleExpectedStatus);assert.equal(r.pattern,f.examplePattern);
  }
 }catch(error){difference=error.message;}
 rows.push({id:f.id,kind:'query',pass:difference===null,difference,observed:{before:before.map(e=>e.id),after:after.map(e=>e.id)}});
}
const fail=rows.filter(r=>!r.pass).length,report={stage:33,phase:path.includes('first-run')?'33E-independent-first-behavior-check':'33E-independent-revalidation',ruleVersion:RULE_VERSION,lexiconVersion:LEXICON_VERSION,lexiconHash:LEXICON_HASH,baselineHash:data.baselineHash,browserSourceSupplementHash:STAGE33_BROWSER_INPUTS_HASH,expectationsChanged:false,total:rows.length,pass:rows.length-fail,fail,rows};writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,pass:report.pass,fail,report:path,failures:rows.filter(r=>!r.pass).map(({id,difference})=>({id,difference}))}));process.exitCode=fail?1:0;
