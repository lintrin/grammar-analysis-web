import { readFileSync } from 'node:fs';
import { canonical } from './data.mjs';
import { trustedRelease, atomicWrite } from './release.mjs';
export function clientSnapshot(release) {
  const entries = release.entries.map(({ contentHash, reviewId, ...entry }) => { void contentHash; void reviewId; return entry; });
  const index = Object.create(null);
  for (const entry of entries) for (const form of entry.forms) for (const frame of entry.frames.length ? entry.frames : [null]) {
    (index[form.surface] ??= []).push({ entryId: entry.id, revisionId: entry.revisionId, formKind: form.kind, frameId: frame?.id ?? null });
  }
  return { formatVersion: release.formatVersion, lexiconVersion: release.lexiconVersion, lexiconHash: release.lexiconHash, sources: release.sources, entries, index };
}
export function verify(root = new URL('../../',import.meta.url)) {
  const { release, manifest } = trustedRelease(root);
  if (canonical(manifest) !== canonical({ ruleVersion: manifest.ruleVersion, lexiconVersion: release.lexiconVersion, lexiconHash: release.lexiconHash, lexiconFormatVersion: 1 })) throw new Error('Invalid analysis manifest');
  const code = readFileSync(new URL('lib/grammar/protocol.ts',root),'utf8');
  if (code.match(/RULE_VERSION = "([^"]+)"/)?.[1] !== manifest.ruleVersion) throw new Error('Rule version mismatch');
  const expected = canonical(clientSnapshot(release))+'\n';
  if (readFileSync(new URL('lib/grammar/generated/lexicon.json',root),'utf8') !== expected) throw new Error('Client snapshot mismatch');
  return { entries: release.entries.length, lexiconVersion: release.lexiconVersion, lexiconHash: release.lexiconHash };
}
export function generateClient() {
  const { release } = trustedRelease();
  atomicWrite(new URL('../../lib/grammar/generated/lexicon.json',import.meta.url).pathname,clientSnapshot(release));
  return verify();
}
