import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openDatabase, migrate, importData, query, revise, validateDatabase, readEntry } from '../scripts/lexicon/store.mjs';
import { hash, revisionHash } from '../scripts/lexicon/data.mjs';
import { nouns, adjectives, adjectiveInitialSounds, lexicalVerbs, determiners, subjectPronouns, objectPronouns, directObjectPronouns, knownWords } from '../lib/grammar/vocabulary.ts';

const seed = JSON.parse(readFileSync(new URL('../data/lexicon/seed.json', import.meta.url), 'utf8'));
const clone = v => structuredClone(v);
const oldSurfaces = new Set(seed.entries.flatMap(e => e.forms.map(f => f.surface)));
const oldAdjectives = new Set(seed.entries.filter(e => e.partOfSpeech === 'adjective').map(e => e.lemma));
const oldVerbLemmas = new Set(seed.entries.filter(e => e.partOfSpeech === 'verb').map(e => e.lemma));
function working(t, seeded = true) {
  const db = openDatabase(':memory:'); t.after(() => db.close()); migrate(db); if (seeded) importData(db, seed); return db;
}
const noun = seed.entries.find(e => e.lemma === 'book' && e.partOfSpeech === 'noun');
const verb = seed.entries.find(e => e.lemma === 'give' && e.partOfSpeech === 'verb');

// These fixed counts and contrasts were set from the old manual word table, not analysis output.
test('20A manual seed retains every old surface, form kind, property and membership', t => {
  const db = working(t);
  assert.equal(seed.entries.length, 91);
  assert.equal(seed.entries.reduce((n, e) => n + e.forms.length, 0), 161);
  assert.deepEqual(new Set(seed.entries.flatMap(e => e.forms.map(f => f.surface))), new Set([...knownWords].filter(w => oldSurfaces.has(w))));
  const rows = query(db).map(r => r.entry);
  const nounRows = rows.filter(e => e.partOfSpeech === 'noun'); assert.equal(nounRows.length, 14);
  const flatNouns = Object.fromEntries(nounRows.flatMap(e => e.forms.map(f => [f.surface, { plural: f.kind === 'plural', person: e.attributes.person, initialSound: f.initialSound }])));
  assert.deepEqual(flatNouns, Object.fromEntries(Object.entries(nouns).filter(([w]) => oldSurfaces.has(w))));
  const adjectiveRows = rows.filter(e => e.partOfSpeech === 'adjective'); assert.equal(adjectiveRows.length, 9);
  assert.deepEqual(new Set(adjectiveRows.map(e => e.lemma)), new Set([...adjectives].filter(w => oldAdjectives.has(w))));
  assert.deepEqual(Object.fromEntries(adjectiveRows.map(e => [e.lemma, e.attributes.initialSound])), Object.fromEntries(Object.entries(adjectiveInitialSounds).filter(([w]) => oldAdjectives.has(w))));
  for (const e of adjectiveRows) assert.deepEqual(e.attributes.uses, ['attribute','object-complement','subject-complement']);
  const verbs = rows.filter(e => e.partOfSpeech === 'verb'); assert.equal(verbs.length, 14);
  const oldVerbs = lexicalVerbs.filter(v => oldVerbLemmas.has(v.base)); assert.equal(oldVerbs.length,14);
  for (const old of oldVerbs) {
    const e = verbs.find(e => e.lemma === old.base);
    assert.deepEqual(Object.fromEntries(e.forms.map(f => [f.kind, f.surface])), { base: old.base, third: old.third, past: old.past, participle: old.participle, progressive: old.progressive });
    assert.equal(e.frames[0].pattern, old.pattern);
    assert.equal(e.frames[0].allowProgressive, true); assert.equal(e.frames[0].allowPerfect, true);
    assert.equal(e.frames[0].passivePromotion, old.pattern === 'SVO' ? 'direct-object' : old.pattern === 'SVOO' ? 'direct-object-or-recipient' : null);
  }
  const members = kind => new Set(rows.filter(e => e.attributes.markerKind === kind).map(e => e.lemma));
  assert.deepEqual(members('determiner'), determiners); assert.deepEqual(members('subject-pronoun'), subjectPronouns);
  assert.deepEqual(members('object-pronoun'), directObjectPronouns);
  assert.deepEqual(new Set(rows.filter(e => e.attributes.uses?.includes('recipient')).map(e => e.lemma)), objectPronouns);
  assert.deepEqual(validateDatabase(db), { sources: 1, revisions: 91 });
  assert.equal(query(db).every(r => r.status === 'draft'), true);
});

