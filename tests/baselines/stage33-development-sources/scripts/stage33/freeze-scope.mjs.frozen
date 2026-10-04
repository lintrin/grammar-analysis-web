// Source-only 33A freeze. Final independent developer corpus freeze happens separately at 33E.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const paths=[
 'data/grammar/stage33-capabilities.json','data/grammar/stage33-browser-expectations.json','data/lexicon/stage33-location-policy-design.json',
 'tests/fixtures/stage33-development.json','tests/fixtures/stage33-development.sha256','tests/fixtures/stage33-development-initial.json','tests/fixtures/stage33-development-initial.sha256',
 'tests/fixtures/stage33-migrations.json','tests/fixtures/stage33-migrations.sha256','tests/fixtures/stage33-migrations-initial.json','tests/fixtures/stage33-migrations-initial.sha256','tests/fixtures/stage33-answer-review.json',
 'scripts/stage33/author-answers.py','tests/helpers/stage33-fixtures.mjs','tests/stage33.test.mjs','scripts/stage33/check-development.mjs',
 'docs/stage33-development-plan.md','docs/stage33-37-development-plan.md',
 'tests/baselines/development.json','tests/baselines/stage32-runtime-inputs.json',
 'tests/fixtures/stage28-development.json','tests/fixtures/stage29-development.json','tests/fixtures/stage32-acceptance.json',
 'data/lexicon/releases/1.7.0.json','data/analysis-manifest.json','lib/grammar/generated/lexicon.json'
].sort();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const historical=new Set(['docs/stage33-development-plan.md','docs/stage33-37-development-plan.md','data/analysis-manifest.json','lib/grammar/generated/lexicon.json']);
const bytesFor=s=>s.revision?execFileSync('git',['show',`${s.revision}:${s.path}`],{maxBuffer:32*1024*1024}):readFileSync(s.path);
const path='tests/baselines/stage33-scope.json';
if(existsSync(path)){
 const baseline=JSON.parse(readFileSync(path));const {contentHash,...payload}=baseline;
 if(hash(JSON.stringify(payload))!==contentHash)throw new Error('Scope manifest corrupted');
 for(const s of baseline.sources)if(hash(bytesFor(s))!==s.sha256)throw new Error(`Frozen scope source changed: ${s.path}`);
 console.log(JSON.stringify({contentHash,sources:baseline.sources.length,mode:'verified-no-rewrite'}));
}else{
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const payload={stage:33,phase:'33A-before-first-new-behavior-check',baselineCommit:commit,ruleVersion:'0.22.4',lexiconVersion:'1.7.0',independentAcceptanceReady:false,extraction:'File bytes and full expected answers frozen before new behavior execution. Historical source archive and actual generated runtime inputs included as immutable references. This is a scope freeze, not the final 33E developer-input exclusion corpus.',sources:paths.map(path=>{const source={path,...(historical.has(path)?{revision:commit}:{})};return {...source,sha256:hash(bytesFor(source))};})};
 const contentHash=hash(JSON.stringify(payload));writeFileSync(path,JSON.stringify({...payload,contentHash},null,2)+'\n');console.log(JSON.stringify({contentHash,sources:payload.sources.length,mode:'created'}));
}
