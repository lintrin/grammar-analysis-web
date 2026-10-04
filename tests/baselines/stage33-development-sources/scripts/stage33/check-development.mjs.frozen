// Read already frozen human answers, then check the public API. Never author expectations here.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {analyzeSentence,applyCorrection,RULE_VERSION,LEXICON_VERSION,LEXICON_HASH} from '../../lib/grammar.ts';
import {frozenStage33File,compareStage33Expectation,sha256} from '../../tests/helpers/stage33-fixtures.mjs';
const fixtures=frozenStage33File('tests/fixtures/stage33-development.json').fixtures;
const migrations=frozenStage33File('tests/fixtures/stage33-migrations.json').migrations;
const scope=JSON.parse(readFileSync('tests/baselines/stage33-scope.json'));
for(const source of scope.sources)assert.equal(sha256(source.revision?execFileSync('git',['show',`${source.revision}:${source.path}`],{maxBuffer:32*1024*1024}):readFileSync(source.path)),source.sha256,`Scope source changed: ${source.path}`);
const reportPath=process.argv[2];
if(reportPath&&existsSync(reportPath))throw new Error('Keep first execution evidence immutable; choose a new report path');
const rows=[],byId=new Map(fixtures.map(f=>[f.id,f]));
for(const f of [...fixtures,...migrations.map((m,i)=>({...m,id:`33-migration-${i+1}`,kind:'migration'}))]){
  const actual=analyzeSentence(f.input,33);
  let difference=null;
  try {
    compareStage33Expectation(f.expected,actual);
    if(f.kind==='error'){
      const control=byId.get(f.controlId);
      const next=applyCorrection(actual,actual.corrections[0].id,f.input,33);
      assert.equal(next,control.input);compareStage33Expectation(control.expected,analyzeSentence(next,34));
      assert.throws(()=>applyCorrection(actual,actual.corrections[0].id,f.input,34),/过期/);
    }
  } catch(error){difference=error.message;}
  const observed=Object.fromEntries(['status','purpose','pattern','complexity','tense','modal','questionType','aspect','voice','reasons'].map(k=>[k,actual[k]]));
  observed.nodes=actual.nodes.map(({id,parentId,role,implicit,ranges,ruleId})=>({id,parentId,role,implicit,ranges,ruleId}));
  observed.corrections=actual.corrections.map(({ruleId,edits})=>({ruleId,edits}));
  rows.push({id:f.id,kind:f.kind,pass:difference===null,difference,observed});
}
const failed=rows.filter(r=>!r.pass);
const report={stage:33,phase:'33A-first-runtime-gap-check',ruleVersion:RULE_VERSION,lexiconVersion:LEXICON_VERSION,lexiconHash:LEXICON_HASH,scopeHash:scope.contentHash,expectationsChanged:false,total:rows.length,pass:rows.length-failed.length,fail:failed.length,counts:Object.fromEntries(['correct','error','control','boundary','migration'].map(kind=>[kind,{total:rows.filter(r=>r.kind===kind).length,failed:failed.filter(r=>r.kind===kind).length}])),rows};
if(reportPath)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,pass:report.pass,fail:report.fail,counts:report.counts,report:reportPath??null}));
process.exitCode=failed.length?1:0;
