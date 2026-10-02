import { createHash } from 'node:crypto';
import { z } from 'zod';

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const nonempty = z.string().min(1).refine(v => v.trim().length > 0, 'Empty identifier or metadata');
const word = z.string().regex(/^[a-z]+$/);
const sound = z.enum(['vowel', 'consonant']);
const kinds = z.enum(['singular', 'plural', 'positive', 'base', 'third', 'past', 'participle', 'progressive', 'marker']);
const markers = z.enum(['determiner', 'subject-pronoun', 'object-pronoun', 'auxiliary', 'adverb', 'connector', 'marker']);
const set = schema => z.array(schema).min(1).refine(a => new Set(a).size === a.length, 'Duplicate set member');
const noun = z.object({ person: z.boolean(), initialSound: sound }).strict();
const adjective = z.object({ initialSound: sound, uses: set(z.enum(['attribute', 'subject-complement', 'object-complement'])) }).strict();
const verb = z.object({}).strict();
const functional = z.object({ markerKind: markers, uses: set(z.enum(['direct-object', 'recipient', 'finite-be', 'be-bridge', 'perfect-auxiliary', 'do-auxiliary', 'modal-can', 'time', 'coordination', 'subordination', 'article', 'possessive', 'demonstrative', 'subject', 'passive-agent', 'passive-recipient', 'go-destination', 'exclamation', 'negation'])) }).strict();
const frame = z.object({
  id: nonempty, pattern: z.enum(['SV', 'SVO', 'SVC', 'SVOO', 'SVOC']), recipient: z.literal('person').nullable(),
  complement: z.enum(['single-adjective', 'noun-or-single-adjective']).nullable(),
  allowProgressive: z.boolean(), allowPerfect: z.boolean(), passivePromotion: z.enum(['direct-object', 'direct-object-or-recipient']).nullable(),
  allowedPurposes: set(z.enum(['declarative', 'interrogative', 'imperative', 'exclamatory'])),
  allowedPolarities: set(z.enum(['positive', 'negative'])), fixedTail: z.literal('to school').nullable(),
}).strict();
const entrySchema = z.object({
  id: nonempty, revisionId: nonempty, lemma: word, partOfSpeech: z.enum(['noun', 'adjective', 'verb', 'function-word']), sense: nonempty,
  attributes: z.unknown(), forms: z.array(z.object({ kind: kinds, surface: word, initialSound: sound.nullable() }).strict()).min(1),
  frames: z.array(frame), sourceIds: set(nonempty),
}).strict();
export const sourceSchema = z.object({ id: nonempty, version: nonempty, title: nonempty, license: nonempty, attribution: nonempty }).strict();
export const importSchema = z.object({ sources: z.array(sourceSchema), entries: z.array(entrySchema) }).strict();
const sameKinds = (forms, expected) => {
  const actual = forms.map(f => f.kind).sort();
  if (canonical(actual) !== canonical([...expected].sort())) throw new Error(`Required form kinds: ${expected.join(', ')}`);
};
export function normalizeEntry(raw) {
  const entry = entrySchema.parse(raw);
  const { partOfSpeech: pos, forms, frames } = entry;
  entry.attributes = ({ noun, adjective, verb, 'function-word': functional })[pos].parse(entry.attributes);
  if (pos === 'function-word') {
    const allowed = {
      determiner: ['article', 'possessive', 'demonstrative'],
      'subject-pronoun': ['subject'], 'object-pronoun': ['direct-object', 'recipient'],
      auxiliary: ['finite-be', 'be-bridge', 'perfect-auxiliary', 'do-auxiliary', 'modal-can'],
      adverb: ['time'], connector: ['coordination', 'subordination'],
      marker: ['passive-agent', 'passive-recipient', 'go-destination', 'exclamation', 'negation'],
    }[entry.attributes.markerKind];
    if (entry.attributes.uses.some(use => !allowed.includes(use))) throw new Error('Unsupported marker use');
  }
  sameKinds(forms, pos === 'noun' ? ['singular', 'plural'] : pos === 'adjective' ? ['positive'] : pos === 'verb' ? ['base', 'third', 'past', 'participle', 'progressive'] : ['marker']);
  const base = forms.find(f => ['singular', 'positive', 'base', 'marker'].includes(f.kind));
  if (base.surface !== entry.lemma) throw new Error('Lemma must match canonical form');
  for (const form of forms) {
    if (form.initialSound !== (entry.attributes.initialSound ?? null)) throw new Error('Form initial sound differs from audited attributes');
  }
  if (new Set(frames.map(f => f.id)).size !== frames.length) throw new Error('Duplicate frame ID');
  const copula = pos === 'function-word' && entry.attributes.markerKind === 'auxiliary' && entry.attributes.uses.includes('finite-be');
  if (pos === 'verb' ? !frames.length : copula ? frames.length !== 1 : frames.length !== 0) throw new Error('Unexpected or missing frames');
  for (const f of frames) {
    if ((f.pattern === 'SVOO') !== (f.recipient === 'person') ||
        f.complement !== (f.pattern === 'SVOC' ? 'single-adjective' : f.pattern === 'SVC' ? 'noun-or-single-adjective' : null) ||
        (f.passivePromotion !== null && f.passivePromotion !== (f.pattern === 'SVOO' ? 'direct-object-or-recipient' : f.pattern === 'SVO' ? 'direct-object' : null)) ||
        (f.fixedTail !== null && (entry.lemma !== 'go' || f.pattern !== 'SV')) ||
        (copula ? f.pattern !== 'SVC' || f.allowProgressive || f.passivePromotion !== null : f.pattern === 'SVC') ||
        (entry.sense === 'possession' && entry.lemma === 'have' && (f.pattern !== 'SVO' || f.allowProgressive || f.allowPerfect || f.passivePromotion !== null))) throw new Error('Unsupported frame combination');
    f.allowedPurposes.sort(); f.allowedPolarities.sort();
  }
  if (entry.attributes.uses) entry.attributes.uses.sort();
  forms.sort((a, b) => a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0);
  frames.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  entry.sourceIds.sort();
  return entry;
}
export function revisionHash(entry, sources) {
  const normalized = normalizeEntry(entry);
  return hash({ ...normalized, sources: normalized.sourceIds.map(id => {
    const source = sources.find(s => s.id === id);
    if (!source) throw new Error(`Missing source ${id}`);
    return sourceSchema.parse(source);
  }) });
}
