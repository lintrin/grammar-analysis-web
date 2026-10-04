import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeStage33Input,sha256,frozenStage33File,validateStage33Expectation} from './stage33-fixtures.mjs';
export const STAGE33_DEVELOPMENT_HASH='cbf0335c950d49de9626e03e09956bcdf91e20ee245eed6970201b52bf4ed180';
export const STAGE33_BROWSER_INPUTS_HASH='d27278d7a170ce255ecdb91ddd8bb6820b9fdd0a73465487af0d2a032fa6de89';
export function validateStage33Development(baseline,read=path=>readFileSync(path)) {
 const {contentHash,...payload}=baseline;assert.equal(contentHash,STAGE33_DEVELOPMENT_HASH);assert.equal(sha256(JSON.stringify(payload)),contentHash);
 assert.equal(baseline.sources.length,422);assert.equal(baseline.inputs.length,15650);assert.equal(baseline.testsPassed,5682);
 const paths=new Set(baseline.sources.map(s=>s.path));assert.equal(paths.size,422);
 for(const source of baseline.sources)assert.equal(sha256(read(source.archive)),source.sha256,`Frozen source changed: ${source.path}`);
 const previous=new Set();for(const row of baseline.inputs){assert.equal(row.input,normalizeStage33Input(row.input));assert.equal(previous.has(row.input),false);assert.ok(row.sources.length&&row.sources.every(path=>paths.has(path)));previous.add(row.input);}
 const bytes=readFileSync('tests/baselines/stage33-browser-inputs.json');assert.equal(sha256(bytes),STAGE33_BROWSER_INPUTS_HASH);
 assert.equal(sha256(bytes),readFileSync('tests/baselines/stage33-browser-inputs.sha256','utf8').trim());
 const supplement=JSON.parse(bytes);assert.equal(supplement.baselineHash,STAGE33_DEVELOPMENT_HASH);assert.equal(supplement.inputs.length,3);
 for(const row of supplement.inputs){assert.equal(typeof row.origin,'string');previous.add(normalizeStage33Input(row.input));}
 return previous;
}
export function loadStage33Development(){return JSON.parse(readFileSync('tests/baselines/stage33-development.json'));}
export function checkStage33Independence(fixtures,baseline=loadStage33Development()) {
 const previous=validateStage33Development(baseline),seen=new Set();
 for(const f of fixtures){const input=normalizeStage33Input(f.input);assert.equal(previous.has(input),false,`Developer or historical input reused: ${f.input}`);assert.equal(seen.has(input),false,`Independent input repeated: ${f.input}`);seen.add(input);}
}
export function loadStage33Acceptance() {
 const data=frozenStage33File('tests/fixtures/stage33-acceptance.json');assert.equal(sha256(readFileSync('tests/fixtures/stage33-acceptance.json')),'f7b06fbb12abfcbaf21cf85fed80276d77108c94faab33a19010714ba6608b5d');assert.equal(data.baselineHash,STAGE33_DEVELOPMENT_HASH);assert.equal(data.status,'human-fixed-before-first-analysis');assert.equal(data.fixtures.length,88);
 assert.equal(new Set(data.fixtures.map(f=>f.id)).size,88);
 for(const category of ['affirmative','negative','yes-no','where']){assert.equal(data.fixtures.filter(f=>f.category===category&&f.kind==='correct').length,10);assert.equal(data.fixtures.filter(f=>f.category===category&&f.kind==='error').length,3);}
 assert.equal(data.fixtures.filter(f=>f.kind==='control').length,12);assert.equal(data.fixtures.filter(f=>f.kind==='boundary').length,24);
 const ids=new Map(data.fixtures.map(f=>[f.id,f]));for(const f of data.fixtures){validateStage33Expectation(f.input,f.expected);if(f.kind==='error'){const c=ids.get(f.controlId);assert.equal(c?.kind,'control');const [edit]=f.expected.corrections[0].edits;assert.equal(f.input.slice(0,edit.range.start)+edit.replacement+f.input.slice(edit.range.end),c.input);}}
 checkStage33Independence(data.fixtures);return data;
}
export const queryWorkflowSignature=f=>JSON.stringify([normalizeStage33Input(f.query),f.filters??[f.pos??'all'],f.actions??f.workflow??[]]);
export function loadStage33Queries() {
 const data=frozenStage33File('tests/fixtures/stage33-queries.json');assert.equal(sha256(readFileSync('tests/fixtures/stage33-queries.json')),'a747b930194e3ec4e47897e536c303c751702c4cdd8d0f61998574681388c0bc');assert.equal(data.baselineHash,STAGE33_DEVELOPMENT_HASH);assert.equal(data.status,'human-fixed-before-first-query');assert.equal(data.fixtures.length,8);
 const baseline=loadStage33Development();validateStage33Development(baseline);const historical=[];
 const visit=x=>{if(!x||typeof x!=='object')return;if(typeof x.query==='string')historical.push(queryWorkflowSignature(x));Object.values(x).forEach(v=>{if(Array.isArray(v))v.forEach(visit);else visit(v);});};
 for(const source of baseline.sources.filter(s=>s.path.endsWith('.json')))visit(JSON.parse(readFileSync(source.archive)));
 const seen=new Set();for(const f of data.fixtures){const signature=queryWorkflowSignature(f);assert.equal(historical.includes(signature),false,`Query workflow reused: ${f.id}`);assert.equal(seen.has(signature),false);seen.add(signature);assert.equal(f.filters.length,2);assert.equal(f.actions[0],'mismatched-filter-empty');}
 return data;
}