test('20A retains fixed frames, same-surface forms and cross-category candidates', t => {
  const db = working(t);
  assert.equal(query(db, { surface: 'her' }).length, 2);
  assert.equal(query(db, { surface: 'you' }).length, 2);
  assert.equal(query(db, { surface: 'sent' })[0].entry.forms.filter(f => f.surface === 'sent').length, 2);
  assert.equal(query(db, { lemma: 'run', partOfSpeech: 'verb' })[0].entry.forms.filter(f => f.surface === 'run').length, 2);
  assert.equal(query(db, { lemma: 'go' })[0].entry.frames[0].fixedTail, 'to school');
  assert.equal(query(db, { lemma: 'give' })[0].entry.frames[0].recipient, 'person');
  assert.equal(query(db, { lemma: 'give' })[0].entry.frames[0].passivePromotion, 'direct-object-or-recipient');
  assert.equal(query(db, { lemma: 'like' })[0].entry.frames[0].passivePromotion, 'direct-object');
  assert.equal(query(db, { lemma: 'make' })[0].entry.frames[0].complement, 'single-adjective');
  assert.equal(query(db, { lemma: 'make' })[0].entry.frames[0].passivePromotion, null);
  assert.equal(query(db, { lemma: 'is' })[0].entry.frames[0].complement, 'noun-or-single-adjective');
  assert.equal(query(db, { lemma: 'it', partOfSpeech: 'function-word' }).filter(r => r.entry.attributes.markerKind === 'object-pronoun')[0].entry.attributes.uses.includes('recipient'), false);
});

test('20A migration and seed import are idempotent without rewriting revisions', t => {
  const db = working(t, false);
  assert.deepEqual(migrate(db), { migrations: 3 });
  assert.deepEqual(importData(db, seed), { inserted: 91, unchanged: 0 });
  const before = query(db);
  assert.deepEqual(importData(db, seed), { inserted: 0, unchanged: 91 }); assert.deepEqual(query(db), before);
  db.prepare("UPDATE lexicon_migrations SET hash='bad' WHERE tag='0001_lexicon_guards'").run();
  assert.throws(() => migrate(db), /Migration hash mismatch/);
});

for (const [label, mutate, expected] of [
  ['missing plural', e => e.forms.pop(), /Required form kinds/],
  ['wrong initial sound', e => { e.forms[0].initialSound = 'vowel'; }, /initial sound/],
  ['unknown attribute', e => { e.attributes.uploadedSentence = 'hidden'; }, /Unrecognized key/],
  ['forged approval', e => { e.status = 'approved'; }, /Unrecognized key/],
  ['forged review hash', e => { e.contentHash = '0'.repeat(64); e.reviewId = 'fake'; }, /Unrecognized key/],
  ['illegal surface', e => { e.forms[0].surface = 'two words'; }, /Invalid/],
]) test(`20A rejects ${label} without partial writes`, t => {
  const db = working(t, false); const data = clone(seed); mutate(data.entries.find(e => e.id === noun.id));
  assert.throws(() => importData(db, data), expected); assert.equal(query(db).length, 0); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lexicon_sources').get().n, 0);
});

