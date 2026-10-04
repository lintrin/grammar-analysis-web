// Test-only immutable format-1 replay. Production tools accept only format 2.
// Original historical data, reviews and assertions run against the code that produced them.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const commit='0c5dbfb4940efd87ba87c7530f747168bcc1f003';
const root=mkdtempSync(join(tmpdir(),'clause-format1-history-'));
try {
  const paths=execFileSync('git',['ls-tree','-r','--name-only',commit],{encoding:'utf8'}).trim().split('\n').filter(p=>p.startsWith('scripts/lexicon/')||p.startsWith('drizzle/')||p.startsWith('data/lexicon/')||p==='scripts/prepare-stage26-lexicon.mjs');
  for(const p of paths){const path=join(root,p);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,execFileSync('git',['show',`${commit}:${p}`],{maxBuffer:32*1024*1024}));}
  writeFileSync(join(root,'package.json'),' {"type":"module"}\n');symlinkSync(resolve('node_modules'),join(root,'node_modules'),'dir');
}catch(e){rmSync(root,{recursive:true,force:true});throw e;}
process.once('exit',()=>rmSync(root,{recursive:true,force:true}));
const load=p=>import(pathToFileURL(join(root,p)).href);
export const historicalStore=await load('scripts/lexicon/store.mjs');
export const historicalRelease=await load('scripts/lexicon/release.mjs');
export const historicalData=await load('scripts/lexicon/data.mjs');
export const historicalVerbAdapter=await load('scripts/prepare-stage26-lexicon.mjs');
