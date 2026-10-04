import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.STAGE33_PLAYWRIGHT_MODULE??'/Users/fuzheyuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
assert.equal(existsSync('/tmp/clause-33f-static-runtime/.lexicon'),false);
const b=await chromium.launch({headless:true,executablePath:process.env.STAGE33_CHROMIUM??'/Users/fuzheyuan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const checks=[];
try{for(const width of [1280,390]){
 const p=await b.newPage({viewport:{width,height:1000}});
 await p.goto('http://127.0.0.1:5196');await p.waitForLoadState('networkidle');
 const input=p.getByLabel('需要分析的英文句子');await input.fill('The book is under the green chair.');
 await p.getByRole('button',{name:'分析句子',exact:true}).click();
 await p.getByRole('button',{name:'表语 under the green chair C',exact:true}).waitFor();
 checks.push({width,passed:true,maintenanceDirectoryAbsent:true});await p.close();
}}finally{await b.close();}
writeFileSync('docs/verification/stage33f-no-database-browser.json',JSON.stringify({browser:b.version(),runtime:'Fresh /tmp directory contains dist, package.json, sites-env and dependency link; no .lexicon directory or SQLite data copied.',checks},null,2)+'\n');
console.log(JSON.stringify(checks));
