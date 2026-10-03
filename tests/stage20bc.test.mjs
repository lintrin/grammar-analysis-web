import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { openDatabase, migrate, importData, query, revise } from '../scripts/lexicon/store.mjs';
import { review, publish, exportRelease, validateRelease, rebuild, atomicWrite, trustedRelease, validateWorkingReleases } from '../scripts/lexicon/release.mjs';
import { verify, clientSnapshot } from '../scripts/lexicon/client.mjs';
import { canonical, hash } from '../scripts/lexicon/data.mjs';
import { analyzeSentence, applyCorrection, validateAnalysisResult, LEXICON_VERSION, LEXICON_HASH } from '../lib/grammar.ts';
import { surfaceCandidates, verbCandidates } from '../lib/grammar/vocabulary.ts';
const seed = JSON.parse(readFileSync('data/lexicon/seed.json','utf8'));
const clone = x => structuredClone(x);
function work(t, approved = true) {
  const db = openDatabase(':memory:',true); t.after(() => db.close()); migrate(db); importData(db,seed);
  if (approved) for (const row of query(db)) review(db,row.entry.revisionId,row.contentHash,'fixed-vocabulary-review','approve');
  return db;
}
const manifest = db => ({ lexiconVersion: 'test-1', revisionIds: query(db).filter(r => r.revisionNumber === 1).map(r => r.entry.revisionId) });
test('20B review binds complete content; stale/rejected/forged drafts never publish', t => {
  const db = work(t,false), a = query(db,{ lemma: 'give' })[0];
  assert.throws(() => review(db,a.entry.revisionId,'0'.repeat(64),'human','approve'), /current draft hash/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM lexicon_reviews').get().n,0);
  review(db,a.entry.revisionId,a.contentHash,'human','reject');
  assert.throws(() => publish(db, { lexiconVersion: 'rejected', revisionIds: [a.entry.revisionId] }), /approved/);
  assert.throws(() => publish(db,manifest(db)), /approved/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM lexicon_releases').get().n,0);
});
test('20B reviewed A stays immutable; B requires its own hash and review', t => {
  const db = work(t), initial = publish(db,manifest(db));
  const a = query(db,{ lemma: 'give' })[0], b = clone(a.entry);
  b.revisionId += '-next'; b.frames[0].allowProgressive = false;
  const next = revise(db,a.entry.revisionId,b);
  assert.throws(() => review(db,b.revisionId,a.contentHash,'human','approve'), /current draft hash/);
  assert.throws(() => publish(db,{ lexiconVersion: 'test-2', revisionIds: [b.revisionId] }), /approved/);
  review(db,b.revisionId,next.contentHash,'human','approve');
  const second = publish(db,{ lexiconVersion: 'test-2', revisionIds: [b.revisionId] });
  assert.notEqual(second.lexiconHash,initial.lexiconHash);
  assert.deepEqual(exportRelease(db,'test-1'),initial);
  assert.throws(() => publish(db,{ lexiconVersion: 'test-1', revisionIds: [b.revisionId] }), /already published/);
  for (const table of ['lexicon_releases','lexicon_release_items','lexicon_reviews']) assert.throws(() => db.exec(`DELETE FROM ${table}`), /immutable/);
});
test('20B publication is deterministic, nonduplicating and transactionally rolls back', t => {
  const db = work(t);
  assert.throws(() => publish(db,{ lexiconVersion: 'duplicate', revisionIds: [manifest(db).revisionIds[0],manifest(db).revisionIds[0]] }), /Duplicate/);
  db.exec("CREATE TRIGGER test_publish_failure BEFORE INSERT ON lexicon_release_items WHEN NEW.entry_id='verb:lexical:give' BEGIN SELECT RAISE(ABORT,'injected failure'); END");
  assert.throws(() => publish(db,manifest(db)), /injected failure/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM lexicon_releases').get().n,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM lexicon_release_items').get().n,0);
  db.exec('DROP TRIGGER test_publish_failure');
  const r = publish(db,manifest(db)); assert.deepEqual(exportRelease(db,r.lexiconVersion),r);
  const other = work(t); const reversed = manifest(other); reversed.revisionIds.reverse();
  assert.equal(canonical(publish(other,reversed)),canonical(r));
  const directory = mkdtempSync(join(tmpdir(),'clause-release-')); t.after(() => rmSync(directory,{ recursive: true,force: true }));
  assert.throws(() => atomicWrite(directory,r));
  assert.deepEqual(exportRelease(db,r.lexiconVersion),r);
  atomicWrite(join(directory,'release.json'),r);
  assert.equal(readFileSync(join(directory,'release.json'),'utf8'),canonical(r)+'\n');
});
test('20B dedicated rebuild reproduces trusted release including frozen approvals', t => {
  const { release, manifest: app } = trustedRelease();
  const db = openDatabase(':memory:',true); t.after(() => db.close()); migrate(db);
  assert.throws(() => rebuild(db,release,'0'.repeat(64)), /Untrusted/);
  assert.equal(query(db).length,0);
  assert.deepEqual(rebuild(db,release,app.lexiconHash),release);
  assert.equal(query(db).length,149); assert.equal(query(db).every(r => r.status === 'approved'),true);
  assert.deepEqual(exportRelease(db,release.lexiconVersion),release);
  assert.throws(() => rebuild(db,release,app.lexiconHash), /empty/);
});
for (const [label, change] of [
  ['format', r => { r.formatVersion = 2; }],
  ['content', r => { r.entries[0].lemma = 'changed'; }],
  ['review binding', r => { r.reviews[0].contentHash = '0'.repeat(64); }],
  ['hash', r => { r.lexiconHash = '0'.repeat(64); }],
  ['extra field', r => { r.uploadedSentence = 'not permitted'; }],
  ['order', r => { r.entries.reverse(); }],
]) test(`20B rejects ${label} release`, () => {
  const r = clone(trustedRelease().release); change(r); assert.throws(() => validateRelease(r));
});
test('20C client has every same-surface candidate and deterministic reviewed provenance', () => {
  const r = trustedRelease().release;
  assert.equal(verify().entries,149);
  assert.equal(clientSnapshot(r).entries.length,149);
  assert.equal(surfaceCandidates('her',() => true).length,2);
  assert.equal(surfaceCandidates('sent',() => true).length,2);
  assert.equal(verbCandidates('sent',() => true).length,1);
  assert.equal(verbCandidates('sent',() => false),null);
  assert.equal(JSON.stringify(clientSnapshot(r)).includes('reviewer'),false);
});
for (const [field,value] of [['lexiconVersion','different'],['lexiconHash','0'.repeat(64)]]) test(`20C rejects stale correction ${field}`, () => {
  const input = 'She give him a book.', r = analyzeSentence(input,9);
  assert.equal(r.status,'partial'); assert.equal(applyCorrection(r,r.corrections[0].id,input,9),'She gives him a book.');
  assert.throws(() => applyCorrection({ ...r,[field]: value },r.corrections[0].id,input,9), /过期/);
});
for (const input of ['', 'She gives him a book.', 'Music sleeps.', 'She give him a book.', "My mother hasn't smiled."]) test(`20C every result includes version identity: ${input}`, () => {
  const r = analyzeSentence(input); assert.equal(r.lexiconVersion,LEXICON_VERSION); assert.equal(r.lexiconHash,LEXICON_HASH);
  for (const field of ['lexiconVersion','lexiconHash']) { const invalid = { ...r }; delete invalid[field]; assert.throws(() => validateAnalysisResult(invalid), /词典元信息/); }
});
function isolated(t) {
  const dir = mkdtempSync(join(tmpdir(),'clause-client-')); t.after(() => rmSync(dir,{ recursive: true,force: true }));
  cpSync('lib',join(dir,'lib'),{ recursive: true });
  return { dir, snapshot: JSON.parse(readFileSync(join(dir,'lib/grammar/generated/lexicon.json'),'utf8')) };
}
function runFixture(t, modify, expected) {
  const { dir, snapshot } = isolated(t); modify(snapshot);
  // Test-only snapshot: manually selected additional interpretations; never publish it.
  writeFileSync(join(dir,'lib/grammar/generated/lexicon.json'),JSON.stringify(snapshot));
  const code = `import { analyzeSentence } from ${JSON.stringify(join(dir,'lib/grammar.ts'))}; console.log(JSON.stringify(${JSON.stringify(Object.keys(expected))}.map(s => analyzeSentence(s))));`;
  const r = spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{ encoding: 'utf8' });
  assert.equal(r.status,0,r.stderr);
  for (const result of JSON.parse(r.stdout)) {
    const answer = expected[result.input];
    assert.equal(result.status,typeof answer === 'string' ? answer : answer.status,result.input);
    if (typeof answer === 'object') {
      assert.equal(result.reasons[0].code,answer.code);
      if (answer.corrections) {
        assert.deepEqual(result.corrections.map(({ ruleId,edits })=>({ ruleId,edits })),answer.corrections);
        assert.deepEqual(result.nodes,[]);
        for (const field of ['purpose','pattern','complexity','tense','aspect','voice']) assert.equal(result[field],null);
      }
    }
    if (result.status === 'unsupported') { assert.deepEqual(result.nodes,[]); assert.deepEqual(result.corrections,[]); }
    if (result.status === 'ambiguous') { assert.deepEqual(result.nodes,[]); assert.deepEqual(result.corrections,[]); }
  }
}
function extraFrame(s, base, pattern) {
  const e = s.entries.find(e => e.partOfSpeech === 'verb' && e.lemma === base);
  const frame = { ...clone(e.frames[0]), id: 'test-extra', pattern, recipient: null, complement: null, passivePromotion: 'direct-object', fixedTail: null };
  e.frames.push(frame);
  for (const f of e.forms) s.index[f.surface].push({ entryId: e.id, revisionId: e.revisionId, formKind: f.kind, frameId: frame.id });
}
test('20C multiple verb frames work in simple, auxiliary, question and clauses without first-match loss', t => runFixture(t,s => extraFrame(s,'give','SVO'),{
  'She gives him a book.': 'complete', 'She gives a book.': 'complete', 'Does she give a book?': 'complete',
  'She does not give a book.': 'complete', 'Can she give a book?': 'complete', 'She can give a book.': 'complete', 'Give a book.': 'complete',
  'She has given a book.': 'complete', 'She gives a book and he smiles.': 'complete',
  'The book was given.': 'ambiguous', 'Was the book given?': 'ambiguous', 'She smiles because the book was given.': 'ambiguous',
}));
test('20C same surface distinct lemmas remain ambiguous only for complete interpretations', t => runFixture(t,s => {
  const original = s.entries.find(e => e.partOfSpeech === 'verb' && e.lemma === 'like');
  const e = clone(original); e.id = 'test-other-verb'; e.revisionId = e.id+':r1'; e.lemma = 'love';
  e.forms.find(f => f.kind === 'base').surface = 'love'; e.forms.find(f => f.kind === 'third').surface = 'loves';
  s.entries.push(e);
  for (const f of e.forms) (s.index[f.surface] ??= []).push({ entryId: e.id, revisionId: e.revisionId, formKind: f.kind, frameId: e.frames[0].id });
},{ 'She liked the book.': 'ambiguous', 'She likes the book.': 'complete', 'She has liked the book.': 'ambiguous', 'Did she liked the book?': 'ambiguous' }));
test('20C same surface nouns preserve audited person alternatives', t => runFixture(t,s => {
  const e = clone(s.entries.find(e => e.partOfSpeech === 'noun' && e.lemma === 'teacher'));
  e.id = 'test-noun-sense'; e.revisionId = e.id+':r1'; e.attributes.person = false; s.entries.push(e);
  for (const f of e.forms) s.index[f.surface].push({ entryId: e.id,revisionId: e.revisionId,formKind: f.kind,frameId: null });
},{ 'The teacher smiles.': 'ambiguous', 'She gives the teacher a book.': 'complete' }));
test('20C frame aspect and purpose restrictions reject rather than infer capabilities', t => runFixture(t,s => {
  const e = s.entries.find(e => e.partOfSpeech === 'verb' && e.lemma === 'give');
  e.frames[0].allowProgressive = false; e.frames[0].allowPerfect = false; e.frames[0].allowedPurposes = ['declarative']; e.frames[0].allowedPolarities = ['positive'];
},{ 'She gives him a book.': 'complete', 'She is giving him a book.': 'unsupported', 'She has given him a book.': 'unsupported', 'Does she give him a book?': 'unsupported', 'She does not give him a book.': 'unsupported' }));
test('20C verify rejects manifest, release and generated snapshot tampering in clean environment', t => {
  const dir = mkdtempSync(join(tmpdir(),'clause-verify-')); t.after(() => rmSync(dir,{ recursive: true,force: true }));
  for (const path of ['lib','data']) cpSync(path,join(dir,path),{ recursive: true });
  const root = new URL('file://'+dir+'/'); assert.equal(verify(root).entries,149);
  const mp = join(dir,'data/analysis-manifest.json'), source = readFileSync(mp,'utf8');
  for (const field of ['ruleVersion','lexiconVersion','lexiconHash','lexiconFormatVersion']) {
    const m = JSON.parse(source); m[field] = field === 'lexiconFormatVersion' ? 2 : 'invalid'; writeFileSync(mp,JSON.stringify(m)); assert.throws(() => verify(root));
  }
  writeFileSync(mp,source);
  const client = join(dir,'lib/grammar/generated/lexicon.json'); const bytes = readFileSync(client,'utf8');
  writeFileSync(client,bytes.replace('teacher','wrong')); assert.throws(() => verify(root), /snapshot mismatch/);
  writeFileSync(client,bytes); rmSync(client); assert.throws(() => verify(root), /ENOENT/);
  const release = clone(trustedRelease().release); release.reviews[0].reviewer = 'tampered'; assert.throws(() => validateRelease(release), /hash mismatch/);
  const { lexiconHash, ...content } = release; void lexiconHash; release.lexiconHash = hash(content);
  assert.throws(() => rebuild(work(t,false),release,LEXICON_HASH), /Untrusted/);
});
test('20B CLI review, publish, re-export after output failure and clean rebuild are reproducible', t => {
  const dir = mkdtempSync(join(tmpdir(),'clause-cli20-')); t.after(() => rmSync(dir,{ recursive: true,force: true }));
  const db = join(dir,'work.sqlite');
  const run = (...args) => spawnSync(process.execPath,['scripts/lexicon.mjs',...args,'--db',db],{ encoding: 'utf8' });
  const ok = (...args) => { const r = run(...args); assert.equal(r.status,0,r.stderr); return JSON.parse(r.stdout); };
  ok('init'); ok('import','--file','data/lexicon/seed.json');
  const row = ok('show','--revision','verb:lexical:give:r1');
  assert.equal(run('review','--revision',row.entry.revisionId,'--hash','0'.repeat(64),'--reviewer','human','--decision','approve').status,1);
  ok('review','--revision',row.entry.revisionId,'--hash',row.contentHash,'--reviewer','human','--decision','approve');
  const selection = join(dir,'manifest.json'); writeFileSync(selection,JSON.stringify({ lexiconVersion: 'cli-1',revisionIds: [row.entry.revisionId] }));
  // DB commit succeeds but atomic file rename fails; no partial JSON is left.
  assert.equal(run('publish','--file',selection,'--out',dir).status,1);
  const target = join(dir,'release.json'); const a = ok('export-release','--version','cli-1','--out',target);
  const bytes = readFileSync(target,'utf8'); assert.equal(a.entries.length,1);
  ok('export-release','--version','cli-1','--out',target); assert.equal(readFileSync(target,'utf8'),bytes);
  assert.equal(run('publish','--file',selection,'--out',target).status,1);
  const other = join(dir,'rebuild.sqlite');
  const call = (...args) => spawnSync(process.execPath,['scripts/lexicon.mjs',...args,'--db',other],{ encoding: 'utf8' });
  for (const command of ['init','rebuild','validate']) { const r = call(command); assert.equal(r.status,0,r.stderr); }
  assert.equal(JSON.parse(call('query','--surface','her').stdout).length,2);
  assert.equal(call('rebuild').status,1);
});
test('20C prototype-name surface is safely handled as unknown', () => {
  assert.deepEqual(surfaceCandidates('constructor',() => true),[]);
  assert.equal(analyzeSentence('The constructor smiles.').reasons[0].code,'unknown-word');
});
test('20C adjective uses are audited independently of word presence', t => runFixture(t,s => {
  const e = s.entries.find(e => e.partOfSpeech === 'adjective' && e.lemma === 'old'); e.attributes.uses = ['attribute'];
},{ 'She gives him an old book.': 'complete', 'The book is old.': 'unsupported', 'She finds it old.': 'unsupported', 'She has been old.': 'unsupported' }));
test('20C candidate explosion exhausts shared budget without leaking nodes or edits', t => runFixture(t,s => {
  const original = s.entries.find(e => e.partOfSpeech === 'adjective' && e.lemma === 'small');
  for (let i=0;i<5;i++) {
    const e = clone(original); e.id = `test-adjective-${i}`; e.revisionId = `${e.id}:r1`; s.entries.push(e);
    s.index.small.push({ entryId: e.id,revisionId: e.revisionId,formKind: 'positive',frameId: null });
  }
},{ 'The small small small small small small children run.': { status: 'unsupported',code: 'budget-exceeded' } }));

