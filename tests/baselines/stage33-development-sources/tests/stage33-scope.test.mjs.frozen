import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sha256} from './helpers/stage33-fixtures.mjs';
const scope=JSON.parse(readFileSync('tests/baselines/stage33-scope.json'));
const expectedHash='7fa77a63f29a80547e812ef339bb1200419082b2295c5db289057da3e1eade70';
const readSource=s=>s.revision?execFileSync('git',['show',`${s.revision}:${s.path}`],{maxBuffer:32*1024*1024}):readFileSync(s.path);
function validateScope(value,read=readSource){
  const {contentHash,...payload}=value;assert.equal(contentHash,expectedHash);assert.equal(sha256(JSON.stringify(payload)),contentHash);
  for(const s of value.sources)assert.equal(sha256(read(s)),s.sha256,`Changed frozen source ${s.path}`);
}
test('33A source freeze and first behavioral findings are immutable evidence',()=>{
  validateScope(scope);
  assert.equal(sha256(readFileSync('docs/verification/stage33-first-run.json')),'9aa6589d3607fdc422dc6a8d71e0fd51ce1d4eba76e157cf7b45da328ad6c114');
  assert.equal(scope.independentAcceptanceReady,false);
});
test('33A freeze detects altered manifests, absent sources and modified answer bytes',()=>{
  const changed=structuredClone(scope);changed.sources[0].sha256='0'.repeat(64);assert.throws(()=>validateScope(changed));
  assert.throws(()=>validateScope(scope,()=>{throw new Error('Missing source');}),/Missing source/);
  assert.throws(()=>validateScope(scope,s=>s.path==='tests/fixtures/stage33-development.json'?Buffer.from('{}'):readSource(s)),/Changed frozen source/);
});
