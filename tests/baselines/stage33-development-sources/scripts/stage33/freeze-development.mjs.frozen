// Source-only exclusion corpus. Run before authoring independent answers; never imports grammar.
import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const hash=b=>createHash('sha256').update(b).digest('hex');
const output='tests/baselines/stage33-development.json';
if(existsSync(output)){
 const b=JSON.parse(readFileSync(output)),{contentHash,...payload}=b;
 if(hash(JSON.stringify(payload))!==contentHash)throw Error('Development baseline corrupted');
 for(const s of b.sources)if(hash(readFileSync(s.archive))!==s.sha256)throw Error(`Frozen development archive changed: ${s.path}`);
 console.log(JSON.stringify({mode:'verified-no-rewrite',sources:b.sources.length,inputs:b.inputs.length,contentHash}));
}else{
 const captured=JSON.parse(readFileSync('tests/baselines/stage33-runtime-inputs.json'));
 const paths=execFileSync('rg',['--files','--hidden','tests','docs','lib','components','app','data','scripts'],{encoding:'utf8'}).trim().split('\n').filter(p=>/\.(json|[cm]?js|tsx?|md|sha256|sql|csv|py)$/.test(p)&&!p.includes('/stage33-development-sources/')).concat(['README.md','AGENTS.md']).filter((p,i,a)=>existsSync(p)&&a.indexOf(p)===i).sort();
 const collected=new Map(),sources=[];
 const add=(value,path)=>{const input=value.toLowerCase().replace(/\s+/g,' ').trim();if(!collected.has(input))collected.set(input,new Set());collected.get(input).add(path);};
 const visit=(value,path)=>{if(typeof value==='string')add(value,path);else if(value&&typeof value==='object')Object.values(value).forEach(v=>visit(v,path));};
 for(const path of paths){
  const bytes=readFileSync(path),archive='tests/baselines/stage33-development-sources/'+path+'.frozen';
  mkdirSync(dirname(archive),{recursive:true});copyFileSync(path,archive);sources.push({path,archive,sha256:hash(bytes)});
  const text=bytes.toString();
  if(path.endsWith('.json'))visit(JSON.parse(text),path);
  else if(/\.[cm]?js$|\.tsx?$/.test(path)){
   const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
   const walk=n=>{if(ts.isStringLiteralLike(n))add(n.text,path);if(ts.isTemplateExpression(n))add(n.getText(ast).slice(1,-1),path);ts.forEachChild(n,walk);};walk(ast);
  }else{
   for(const m of text.matchAll(/`([^`]+)`/g))add(m[1],path);
   for(const m of text.matchAll(/[A-Z][A-Za-z'’ ,]+[.!?]/g))add(m[0],path);
   // Conservative source-string exclusion includes Python authoring slots.
   for(const m of text.matchAll(/['"]([A-Za-z][A-Za-z'’ ,?.!-]+)['"]/g))add(m[1],path);
  }
 }
 const identity=JSON.parse(readFileSync('data/analysis-manifest.json'));
 const payload={formatVersion:1,stage:33,phase:'33E-development-frozen-before-independent-authoring',...identity,testsPassed:captured.testsPassed,extraction:'Archived full current developer sources, historical fixtures and baselines, AST literals/template source, Markdown/Python example text, and actual pre-independent test analyzer calls. Normalize lowercase, whitespace-collapse, trim. Never runtime-generated expected answers.',sources,inputs:[...collected].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([input,sources])=>({input,sources:[...sources].sort()}))};
 const contentHash=hash(JSON.stringify(payload));writeFileSync(output,JSON.stringify({...payload,contentHash},null,2)+'\n');
 console.log(JSON.stringify({mode:'created',sources:sources.length,inputs:payload.inputs.length,contentHash}));
}