for (const [label, mutate] of [
  ['wrong recipient', f => { f.recipient = null; }],
  ['wrong complement', f => { f.complement = 'single-adjective'; }],
  ['unsupported passive', f => { f.passivePromotion = 'direct-object'; }],
  ['illegal destination', f => { f.fixedTail = 'to school'; }],
  ['duplicate purpose', f => { f.allowedPurposes.push('declarative'); }],
]) test(`20A rejects ${label} frame`, t => {
  const db = working(t, false); const entry = clone(verb); mutate(entry.frames[0]);
  assert.throws(() => importData(db, { sources: seed.sources, entries: [entry] })); assert.equal(query(db).length, 0);
});

test('20A rejects duplicate IDs, missing source, conflicts and existing-entry imports atomically', t => {
  const db = working(t, false);
  assert.throws(() => importData(db, { ...seed, entries: [noun, noun] }), /Duplicate entry ID/);
  const sameRevision = clone(noun); sameRevision.id = 'different-entry';
  assert.throws(() => importData(db, { ...seed, entries: [noun, sameRevision] }), /Duplicate revision ID/);
  assert.throws(() => importData(db, { sources: [seed.sources[0], seed.sources[0]], entries: [] }), /Duplicate source ID/);
  const marker = clone(seed.entries.find(e => e.lemma === 'a')); marker.attributes.uses = ['passive-agent'];
  assert.throws(() => importData(db, { sources: seed.sources, entries: [marker] }), /Unsupported marker use/);
  const missing = clone(verb); missing.sourceIds = ['missing'];
  assert.throws(() => importData(db, { sources: seed.sources, entries: [noun, missing] }), /Missing source/);
  assert.equal(query(db).length, 0); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lexicon_sources').get().n, 0);
  importData(db, { sources: seed.sources, entries: [noun] });
  const changed = clone(noun); changed.attributes.person = true;
  assert.throws(() => importData(db, { sources: [], entries: [verb, changed] }), /Conflicting revision ID/);
  assert.equal(query(db).length, 1);
  changed.revisionId += '-new'; assert.throws(() => importData(db, { sources: [], entries: [changed] }), /requires revise/);
  const source = clone(seed.sources[0]); source.license = 'other';
  assert.throws(() => importData(db, { sources: [source], entries: [] }), /Conflicting source/);
});

test('20A explicit full revision creates independent draft and refuses reused identity/review fields', t => {
  const db = working(t); const before = readEntry(db, noun.revisionId);
  const replacement = clone(noun); replacement.revisionId = `${noun.id}:r2`; replacement.attributes.person = true;
  const next = revise(db, noun.revisionId, replacement);
  assert.equal(next.status, 'draft'); assert.equal(next.revisionNumber, 2); assert.notEqual(next.contentHash, before.contentHash);
  assert.deepEqual(readEntry(db, noun.revisionId), before);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lexicon_reviews').get().n, 0);
  assert.throws(() => revise(db, noun.revisionId, replacement), /UNIQUE/);
  replacement.revisionId = `${noun.id}:r3`; replacement.sourceIds = ['missing'];
  assert.throws(() => revise(db, noun.revisionId, replacement), /Missing source/);
  assert.equal(query(db, { lemma: 'book' }).length, 2);
  replacement.sourceIds = noun.sourceIds; replacement.id = 'other'; assert.throws(() => revise(db, noun.revisionId, replacement), /preserve entry ID/);
  assert.deepEqual(validateDatabase(db), { sources: 1, revisions: 92 });
});

