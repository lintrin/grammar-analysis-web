// Source-only extraction and previously captured developer inputs. No grammar imports.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadStage32Baseline} from '../../tests/helpers/stage32-fixtures.mjs';
import ts from 'typescript';
const commit='4a2a242a8e7835e18a958d483454cb33f2186c68';
const paths=execFileSync('git',['ls-tree','-r','--name-only',commit],{encoding:'utf8'}).trim().split('\n').filter(p=> /^(tests|docs|lib|components|app|data|scripts)\//.test(p)||p==='README.md'||p==='AGENTS.md').filter(p=>/\.(json|[cm]?js|tsx?|md|sha256|sql|csv)$/.test(p));
const sources=[],collected=new Map();
const add=(value,path)=>{const input=value.toLowerCase().replace(/\s+/g,' ').trim();if(!collected.has(input))collected.set(input,new Set());collected.get(input).add(path);};
const visit=(value,path)=>{if(typeof value==='string')add(value,path);else if(value&&typeof value==='object')Object.values(value).forEach(v=>visit(v,path));};
for(const path of [...paths,'tests/baselines/stage32-runtime-inputs.json','scripts/stage32/capture-development.mjs']){
 const retained=paths.includes(path);const bytes=retained?execFileSync('git',['show',`${commit}:${path}`],{maxBuffer:32*1024*1024}):readFileSync(path);
 sources.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),revision:retained?commit:'retained-file'});
 const text=bytes.toString();
 if(path.endsWith('.json'))visit(JSON.parse(text),path);
 else if(/\.[cm]?js$|\.tsx?$/.test(path)){
  const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const walk=node=>{if(ts.isStringLiteralLike(node))add(node.text,path);if(ts.isTemplateExpression(node))add(node.getText(ast).slice(1,-1),path);ts.forEachChild(node,walk);};walk(ast);
 } else {
  for(const m of text.matchAll(/`([^`]+)`/g))add(m[1],path);
  // Plain English prose examples, as well as inline code, are conservatively excluded.
  for(const m of text.matchAll(/[A-Z][A-Za-z'’ ,]+[.!?]/g))add(m[0],path);
 }
}
const payload={formatVersion:1,stage:32,baselineCommit:commit,ruleVersion:'0.22.3',lexiconVersion:'1.7.0',extraction:'All JSON strings (including original historical snapshots), TypeScript AST literals and template source text, Markdown code/prose, plus all actual developer analyzer calls from 5271 pre-stage32 tests including corrections and generated carriers. lowercase + whitespace-collapse + trim. Git sources stay bound to immutable commit; runtime capture remains byte-frozen.',sources:sources.sort((a,b)=>a.path.localeCompare(b.path)),inputs:[...collected].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([input,sources])=>({input,sources:[...sources].sort()}))};
const contentHash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const output=JSON.stringify({...payload,contentHash},null,2)+'\n';
if(JSON.stringify(loadStage32Baseline(),null,2)+'\n'!==output)throw new Error('Frozen stage32 source or content changed; do not regenerate baseline');
console.log({contentHash,sources:payload.sources.length,inputs:payload.inputs.length});
