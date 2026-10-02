import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { canonical, hash, importSchema, normalizeEntry, revisionHash } from './data.mjs';

const migrationRoot = fileURLToPath(new URL('../../drizzle/', import.meta.url));
export function openDatabase(path, create = false) {
  if (path !== ':memory:') {
    if (!create && !existsSync(path)) throw new Error('Database missing; run init first');
    if (create) mkdirSync(dirname(resolve(path)), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return db;
}
export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function migrate(db) {
  const journal = JSON.parse(readFileSync(resolve(migrationRoot, 'meta/_journal.json'), 'utf8'));
  return transaction(db, () => {
    db.exec('CREATE TABLE IF NOT EXISTS lexicon_migrations (tag TEXT PRIMARY KEY, hash TEXT NOT NULL)');
    const applied = db.prepare('SELECT tag, hash FROM lexicon_migrations').all();
    if (applied.some(row => !journal.entries.some(e => e.tag === row.tag))) throw new Error('Unknown applied migration');
    for (const { tag } of journal.entries) {
      const sql = readFileSync(resolve(migrationRoot, `${tag}.sql`), 'utf8');
      const digest = createHash('sha256').update(sql).digest('hex');
      const previous = applied.find(row => row.tag === tag);
      if (previous) {
        if (previous.hash !== digest) throw new Error(`Migration hash mismatch: ${tag}`);
        continue;
      }
      db.exec(sql);
      db.prepare('INSERT INTO lexicon_migrations VALUES (?, ?)').run(tag, digest);
    }
    return { migrations: journal.entries.length };
  });
}
export function readSources(db) {
  return db.prepare('SELECT id, version, title, license, attribution FROM lexicon_sources ORDER BY id').all().map(row => ({ ...row }));
}
export function readEntry(db, revisionId) {
  const row = db.prepare('SELECT * FROM lexicon_revisions WHERE id=?').get(revisionId);
  if (!row) throw new Error(`Unknown revision: ${revisionId}`);
  const entry = {
    id: row.entry_id, revisionId: row.id, lemma: row.lemma, partOfSpeech: row.part_of_speech, sense: row.sense,
    attributes: JSON.parse(row.attributes_json),
    forms: db.prepare('SELECT form_kind, surface, initial_sound FROM lexicon_forms WHERE revision_id=? ORDER BY form_kind').all(revisionId)
      .map(f => ({ kind: f.form_kind, surface: f.surface, initialSound: f.initial_sound })),
    frames: db.prepare('SELECT * FROM lexicon_frames WHERE revision_id=? ORDER BY id').all(revisionId).map(f => ({
      id: f.id, pattern: f.pattern, recipient: f.recipient, complement: f.complement, allowProgressive: Boolean(f.allow_progressive), allowPerfect: Boolean(f.allow_perfect),
      passivePromotion: f.passive_promotion, allowedPurposes: JSON.parse(f.allowed_purposes_json), allowedPolarities: JSON.parse(f.allowed_polarities_json), fixedTail: f.fixed_tail,
    })),
    sourceIds: db.prepare('SELECT source_id FROM lexicon_revision_sources WHERE revision_id=? ORDER BY source_id').all(revisionId).map(r => r.source_id),
  };
  return { entry, status: row.status, revisionNumber: row.revision_number, contentHash: row.content_hash };
}
function insertRevision(db, entry, revisionNumber, sources) {
  const attrs = entry.attributes;
  db.prepare(`INSERT INTO lexicon_revisions (id,entry_id,revision_number,lemma,part_of_speech,sense,status,person,initial_sound,adjective_uses_json,marker_kind,attributes_json,content_hash)
    VALUES (?,?,?,?,?,?,'draft',?,?,?,?,?,?)`).run(entry.revisionId, entry.id, revisionNumber, entry.lemma, entry.partOfSpeech, entry.sense,
    typeof attrs.person === 'boolean' ? Number(attrs.person) : null, attrs.initialSound ?? null, entry.partOfSpeech === 'adjective' ? canonical(attrs.uses) : null,
    attrs.markerKind ?? null, canonical(attrs), revisionHash(entry, sources));
  const form = db.prepare('INSERT INTO lexicon_forms VALUES (?,?,?,?)');
  for (const f of entry.forms) form.run(entry.revisionId, f.kind, f.surface, f.initialSound);
  const frame = db.prepare('INSERT INTO lexicon_frames VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  for (const f of entry.frames) frame.run(f.id, entry.revisionId, f.pattern, f.recipient, f.complement, Number(f.allowProgressive), Number(f.allowPerfect), f.passivePromotion,
    canonical(f.allowedPurposes), canonical(f.allowedPolarities), f.fixedTail);
  const source = db.prepare('INSERT INTO lexicon_revision_sources VALUES (?,?)');
  for (const id of entry.sourceIds) source.run(entry.revisionId, id);
}
export function importData(db, raw) {
  const data = importSchema.parse(raw);
  const entries = data.entries.map(normalizeEntry);
  for (const [name, ids] of [['entry', entries.map(e => e.id)], ['revision', entries.map(e => e.revisionId)], ['source', data.sources.map(s => s.id)]]) {
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${name} ID`);
  }
  return transaction(db, () => {
    const sourceInsert = db.prepare('INSERT INTO lexicon_sources VALUES (?,?,?,?,?,?)');
    for (const source of data.sources) {
      const existing = readSources(db).find(s => s.id === source.id);
      if (existing) { if (canonical(existing) !== canonical(source)) throw new Error(`Conflicting source ID: ${source.id}`); }
      else sourceInsert.run(source.id, source.version, source.title, source.license, source.attribution, hash(source));
    }
    const sources = readSources(db);
    let inserted = 0;
    for (const entry of entries) {
      revisionHash(entry, sources); // Validate all references before inserting this revision.
      const existing = db.prepare('SELECT id FROM lexicon_revisions WHERE id=?').get(entry.revisionId);
      if (existing) {
        const previous = readEntry(db, entry.revisionId);
        if (canonical(normalizeEntry(previous.entry)) !== canonical(entry) || previous.contentHash !== revisionHash(entry, sources)) throw new Error(`Conflicting revision ID: ${entry.revisionId}`);
        continue;
      }
      if (db.prepare('SELECT id FROM lexicon_entries WHERE id=?').get(entry.id)) throw new Error(`Existing entry requires revise: ${entry.id}`);
      db.prepare('INSERT INTO lexicon_entries VALUES (?,?)').run(entry.id, new Date().toISOString());
      insertRevision(db, entry, 1, sources); inserted++;
    }
    return { inserted, unchanged: entries.length - inserted };
  });
}
export function revise(db, fromRevisionId, raw) {
  const replacement = normalizeEntry(raw); // Complete replacement: no implicit partial edits.
  return transaction(db, () => {
    const original = readEntry(db, fromRevisionId);
    if (replacement.id !== original.entry.id || replacement.revisionId === fromRevisionId) throw new Error('Revision must preserve entry ID and use a new revision ID');
    const number = db.prepare('SELECT MAX(revision_number) AS number FROM lexicon_revisions WHERE entry_id=?').get(replacement.id).number + 1;
    insertRevision(db, replacement, number, readSources(db));
    return readEntry(db, replacement.revisionId);
  });
}
export function query(db, { lemma, surface, partOfSpeech } = {}) {
  const clauses = [], params = [];
  if (lemma !== undefined) { clauses.push('lemma=?'); params.push(lemma); }
  if (partOfSpeech !== undefined) { clauses.push('part_of_speech=?'); params.push(partOfSpeech); }
  if (surface !== undefined) { clauses.push('EXISTS (SELECT 1 FROM lexicon_forms f WHERE f.revision_id=lexicon_revisions.id AND f.surface=?)'); params.push(surface); }
  return db.prepare(`SELECT id FROM lexicon_revisions${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY entry_id, revision_number`).all(...params).map(row => readEntry(db, row.id));
}
export function validateDatabase(db) {
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Database integrity failure');
  const sources = readSources(db);
  for (const s of sources) if (db.prepare('SELECT frozen_hash FROM lexicon_sources WHERE id=?').get(s.id).frozen_hash !== hash(s)) throw new Error(`Source hash mismatch: ${s.id}`);
  for (const { id } of db.prepare('SELECT id FROM lexicon_entries').all()) {
    if (!db.prepare('SELECT id FROM lexicon_revisions WHERE entry_id=?').get(id)) throw new Error(`Entry has no revision: ${id}`);
  }
  const rows = query(db);
  for (const { entry, contentHash, status } of rows) {
    const normalized = normalizeEntry(entry);
    if (revisionHash(normalized, sources) !== contentHash) throw new Error(`Revision hash mismatch: ${entry.revisionId}`);
    const row = db.prepare('SELECT * FROM lexicon_revisions WHERE id=?').get(entry.revisionId);
    if (row.person !== (typeof entry.attributes.person === 'boolean' ? Number(entry.attributes.person) : null) || row.initial_sound !== (entry.attributes.initialSound ?? null) ||
      row.marker_kind !== (entry.attributes.markerKind ?? null) || row.adjective_uses_json !== (entry.partOfSpeech === 'adjective' ? canonical(entry.attributes.uses) : null)) throw new Error(`Revision attribute columns differ: ${entry.revisionId}`);
    if (status !== 'draft' && !db.prepare('SELECT id FROM lexicon_reviews WHERE revision_id=? AND content_hash=? AND decision=?').get(entry.revisionId, contentHash, status === 'approved' ? 'approve' : 'reject')) throw new Error('Matching review missing');
  }
  return { sources: sources.length, revisions: rows.length };
}
