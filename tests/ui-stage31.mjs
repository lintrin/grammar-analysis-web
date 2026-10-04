// Stage 31 project-native Playwright acceptance; fixed local data only, no user input recorded.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const fixtures=JSON.parse(readFileSync('tests/fixtures/stage31-queries.json')).fixtures;
const snapshot=JSON.parse(readFileSync('lib/grammar/generated/lexicon.json'));
const examples=JSON.parse(readFileSync('data/grammar/query-examples.json')).examples;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const labels={all:'全部词性',noun:'名词',adjective:'形容词',verb:'动词','function-word':'功能词'};
try {
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
 const errors=[],logs=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>logs.push(m.text()));page.on('request',r=>requests.push({url:r.url(),body:r.postData()}));
 await page.goto(process.env.CLAUSE_BASE_URL??'http://127.0.0.1:5188');await page.waitForLoadState('networkidle');
 const input=page.getByRole('textbox',{name:'需要分析的英文句子'}),search=page.getByRole('searchbox',{name:'词元或完整词形'}),filter=page.getByRole('combobox',{name:'按词性筛选'});
 const defaultSentence=await input.inputValue();
 assert.equal(await page.locator('.dictionary-card').getAttribute('open'),null);
 await page.locator('.dictionary-card>summary').press('Enter');await search.waitFor();
 // Reconnaissance of rendered semantics before exercising the full fixed matrix.
 assert.equal(await search.getAttribute('autocomplete'),'off');assert.deepEqual(await filter.locator('option').allTextContents(),Object.values(labels));
 await search.pressSequentially('read');await search.press('Enter');
 assert.equal(await page.locator('.dictionary-entry h3').innerText(),'read');
 await search.press('Tab');assert.equal(await filter.evaluate(e=>e===document.activeElement),true);
 // macOS headless-shell does not operate native select popups with key presses.
 // Actual Space/Down/Return selection is separately verified in the visible in-app browser.
 await filter.selectOption('noun');
 assert.equal(await filter.inputValue(),'noun');
 requests.length=0;logs.length=0;
 await search.fill('stage31-query-privacy-sentinel');await filter.selectOption('verb');
 assert.match(await page.locator('#dictionary-count').innerText(),/未收录/);
 assert.deepEqual(requests,[]);assert.equal(logs.some(x=>x.includes('stage31-query-privacy-sentinel')),false);
 await context.setOffline(true);
 const counts=[];
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  for(const f of fixtures){
   await search.fill(f.query);await filter.selectOption(f.pos);
   const expected=f.ids.map(id=>snapshot.entries.find(e=>e.id===id));
   assert.deepEqual(await page.locator('.dictionary-entry h3').allTextContents(),expected.map(e=>e.lemma));
   assert.equal(await page.locator('.dictionary-frame').count(),expected.flatMap(e=>e.frames).length);
   if(!f.query.trim())assert.match(await page.locator('#dictionary-count').innerText(),/输入词元/);
   else if(!f.ids.length)assert.match(await page.locator('#dictionary-count').innerText(),/未收录.*不表示拼写错误/);
   else assert.equal(await page.locator('#dictionary-count').innerText(),`找到 ${f.ids.length} 个词条`);
   if(f.formKinds)assert.match(await page.locator('.dictionary-match').innerText(),/原形.*过去分词.*过去式/);
   if(f.query==='have'&&f.pos==='all'){
    assert.match(await page.locator('.dictionary-entry').nth(0).innerText(),/完成时助动词/);
    assert.match(await page.locator('.dictionary-entry').nth(1).innerText(),/拥有义.*[\s\S]*不支持情态/);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  counts.push({viewport:width,fixedQueries:fixtures.length});
 }
 // Full provenance is accessible, including the license bundled with the application.
 await search.fill('traveled');await filter.selectOption('all');await page.locator('.dictionary-source>summary').press('Enter');
 assert.match(await page.locator('.dictionary-source').innerText(),/0\.22\.3.*1\.7\.0/);
 assert.match(await page.locator('.dictionary-source').innerText(),/LemmInflect.*MIT[\s\S]*Brad Jascob/);
 assert.equal(await page.getByRole('link',{name:'查看完整 MIT 许可与署名'}).getAttribute('href'),'/licenses/lemminflect.txt');
 // Existing correction, query changes preserve it; inserting a reviewed example clears it and focuses the editor.
 await input.fill('She go to school.');await input.press('Control+Enter');await page.locator('.result-status').filter({hasText:'部分支持'}).waitFor();
 await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();assert.equal(await page.locator('.correction-card').count(),1);
 await search.fill('read');await filter.selectOption('verb');assert.equal(await page.locator('.correction-card').count(),1);
 await page.getByRole('button',{name:'放入例句：She read yesterday.',exact:true}).press('Enter');
 assert.equal(await input.inputValue(),'She read yesterday.');assert.equal(await input.evaluate(e=>e===document.activeElement),true);
 assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.equal(await page.locator('.correction-card').count(),0);
 await input.press('Meta+Enter');await page.locator('.result-status').filter({hasText:'规则分析完成'}).waitFor();
 // All 231 released entries have reviewed examples; all 236 example buttons round-trip through the existing flow.
 await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
 for(const [i,e] of examples.entries()){
  const entry=snapshot.entries.find(x=>x.id===e.entryId);
  try { await search.fill(entry.lemma);await filter.selectOption(entry.partOfSpeech); }
  catch(error) { console.error('Query entry failed:',entry.id,'page errors:',errors);throw error; }
  const card=page.locator('.dictionary-entry').filter({has:page.getByRole('heading',{name:entry.lemma,exact:true})});
  const button=card.getByRole('button',{name:`放入例句：${e.text}`,exact:true});
  // Homographic function entries can share examples; choosing either still must fill the exact reviewed text.
  await button.first().press('Enter');assert.equal(await input.inputValue(),e.text);
  assert.equal(await input.evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('.result-status').innerText(),'等待分析');
  await input.press('Control+Enter');await page.locator('.result-status').filter({hasText:'规则分析完成'}).waitFor();
  assert.equal((await page.locator('.part-text,.sentence-gap').allTextContents()).join(''),e.text);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(i%80===0)console.log(`Stage 31 example round trips ${i+1}/${examples.length}`);
 }
 // Query insertion cancels a genuinely pending analysis; a delayed callback must never restore the old input result.
 await search.fill('read');await filter.selectOption('verb');await input.fill('She go to school.');
 await page.evaluate(()=>{const original=window.setTimeout;window.stage31OriginalTimeout=original;window.setTimeout=(callback,delay,...args)=>original(callback,delay===0?1000:delay,...args);});
 await page.getByRole('button',{name:'分析句子',exact:true}).click();
 await page.getByRole('button',{name:'放入例句：She read yesterday.',exact:true}).click();await page.waitForTimeout(1100);
 assert.equal(await page.locator('.result-status').innerText(),'等待分析');assert.equal(await page.locator('.sentence-part').count(),0);
 await page.evaluate(()=>{window.setTimeout=window.stage31OriginalTimeout;});
 for(const [text,status]of [['She has been reading.','超出当前范围'],['Has the door been opening?','超出当前范围'],['She went to school yesterday.','超出当前范围']]){
  await input.fill(text);await input.press('Control+Enter');await page.locator('.result-status').filter({hasText:status}).waitFor();
  await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();assert.equal(await page.locator('.correction-card').count(),0);
 }
 // Subjects outside the second SV scope retain the unique original passive correction.
 const passiveCorrections=[
  ['The book has been reading.','The book has been read.'],
  ['The letter has been writing.','The letter has been written.'],
  ['The apple has been eating.','The apple has been eaten.'],
  ['The car has been opening.','The car has been opened.'],
  ['The car has been closing.','The car has been closed.'],
  ['The books have not been reading.','The books have not been read.'],
  ['The letter had been writing yesterday.','The letter had been written yesterday.'],
  ['Has the book been reading?','Has the book been read?'],
  ['Had the letter been writing yesterday?','Had the letter been written yesterday?'],
 ];
 for(const [text,corrected]of passiveCorrections){
  await input.fill(text);await input.press('Control+Enter');await page.locator('.result-status').filter({hasText:'部分支持'}).waitFor();
  assert.equal(await page.locator('.correction-card').count(),1);
  await page.getByRole('button',{name:'应用此建议并重新分析',exact:true}).click();
  assert.equal(await input.inputValue(),corrected);await page.locator('.result-status').filter({hasText:'规则分析完成'}).waitFor();
  assert.equal(await page.locator('.correction-card').count(),0);
  await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
  assert.equal((await page.locator('.part-text,.sentence-gap').allTextContents()).join(''),corrected);
  assert.match(await page.locator('.result-body').innerText(),/完成时.*被动语态/);
  await page.getByRole('tab', { name: '语法检查与成分解析', exact: true }).click();
 }
 const restrictedSubjects=[
  'The teacher has been reading.','Has the teacher been reading?',
  'The teachers have not been writing.','Had the girl been eating yesterday?',
  'It has been opening.','Have the windows been closing?','The doors had not been opening yesterday.',
 ];
 for(const text of restrictedSubjects){
  await input.fill(text);await input.press('Control+Enter');await page.locator('.result-status').filter({hasText:'超出当前范围'}).waitFor();
  assert.equal(await page.locator('.correction-card').count(),0);assert.equal(await page.locator('.sentence-part').count(),0);
 }
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 const offlineRequests=requests.length;
 assert.equal(logs.some(log=>fixtures.some(f=>f.query.trim()&&log.includes(f.query))||examples.some(e=>log.includes(e.text))),false);
 const storage=await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),cookie:document.cookie}));
 assert.deepEqual(storage,{local:[],session:[],databases:[],cookie:''});
 // Capture the desktop reference while the read entry shows its separately restricted frames.
 await page.setViewportSize({width:1280,height:1000});await search.fill('read');await filter.selectOption('all');
 await page.locator('.dictionary-card').screenshot({path:process.env.CLAUSE_STAGE31_SCREENSHOT??'/tmp/grammar-stage31-query.png'});
 await search.fill('am');assert.equal(await page.locator('.dictionary-frame').count(),0);assert.match(await page.locator('.dictionary-entry').innerText(),/系表、进行或被动/);
 await context.setOffline(false);await page.reload();await page.waitForLoadState('networkidle');
 assert.equal(await input.inputValue(),defaultSentence);assert.equal(await page.locator('.result-status').innerText(),'等待分析');
 await page.locator('.dictionary-card>summary').press('Enter');assert.equal(await search.inputValue(),'');assert.equal(await filter.inputValue(),'all');
 assert.equal(await page.locator('.dictionary-entry').count(),0);
 const report={browser:browser.version(),ruleVersion:'0.22.4',lexiconVersion:'1.7.0',counts,reviewedExampleRoundTrips:examples.length,passiveCorrectionRoundTrips:passiveCorrections.length,restrictedSubjectContrasts:restrictedSubjects.length,pendingAnalysisCancellation:true,offlineRequests,pageErrors:errors,storage,refreshReset:true,keyboardSearch:true,keyboardFilterFocus:true,filtering:true,exampleFocusAndInvalidation:true,limitation:'Fixed teaching/query development acceptance. Native popup keyboard selection is verified separately in the Codex in-app browser; macOS headless-shell does not drive that popup with key presses. Stage 32 independent acceptance remains pending.'};
 writeFileSync(process.env.CLAUSE_STAGE31_REPORT??'/tmp/grammar-stage31-browser.json',JSON.stringify(report,null,2)+'\n');
 console.log(`PASS Stage 31: ${fixtures.length} queries at desktop/mobile; ${examples.length} reviewed example round trips, pending cancellation, offline/privacy/reset. Chromium ${browser.version()}`);
}finally{await browser.close();}
