// Generated, audited release only. No database, downloads or second handwritten lexicon.
import snapshot from "./generated/lexicon.json" with { type: "json" };
import type { Pattern, Purpose } from "./protocol.ts";
export const LEXICON_VERSION = snapshot.lexiconVersion;
export const LEXICON_HASH = snapshot.lexiconHash;
export type VerbFrame = {
  entryId: string; frameId: string; sense: string; base: string; third: string; past: string; participle: string; progressive: string;
  pattern: Exclude<Pattern, "SVC">; allowProgressive: boolean; allowPerfect: boolean;
  passivePromotion: string | null; fixedTail: string | null; allowedPurposes: Purpose[]; allowedPolarities: string[];
};
const entries = snapshot.entries;
export const nouns: Record<string, { plural: boolean; person: boolean; initialSound: "vowel" | "consonant" }> = {};
export const adjectives = new Set<string>();
export const adjectiveInitialSounds: Record<string, "vowel" | "consonant"> = {};
for (const entry of entries) {
  if (entry.partOfSpeech === "noun") for (const f of entry.forms) nouns[f.surface] = { plural: f.kind === "plural", person: entry.attributes.person!, initialSound: f.initialSound as "vowel" | "consonant" };
  if (entry.partOfSpeech === "adjective") { adjectives.add(entry.lemma); adjectiveInitialSounds[entry.lemma] = entry.attributes.initialSound as "vowel" | "consonant"; }
}
const markers = (kind: string, use?: string) => new Set(entries.filter(e => e.attributes.markerKind === kind && (!use || e.attributes.uses?.includes(use))).flatMap(e => e.forms.map(f => f.surface)));
export const directObjectPronouns = markers("object-pronoun", "direct-object");
export const objectPronouns = markers("object-pronoun", "recipient");
export const subjectPronouns = markers("subject-pronoun");
export const determiners = markers("determiner");
export const beForms = [...markers("auxiliary", "finite-be")];
export const lexicalVerbs: VerbFrame[] = entries.filter(e => e.partOfSpeech === "verb").flatMap(e => e.frames.map(f => ({
  entryId: e.id, frameId: f.id, sense: e.sense,
  ...Object.fromEntries(e.forms.map(form => [form.kind, form.surface])) as Pick<VerbFrame, "base" | "third" | "past" | "participle" | "progressive">,
  pattern: f.pattern as VerbFrame["pattern"], allowProgressive: f.allowProgressive, allowPerfect: f.allowPerfect,
  passivePromotion: f.passivePromotion, fixedTail: f.fixedTail, allowedPurposes: f.allowedPurposes as Purpose[], allowedPolarities: f.allowedPolarities,
})));
export const verbForms = lexicalVerbs.filter(v => v.pattern === "SVOO");
export const simpleVerbs = lexicalVerbs.filter(v => v.pattern !== "SVOO");
export const isPossession = (v: VerbFrame | undefined) => v?.base === "have" && v.sense === "possession";
export const VOCABULARY = {
  nouns: Object.keys(nouns), adjectives: [...adjectives], determiners: [...determiners],
  pronouns: [...new Set([...subjectPronouns, ...objectPronouns])],
  verbs: [...new Set(lexicalVerbs.flatMap(v => [v.base,v.third,v.past,v.participle,v.progressive]).concat(beForms))],
  adverbs: [...markers("adverb")], markers: entries.filter(e => e.partOfSpeech === "function-word" && !["determiner","subject-pronoun","object-pronoun","adverb"].includes(e.attributes.markerKind!)).map(e => e.lemma),
};
export const knownWords = new Set(entries.flatMap(e => e.forms.map(f => f.surface)));
export type SurfaceCandidate = { entryId: string; revisionId: string; formKind: string; frameId: string | null };
export const surfaceIndex: Readonly<Record<string, readonly SurfaceCandidate[]>> = snapshot.index;
const candidateKey = (entryId: string, frameId: string | null) => JSON.stringify([entryId,frameId]);
export function surfaceCandidates(word: string, consume: () => boolean): readonly SurfaceCandidate[] | null {
  const candidates = Object.hasOwn(surfaceIndex,word.toLowerCase()) ? surfaceIndex[word.toLowerCase()] : [];
  for (const candidate of candidates) { void candidate; if (!consume()) return null; }
  return candidates;
}
/** A frame is returned once even when past and participle share a surface. */
export function verbCandidates(word: string, consume: () => boolean, kinds = ["base","third","past","participle","progressive"]): VerbFrame[] | null {
  const candidates = surfaceCandidates(word,consume);
  if (candidates === null) return null;
  const ids = new Set(candidates.filter(c => kinds.includes(c.formKind)).map(c => candidateKey(c.entryId,c.frameId)));
  return lexicalVerbs.filter(v => ids.has(candidateKey(v.entryId,v.frameId)));
}

export function selectedVerb(token: { normalized: string; lexiconChoice?: string }, forms = lexicalVerbs, kinds = ["base","third","past"]): VerbFrame | undefined {
  return forms.find(v => (!token.lexiconChoice || token.lexiconChoice === candidateKey(v.entryId,v.frameId)) && kinds.some(k => v[k as "base" | "third" | "past"] === token.normalized));
}
export function nounCandidate(token: { normalized: string; lexiconChoice?: string }) {
  if (!token.lexiconChoice) return Object.hasOwn(nouns,token.normalized) ? nouns[token.normalized] : undefined;
  const entry = entries.find(e => candidateKey(e.id,null) === token.lexiconChoice && e.partOfSpeech === "noun");
  const form = entry?.forms.find(f => f.surface === token.normalized);
  return entry && form ? { plural: form.kind === "plural", person: entry.attributes.person!, initialSound: form.initialSound as "vowel" | "consonant" } : undefined;
}
/** Distinct noun senses and verb frames are enumerated by the purpose parser. */
export function interpretationChoices(word: string): string[] {
  const candidates = Object.hasOwn(surfaceIndex,word) ? surfaceIndex[word] : [];
  return [...new Set(candidates.filter(c => ["singular","plural","positive","base","third","past","participle","progressive"].includes(c.formKind)).map(c => candidateKey(c.entryId,c.frameId)))];
}

export function framePermits(v: VerbFrame, purpose: Purpose, negative: boolean) {
  return v.allowedPurposes.includes(purpose) && v.allowedPolarities.includes(negative ? "negative" : "positive");
}

export function adjectiveSupports(token: { normalized: string; lexiconChoice?: string }, use: string): boolean {
  if (!adjectives.has(token.normalized)) return false;
  const entry = entries.find(e => e.partOfSpeech === "adjective" && e.lemma === token.normalized && (!token.lexiconChoice || token.lexiconChoice === candidateKey(e.id,null)));
  return entry ? !!entry.attributes.uses?.includes(use) : !token.lexiconChoice;
}
export function initialSound(token: { normalized: string; lexiconChoice?: string }) {
  const entry = entries.find(e => e.partOfSpeech === "adjective" && e.lemma === token.normalized && (!token.lexiconChoice || token.lexiconChoice === candidateKey(e.id,null)));
  return entry?.attributes.initialSound ?? nounCandidate(token)?.initialSound;
}
