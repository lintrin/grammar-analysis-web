import assert from 'node:assert/strict';
import {writeFileSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {stage32PerformanceCases} from '../../tests/helpers/stage32-performance.mjs';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.STAGE33_PLAYWRIGHT_MODULE??'/Users/fuzheyuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({headless:true,executablePath:process.env.STAGE33_CHROMIUM??'/Users/fuzheyuan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const report={browser:b.version(),baselineRef:'0c5dbfb4940efd87ba87c7530f747168bcc1f003',samplesPerCase:10,services:[]};
const files=dir=>readdirSync(dir).flatMap(n=>{const path=join(dir,n);return statSync(path).isDirectory()?files(path):[path];});
try{for(const [port,rule,dir]of [[5195,'0.22.4','/tmp/clause-33f-baseline/dist/client'],[5194,'0.23.1','dist/client']]){
 const c=await b.newContext({viewport:{width:1280,height:1000}}),p=await c.newPage();await p.addInitScript(()=>{window.__long=[];new PerformanceObserver(list=>window.__long.push(...list.getEntries().map(e=>({duration:e.duration,startTime:e.startTime})))).observe({type:'longtask',buffered:true});});await p.goto(`http://127.0.0.1:${port}`);await p.waitForLoadState('networkidle');
 const input=p.getByLabel('需要分析的英文句子'),run=p.getByRole('button',{name:'分析句子',exact:true}),cases=[];
 for(const f of stage32PerformanceCases){const times=[];for(let i=0;i<10;i++){await input.fill(f.input);await p.evaluate(()=>{window.__start=performance.now();});await run.click();await p.locator('.check-status').waitFor();if(f.status==='complete')await p.getByRole('heading',{name:/成分解析/}).waitFor();else assert.equal(await p.getByRole('heading',{name:/成分解析/}).count(),0);times.push(await p.evaluate(()=>performance.now()-window.__start));}times.sort((a,b)=>a-b);cases.push({id:f.id,medianInteractionMs:times[5],p95InteractionMs:times[9]});}
 await p.waitForTimeout(100);const resources=await p.evaluate(()=>performance.getEntriesByType('resource').map(e=>({path:new URL(e.name).pathname,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,transferSize:e.transferSize})));
 const js=files(dir).filter(f=>f.endsWith('.js'));report.services.push({port,ruleVersion:rule,cases,longTasks:await p.evaluate(()=>window.__long),resources,jsFiles:js.length,jsBytes:js.reduce((n,f)=>n+statSync(f).size,0),jsGzipBytes:js.reduce((n,f)=>n+gzipSync(readFileSync(f)).length,0),maintenanceDatabaseInRuntime:files(dir).some(f=>/sqlite|\.lexicon/.test(f))});await c.close();
}writeFileSync('docs/verification/stage33f-browser-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.services.map(s=>({rule:s.ruleVersion,longTasks:s.longTasks.length,maxLongTaskMs:Math.max(0,...s.longTasks.map(t=>t.duration)),jsBytes:s.jsBytes,jsGzipBytes:s.jsGzipBytes}))));}finally{await b.close();}
