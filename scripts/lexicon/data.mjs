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
const policyId = z.enum(['basic-object-location','legacy-sv-location','legacy-sv-under-location']);
const location = z.object({policyId, attachment:z.enum(['complement','adverbial']),presence:z.enum(['required','optional'])}).strict();
// Legacy SV policies permit complete audited noun phrases; they have no head restriction.
const legacyHeads = z.null({invalid_type_error:'Legacy location policies require null heads'});
const headPolicies = z.object({
  'basic-object-location': set(nonempty).optional(),
  'legacy-sv-location': legacyHeads.optional(),
  'legacy-sv-under-location': legacyHeads.optional(),
}).strict().refine(p=>Object.keys(p).length>0,'Empty location policies');
const functional = z.object({ markerKind: markers, uses: set(z.enum(['direct-object', 'recipient', 'finite-be', 'be-bridge', 'perfect-auxiliary', 'do-auxiliary', 'modal-can', 'modal-will', 'time', 'coordination', 'subordination', 'article', 'possessive', 'demonstrative', 'subject', 'passive-agent', 'passive-recipient', 'go-destination', 'exclamation', 'negation', 'location-preposition', 'wh-subject', 'wh-object', 'wh-adverbial', 'wh-complement'])), locationHeadPolicies: headPolicies.optional() }).strict();
const frame = z.object({
  id: nonempty, pattern: z.enum(['SV', 'SVO', 'SVC', 'SVOO', 'SVOC']), recipient: z.literal('person').nullable(),
  complement: z.enum(['single-adjective', 'noun-or-single-adjective','location-phrase']).nullable(),
  allowProgressive: z.boolean(), allowPerfect: z.boolean(), passivePromotion: z.enum(['direct-object', 'direct-object-or-recipient']).nullable(),
  allowedPurposes: set(z.enum(['declarative', 'interrogative', 'imperative', 'exclamatory'])),
  allowedPolarities: set(z.enum(['positive', 'negative'])), fixedTail: z.literal('to school').nullable(), location: location.nullable(),
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
      auxiliary: ['finite-be', 'be-bridge', 'perfect-auxiliary', 'do-auxiliary', 'modal-can', 'modal-will'],
      adverb: ['time'], connector: ['coordination', 'subordination'],
      marker: ['passive-agent', 'passive-recipient', 'go-destination', 'exclamation', 'negation', 'location-preposition', 'wh-subject', 'wh-object', 'wh-adverbial', 'wh-complement'],
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
  const locationPreposition=pos==='function-word'&&entry.attributes.uses.includes('location-preposition');
  if(locationPreposition !== Object.hasOwn(entry.attributes,'locationHeadPolicies'))throw new Error('Location head policies require a location preposition');
  const copula = pos === 'function-word' && entry.attributes.markerKind === 'auxiliary' && entry.attributes.uses.includes('finite-be');
  if (pos === 'verb' ? !frames.length : copula ? ![1,2].includes(frames.length) : frames.length !== 0) throw new Error('Unexpected or missing frames');
  for (const f of frames) {
    const locationComplement=f.complement==='location-phrase';
    const expectedLegacyPolicy={sleep:'legacy-sv-under-location',wait:'legacy-sv-under-location',work:'legacy-sv-location',walk:'legacy-sv-location',run:'legacy-sv-location',dance:'legacy-sv-location'}[entry.lemma];
    if ((f.pattern === 'SVOO') !== (f.recipient === 'person') ||
        f.complement !== (f.pattern === 'SVOC' ? 'single-adjective' : f.pattern === 'SVC' ? locationComplement?'location-phrase':'noun-or-single-adjective' : null) ||
        (f.passivePromotion !== null && f.passivePromotion !== (f.pattern === 'SVOO' ? 'direct-object-or-recipient' : f.pattern === 'SVO' ? 'direct-object' : null)) ||
        (f.fixedTail === 'to school' && (entry.lemma !== 'go' || f.pattern !== 'SV')) ||
        (f.location !== null && (f.fixedTail!==null || (f.location.attachment==='complement' ? !copula || f.location.presence!=='required' || f.location.policyId!=='basic-object-location' || !locationComplement || f.id!=='location' || f.allowPerfect || f.allowedPurposes.some(p=>!['declarative','interrogative'].includes(p)) : f.pattern!=='SV' || f.location.presence!=='optional' || f.location.policyId!==expectedLegacyPolicy))) ||
        (locationComplement && f.location?.attachment!=='complement') ||
        (copula ? f.pattern !== 'SVC' || f.allowProgressive || f.passivePromotion !== null : f.pattern === 'SVC') ||
        (entry.sense === 'possession' && entry.lemma === 'have' && (f.pattern !== 'SVO' || f.allowProgressive || f.allowPerfect || f.passivePromotion !== null || f.allowedPurposes.some(p => !['declarative','interrogative'].includes(p))))) throw new Error('Unsupported frame combination');
    f.allowedPurposes.sort(); f.allowedPolarities.sort();
  }
  if(copula && (!frames.some(f=>f.id==='primary'&&f.complement==='noun-or-single-adjective'&&f.location===null) || frames.some(f=>!['primary','location'].includes(f.id))))throw new Error('Unexpected finite-be frames');
  if(entry.attributes.uses?.includes('wh-complement') && entry.lemma!=='where')throw new Error('Unsupported wh-complement marker');
  if(entry.attributes.locationHeadPolicies) for(const heads of Object.values(entry.attributes.locationHeadPolicies))heads?.sort();
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

/** Validate policy references against the complete selected entry set, never a second whitelist. */
export function validateEntrySet(entries) {
  const byId=new Map(entries.map(e=>[e.id,e]));
  const hasBasic=entries.some(e=>Object.hasOwn(e.attributes.locationHeadPolicies??{},'basic-object-location'));
  for(const e of entries){
    if(hasBasic && e.attributes.uses?.includes('finite-be') && !e.frames.some(f=>f.id==='location'))throw new Error('Selected finite-be requires primary and location frames');
    const policies=e.attributes.locationHeadPolicies===undefined?{}:headPolicies.parse(e.attributes.locationHeadPolicies);
    for(const heads of Object.values(policies)){
      for(const head of heads??[])if(byId.get(head)?.partOfSpeech!=='noun')throw new Error('Location head must reference a selected noun entry');
    }
    for(const f of e.frames)if(f.location && !entries.some(p=>Object.hasOwn(p.attributes.locationHeadPolicies??{},f.location.policyId)))throw new Error('Frame location policy has no selected preposition');
  }
}
