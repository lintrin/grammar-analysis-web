import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { canonical, hash, normalizeEntry, revisionHash, sourceSchema } from './data.mjs';
import { openDatabase, migrate, transaction, readEntry, readSources, importData, validateDatabase } from './store.mjs';
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().min(1).refine(s => s.trim().length > 0);
const reviewSchema = z.object({ id: text, revisionId: text, contentHash: digest, decision: z.literal('approve'), reviewer: text }).strict();
const releaseSchema = z.object({ formatVersion: z.literal(1), lexiconVersion: z.string().regex(/^[a-zA-Z0-9._-]+$/), lexiconHash: digest, sources: z.array(sourceSchema), entries: z.array(z.unknown()).min(1), reviews: z.array(reviewSchema) }).strict();
export function review(db, revisionId, previewHash, reviewer, decision) {
  text.parse(reviewer); z.enum(['approve','reject']).parse(decision); digest.parse(previewHash);
  return transaction(db, () => {
    validateDatabase(db);
    const row = readEntry(db, revisionId);
    if (row.status !== 'draft' || revisionHash(row.entry, readSources(db)) !== previewHash || row.contentHash !== previewHash) throw new Error('Review requires current draft hash');
    const id = `review:${revisionId}:${previewHash}:${decision}`;
    db.prepare('INSERT INTO lexicon_reviews VALUES (?,?,?,?,?,?)').run(id, revisionId, previewHash, decision, reviewer, new Date().toISOString());
    db.prepare('UPDATE lexicon_revisions SET status=? WHERE id=?').run(decision === 'approve' ? 'approved' : 'rejected', revisionId);
    return { id, revisionId, contentHash: previewHash, decision, reviewer };
  });
}
export function validateRelease(raw) {
  const release = releaseSchema.parse(raw);
  const unique = (items, key) => { if (new Set(items.map(x => x[key])).size !== items.length) throw new Error(`Duplicate ${key}`); };
  unique(release.sources,'id'); unique(release.reviews,'id');
  release.sources.sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  release.reviews.sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  release.entries = release.entries.map(rawEntry => {
    const { contentHash, reviewId, ...data } = rawEntry;
    digest.parse(contentHash); text.parse(reviewId);
    const entry = normalizeEntry(data);
    if (revisionHash(entry, release.sources) !== contentHash) throw new Error('Release revision hash mismatch');
    const approval = release.reviews.find(r => r.id === reviewId);
    if (!approval || approval.revisionId !== entry.revisionId || approval.contentHash !== contentHash) throw new Error('Release matching approval missing');
    return { ...entry, contentHash, reviewId };
  }).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  unique(release.entries,'id'); unique(release.entries,'revisionId');
  if (release.reviews.length !== release.entries.length || release.sources.some(s => !release.entries.some(e => e.sourceIds.includes(s.id)))) throw new Error('Unreferenced release metadata');
  const { lexiconHash, ...content } = release;
  if (hash(content) !== lexiconHash) throw new Error('Release hash mismatch');
  if (canonical(raw) !== canonical(release)) throw new Error('Release arrays must be canonically sorted');
  return release;
}
export function publish(db, manifest) {
  const selection = z.object({ lexiconVersion: z.string().regex(/^[a-zA-Z0-9._-]+$/), revisionIds: z.array(text).min(1) }).strict().parse(manifest);
  return transaction(db, () => {
    validateDatabase(db);
    const sources = readSources(db), reviews = [];
    const entries = selection.revisionIds.map(id => {
      const row = readEntry(db,id);
      if (row.status !== 'approved') throw new Error('Publish requires approved revision');
      const approval = db.prepare("SELECT id,revision_id,content_hash,decision,reviewer FROM lexicon_reviews WHERE revision_id=? AND content_hash=? AND decision='approve'").get(id,row.contentHash);
      if (!approval) throw new Error('Matching approval missing');
      reviews.push({ id: approval.id, revisionId: id, contentHash: approval.content_hash, decision: approval.decision, reviewer: approval.reviewer });
      return { ...normalizeEntry(row.entry), contentHash: row.contentHash, reviewId: approval.id };
    }).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    reviews.sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const content = { formatVersion: 1, lexiconVersion: selection.lexiconVersion, sources: sources.filter(s => entries.some(e => e.sourceIds.includes(s.id))), entries, reviews };
    const release = validateRelease({ ...content, lexiconHash: hash(content) });
    const fixedPath = new URL(`../../data/lexicon/releases/${release.lexiconVersion}.json`,import.meta.url);
    if (existsSync(fixedPath)) {
      const fixed = validateRelease(JSON.parse(readFileSync(fixedPath,'utf8')));
      if (fixed.lexiconVersion !== release.lexiconVersion || fixed.lexiconHash !== release.lexiconHash) throw new Error('Repository release version conflict');
    }
    if (db.prepare('SELECT lexicon_version FROM lexicon_releases WHERE lexicon_version=?').get(selection.lexiconVersion)) throw new Error('Release version already published');
    db.prepare('INSERT INTO lexicon_releases VALUES (?,?,?,?)').run(release.lexiconVersion,1,release.lexiconHash,new Date().toISOString());
    for (const e of entries) db.prepare('INSERT INTO lexicon_release_items VALUES (?,?,?,?,?,?)').run(release.lexiconVersion,e.id,e.revisionId,e.reviewId,canonical(e),e.contentHash);
    return release;
  });
}
export function exportRelease(db, version) {
  const row = db.prepare('SELECT * FROM lexicon_releases WHERE lexicon_version=?').get(version);
  if (!row) throw new Error('Unknown release');
  const entries = db.prepare('SELECT * FROM lexicon_release_items WHERE lexicon_version=? ORDER BY entry_id').all(version).map(r => {
    const entry = JSON.parse(r.frozen_content_json);
    if (entry.id !== r.entry_id || entry.revisionId !== r.revision_id || entry.reviewId !== r.review_id || entry.contentHash !== r.content_hash) throw new Error('Frozen release item identity mismatch');
    return entry;
  });
  const sources = readSources(db).filter(s => entries.some(e => e.sourceIds.includes(s.id)));
  const reviews = entries.map(e => {
    const r = db.prepare('SELECT * FROM lexicon_reviews WHERE id=?').get(e.reviewId);
    return { id: r.id, revisionId: r.revision_id, contentHash: r.content_hash, decision: r.decision, reviewer: r.reviewer };
  }).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return validateRelease({ formatVersion: row.format_version, lexiconVersion: version, lexiconHash: row.lexicon_hash, sources, entries, reviews });
}
export function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  try { writeFileSync(temp, canonical(value)+'\n', { flag: 'wx' }); renameSync(temp,path); }
  finally { rmSync(temp,{ force: true }); }
}
// Trust comes from the application manifest in the checkout, never uploaded approvals.
export function trustedRelease(root = new URL('../../',import.meta.url)) {
  const manifest = JSON.parse(readFileSync(new URL('data/analysis-manifest.json',root),'utf8'));
  if (!/^[a-zA-Z0-9._-]+$/.test(manifest.lexiconVersion)) throw new Error('Invalid release version');
  const release = validateRelease(JSON.parse(readFileSync(new URL(`data/lexicon/releases/${manifest.lexiconVersion}.json`,root),'utf8')));
  if (release.lexiconHash !== manifest.lexiconHash || release.formatVersion !== manifest.lexiconFormatVersion) throw new Error('Manifest mismatch');
  return { release, manifest };
}
export function rebuild(db, release, trustedHash) {
  release = validateRelease(release);
  if (release.lexiconHash !== trustedHash) throw new Error('Untrusted release');
  if (['lexicon_entries','lexicon_sources','lexicon_releases'].some(table => db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get())) throw new Error('Rebuild requires empty migrated database');
  const stage = openDatabase(':memory:',true);
  try {
    migrate(stage);
    const entries = release.entries.map(({ contentHash, reviewId, ...entry }) => { void contentHash; void reviewId; return entry; });
    importData(stage,{ sources: release.sources, entries });
    transaction(stage, () => {
      for (const r of release.reviews) {
        stage.prepare('INSERT INTO lexicon_reviews VALUES (?,?,?,?,?,?)').run(r.id,r.revisionId,r.contentHash,r.decision,r.reviewer,'reconstructed');
        stage.prepare("UPDATE lexicon_revisions SET status='approved' WHERE id=?").run(r.revisionId);
      }
    });
    const reconstructed = publish(stage,{ lexiconVersion: release.lexiconVersion, revisionIds: entries.map(e => e.revisionId) });
    if (canonical(reconstructed) !== canonical(release)) throw new Error('Rebuild differs');
    return transaction(db, () => {
      for (const table of ['lexicon_sources','lexicon_entries','lexicon_revisions','lexicon_forms','lexicon_frames','lexicon_revision_sources','lexicon_reviews','lexicon_releases','lexicon_release_items']) {
        const rows = stage.prepare(`SELECT * FROM ${table}`).all();
        for (const row of rows) {
          // Revisions must enter as drafts before the matching reviews exist.
          const status = table === 'lexicon_revisions' ? row.status : null;
          if (status) row.status = 'draft';
          db.prepare(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(() => '?').join(',')})`).run(...Object.values(row));
        }
      }
      for (const e of entries) db.prepare("UPDATE lexicon_revisions SET status='approved' WHERE id=?").run(e.revisionId);
      validateDatabase(db);
      return exportRelease(db,release.lexiconVersion);
    });
  } finally { stage.close(); }
}

export function validateWorkingReleases(db) {
  const rows = db.prepare('SELECT lexicon_version FROM lexicon_releases ORDER BY lexicon_version').all();
  for (const row of rows) exportRelease(db,row.lexicon_version);
  return { releases: rows.length };
}