test('20A SQLite constraints reject invalid enum, flags, references and ID independently of importer', t => {
  const db = working(t);
  assert.throws(() => db.prepare("INSERT INTO lexicon_forms VALUES ('missing','marker','word',NULL)").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE lexicon_forms SET surface='Bad Word' WHERE revision_id=?").run(noun.revisionId), /CHECK/);
  assert.throws(() => db.prepare("UPDATE lexicon_forms SET form_kind='other' WHERE revision_id=?").run(noun.revisionId), /CHECK/);
  assert.throws(() => db.prepare("UPDATE lexicon_frames SET allow_progressive=2 WHERE revision_id=?").run(verb.revisionId), /CHECK/);
  assert.throws(() => db.prepare("UPDATE lexicon_frames SET pattern='SVC' WHERE revision_id=?").run(verb.revisionId), /CHECK/);
  assert.throws(() => db.prepare("UPDATE lexicon_frames SET allowed_purposes_json='[\"unknown\"]' WHERE revision_id=?").run(verb.revisionId), /Invalid frame purpose/);
  assert.throws(() => db.prepare("UPDATE lexicon_frames SET allowed_polarities_json='[null]' WHERE revision_id=?").run(verb.revisionId), /Invalid frame/);
  assert.throws(() => db.prepare("UPDATE lexicon_frames SET allowed_polarities_json='[\"positive\",\"positive\"]' WHERE revision_id=?").run(verb.revisionId), /Invalid frame/);
  assert.throws(() => db.prepare("INSERT INTO lexicon_entries VALUES ('','today')").run(), /CHECK/);
  assert.throws(() => db.prepare("UPDATE lexicon_revisions SET status='approved' WHERE id=?").run(noun.revisionId), /Matching review/);
  assert.throws(() => db.prepare("INSERT INTO lexicon_reviews VALUES ('fake',?,'0000000000000000000000000000000000000000000000000000000000000000','approve','tester','now')").run(noun.revisionId), /match draft hash/);
  assert.deepEqual(validateDatabase(db), { sources: 1, revisions: 91 });
});

test('20A frozen revision and children reject direct SQL mutation; copy does not inherit review', t => {
  const db = working(t); const before = readEntry(db, verb.revisionId);
  // Exercise storage guards; human review and release workflow ships in 20B.
  db.prepare("INSERT INTO lexicon_reviews VALUES ('test-review',?,?,'approve','storage-test','now')").run(verb.revisionId, before.contentHash);
  db.prepare("UPDATE lexicon_revisions SET status='approved' WHERE id=?").run(verb.revisionId);
  for (const sql of [
    'UPDATE lexicon_revisions SET lemma=\'changed\' WHERE id=?',
    'DELETE FROM lexicon_revisions WHERE id=?',
    'UPDATE lexicon_forms SET surface=\'changed\' WHERE revision_id=?',
    'DELETE FROM lexicon_forms WHERE revision_id=?',
    'DELETE FROM lexicon_frames WHERE revision_id=?',
    'UPDATE lexicon_frames SET allow_perfect=0 WHERE revision_id=?',
    'DELETE FROM lexicon_revision_sources WHERE revision_id=?',
    "INSERT INTO lexicon_forms VALUES (?,'marker','changed',NULL)",
  ]) assert.throws(() => db.prepare(sql).run(verb.revisionId), /immutable/);
  assert.throws(() => db.exec("DELETE FROM lexicon_reviews WHERE id='test-review'"), /immutable/);
  assert.throws(() => db.exec("UPDATE lexicon_sources SET title='changed'"), /immutable/);
  const next = clone(verb); next.revisionId = `${verb.id}:r2`; next.frames[0].allowProgressive = false;
  const b = revise(db, verb.revisionId, next); assert.equal(b.status, 'draft'); assert.notEqual(b.contentHash, before.contentHash);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lexicon_reviews WHERE revision_id=?').get(next.revisionId).n, 0);
  assert.throws(() => db.prepare("UPDATE lexicon_revisions SET status='approved' WHERE id=?").run(next.revisionId), /Matching review/);
  assert.deepEqual(readEntry(db, verb.revisionId).entry, before.entry);
  assert.deepEqual(validateDatabase(db), { sources: 1, revisions: 92 });
});


for (const [status, decision] of [['approved', 'approve'], ['rejected', 'reject']]) test(`20A ${status} revision cannot be replaced through any unique identity`, t => {
  const db = working(t);
  db.exec('PRAGMA recursive_triggers = OFF');
  assert.equal(db.prepare('PRAGMA recursive_triggers').get().recursive_triggers, 0);
  const original = readEntry(db, verb.revisionId);
  db.prepare("INSERT INTO lexicon_reviews VALUES ('replacement-review',?,?,?,'storage-test','now')").run(verb.revisionId, original.contentHash, decision);
  db.prepare('UPDATE lexicon_revisions SET status=? WHERE id=?').run(status, verb.revisionId);
  const before = readEntry(db, verb.revisionId);
  const columns = 'entry_id,revision_number,lemma,part_of_speech,sense,status,person,initial_sound,adjective_uses_json,marker_kind,attributes_json,content_hash';
  // Same primary key, same (entry, number) under another ID, and hidden rowid collisions.
  for (const sql of [
    `INSERT OR REPLACE INTO lexicon_revisions SELECT id,entry_id,revision_number,lemma,part_of_speech,sense,'draft',person,initial_sound,adjective_uses_json,marker_kind,attributes_json,content_hash FROM lexicon_revisions WHERE id=?`,
    `REPLACE INTO lexicon_revisions (id,${columns}) SELECT 'replacement-id',entry_id,revision_number,lemma,part_of_speech,sense,'draft',person,initial_sound,adjective_uses_json,marker_kind,attributes_json,content_hash FROM lexicon_revisions WHERE id=?`,
    `INSERT OR REPLACE INTO lexicon_revisions (rowid,id,${columns}) SELECT rowid,'replacement-id',entry_id,100,lemma,part_of_speech,sense,'draft',person,initial_sound,adjective_uses_json,marker_kind,attributes_json,content_hash FROM lexicon_revisions WHERE id=?`,
  ]) {
    assert.throws(() => db.prepare(sql).run(verb.revisionId), /immutable/);
    assert.deepEqual(readEntry(db, verb.revisionId), before);
    assert.equal(db.prepare("SELECT id FROM lexicon_revisions WHERE id='replacement-id'").get(), undefined);
  }
  assert.throws(() => db.prepare('UPDATE lexicon_frames SET allow_progressive=0 WHERE revision_id=?').run(verb.revisionId), /immutable/);
  const next = clone(verb); next.revisionId = `${verb.id}:r2`;
  assert.equal(revise(db, verb.revisionId, next).status, 'draft');
  assert.deepEqual(validateDatabase(db), { sources: 1, revisions: 92 });
});

test('20A frozen records reject REPLACE including rowid conflicts with recursive triggers off', t => {
  const db = working(t); db.exec('PRAGMA recursive_triggers = OFF');
  const { contentHash } = readEntry(db, verb.revisionId);
  // Keep the revision draft so the existing review_matches_draft guard would permit a replacement.
  db.prepare("INSERT INTO lexicon_reviews VALUES ('frozen-review',?,?,'approve','storage-test','now')").run(verb.revisionId, contentHash);
  db.prepare("INSERT INTO lexicon_releases VALUES ('storage-test',1,?,'now')").run('a'.repeat(64));
  db.prepare("INSERT INTO lexicon_release_items VALUES ('storage-test',?,?, 'frozen-review','{}',?)").run(verb.id, verb.revisionId, contentHash);
  for (const [table, sql] of [
    ['lexicon_sources', "SELECT id,version,'changed source',license,attribution,frozen_hash FROM lexicon_sources"],
    ['lexicon_reviews', "SELECT id,revision_id,content_hash,decision,'changed reviewer',reviewed_at FROM lexicon_reviews"],
    ['lexicon_releases', "SELECT lexicon_version,format_version,'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',published_at FROM lexicon_releases"],
    ['lexicon_release_items', "SELECT lexicon_version,entry_id,revision_id,review_id,'{\"changed\":true}',content_hash FROM lexicon_release_items"],
  ]) {
    const before = db.prepare(`SELECT * FROM ${table}`).all();
    assert.throws(() => db.exec(`INSERT OR REPLACE INTO ${table} ${sql}`), /immutable/);
    assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all(), before);
  }
  for (const [table, sql] of [
    ['lexicon_sources', "SELECT rowid,'new-source',version,title,license,attribution,frozen_hash FROM lexicon_sources"],
    ['lexicon_reviews', "SELECT rowid,'new-review',revision_id,content_hash,decision,reviewer,reviewed_at FROM lexicon_reviews"],
    ['lexicon_releases', "SELECT rowid,'new-release',format_version,lexicon_hash,published_at FROM lexicon_releases"],
    ['lexicon_release_items', `SELECT rowid,lexicon_version,'${noun.id}','${noun.revisionId}',review_id,frozen_content_json,content_hash FROM lexicon_release_items`],
  ]) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name).join(',');
    const before = db.prepare(`SELECT * FROM ${table}`).all();
    assert.throws(() => db.exec(`REPLACE INTO ${table} (rowid,${columns}) ${sql}`), /immutable/);
    assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all(), before);
  }
  const source = { ...seed.sources[0], id: 'new-source', version: 'next' };
  assert.deepEqual(importData(db, { sources: [source], entries: [] }), { inserted: 0, unchanged: 0 });
  assert.deepEqual(validateDatabase(db), { sources: 2, revisions: 91 });
});