test('20C opaque entry/frame IDs cannot collide through delimiter concatenation', t => runFixture(t,s => {
  const original = s.entries.find(e => e.partOfSpeech === 'verb' && e.lemma === 'like');
  original.frames[0].id = 'extra/frame';
  for (const candidates of Object.values(s.index)) for (const c of candidates) if (c.entryId === original.id) c.frameId = 'extra/frame';
  const e = clone(original); e.id += '/extra'; e.revisionId = e.id+':r1'; e.frames[0].id = 'frame'; s.entries.push(e);
  for (const f of e.forms) s.index[f.surface].push({ entryId: e.id,revisionId: e.revisionId,formKind: f.kind,frameId: 'frame' });
},{ 'She likes the book.': 'ambiguous', 'She has liked the book.': 'ambiguous' }));

test('20B full maintenance validation checks frozen release identities and payloads', t => {
  const db = work(t); const r = publish(db,manifest(db));
  assert.deepEqual(validateWorkingReleases(db),{ releases: 1 });
  const verb = r.entries.find(e => e.partOfSpeech === 'verb'); const noun = r.entries.find(e => e.partOfSpeech === 'noun');
  db.prepare('INSERT INTO lexicon_releases VALUES (?,1,?,?)').run('bad-storage',r.lexiconHash,'test');
  db.prepare('INSERT INTO lexicon_release_items VALUES (?,?,?,?,?,?)').run('bad-storage',noun.id,noun.revisionId,verb.reviewId,canonical(verb),verb.contentHash);
  assert.throws(() => validateWorkingReleases(db), /identity mismatch/);
  assert.throws(() => exportRelease(db,'bad-storage'), /identity mismatch/);
});