test('20A full validation detects missing forms and stale draft content hashes', t => {
  const db = working(t);
  db.prepare("DELETE FROM lexicon_forms WHERE revision_id=? AND form_kind='plural'").run(noun.revisionId);
  assert.throws(() => validateDatabase(db), /Required form kinds/);
  db.prepare("INSERT INTO lexicon_forms VALUES (?,'plural','books','consonant')").run(noun.revisionId);
  db.prepare("UPDATE lexicon_forms SET surface='bookz' WHERE revision_id=? AND form_kind='plural'").run(noun.revisionId);
  assert.throws(() => validateDatabase(db), /Revision hash mismatch/);
});

test('20A hash is independent of key/set order and covers source/form/frame changes', t => {
  const db = working(t); const original = readEntry(db, verb.revisionId);
  const reversed = clone(seed); reversed.entries.reverse();
  for (const e of reversed.entries) { e.forms.reverse(); e.frames.reverse(); e.sourceIds.reverse(); for (const f of e.frames) { f.allowedPurposes.reverse(); f.allowedPolarities.reverse(); } }
  assert.deepEqual(importData(db, reversed), { inserted: 0, unchanged: 91 });
  assert.equal(hash({ b: 1, a: 2 }), hash({ a: 2, b: 1 }));
  assert.deepEqual(readEntry(db, verb.revisionId), original);
  const extra = { ...seed.sources[0], id: 'second-source', version: 'next' };
  const entry = clone(verb); entry.sourceIds.push(extra.id);
  const sources = [...seed.sources, extra]; const originalHash = revisionHash(entry, sources);
  entry.sourceIds.reverse(); sources.reverse(); assert.equal(revisionHash(entry, sources), originalHash);
  extra.license = 'updated'; assert.notEqual(revisionHash(entry, sources), originalHash);
  extra.license = seed.sources[0].license; entry.frames[0].allowPerfect = false; assert.notEqual(revisionHash(entry, sources), originalHash); entry.frames[0].allowPerfect = true; entry.forms.find(f => f.kind === 'past').surface += 'z'; assert.notEqual(revisionHash(entry, sources), originalHash);
});

test('20A CLI rebuilds an on-disk work database and can run without a server', () => {
  const dir = mkdtempSync(join(tmpdir(), 'clause-20a-cli-')); const path = join(dir, 'nested', 'working.sqlite');
  const run = (...args) => spawnSync(process.execPath, ['scripts/lexicon.mjs', ...args, '--db', path], { encoding: 'utf8' });
  try {
    assert.equal(run('query').status, 1);
    for (const args of [['init'], ['migrate'], ['import','--file','data/lexicon/seed.json'], ['validate']]) { const r = run(...args); assert.equal(r.status, 0, r.stderr); }
    const result = run('query','--surface','her'); assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).length, 2);
    assert.equal(run('query','--file','data/lexicon/seed.json').status, 1);
    const db = openDatabase(path); try { assert.deepEqual(validateDatabase(db), { sources: 1, revisions: 91 }); } finally { db.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