test('20B fresh work database cannot reuse a repository version for different content', t => {
  const db = work(t); const selection = manifest(db); selection.lexiconVersion = LEXICON_VERSION;
  // Different bound reviewer metadata is part of the release hash, even for the old entries.
  assert.throws(() => publish(db,selection), /Repository release version conflict/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM lexicon_releases').get().n,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM lexicon_release_items').get().n,0);
});

test('20C declarative-only frame rejects erroneous questions with and without a question mark',t=>runFixture(t,s=>{
  s.entries.find(e=>e.partOfSpeech==='verb'&&e.lemma==='give').frames[0].allowedPurposes=['declarative'];
},{
  'Do she give him a book': 'unsupported', 'Do she give him a book?': 'unsupported',
  'Does she gives him a book': 'unsupported', 'Does she gives him a book?': 'unsupported',
  'Can she gives him a book': 'unsupported', 'Can she gives him a book?': 'unsupported',
  'Does she give him a book': 'unsupported', 'Does she give him a book?': 'unsupported',
  'Has she give him a book': 'unsupported', 'Has she give him a book?': 'unsupported',
  'She gives him a book': 'complete',
  'She give him a book': {status:'partial',code:'form-mismatch',corrections:[{ruleId:'AGREEMENT-001',edits:[{range:{start:4,end:8},expected:'give',replacement:'gives'}]}]},
}));
test('20C interrogative-only frame preserves partial question corrections and rejects declaratives',t=>runFixture(t,s=>{
  s.entries.find(e=>e.partOfSpeech==='verb'&&e.lemma==='give').frames[0].allowedPurposes=['interrogative'];
},{
  'Do she give him a book': {status:'partial',code:'form-mismatch',corrections:[{ruleId:'AGREEMENT-001',edits:[{range:{start:0,end:2},expected:'Do',replacement:'Does'}]}]},
  'Does she gives him a book': {status:'partial',code:'form-mismatch',corrections:[{ruleId:'DO-BASE-001',edits:[{range:{start:9,end:14},expected:'gives',replacement:'give'}]}]},
  'Can she gives him a book': {status:'partial',code:'form-mismatch',corrections:[{ruleId:'MODAL-BASE-001',edits:[{range:{start:8,end:13},expected:'gives',replacement:'give'}]}]},
  'Has she give him a book': {status:'partial',code:'form-mismatch',corrections:[]},
  'Has she given him a book':'complete',
  'Does she give him a book':'complete', 'She gives him a book':'unsupported', 'She give him a book':'unsupported',
}));
