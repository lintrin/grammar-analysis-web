import type { Token } from "./tokens.ts";
import { nouns, adjectives, adjectiveInitialSounds, directObjectPronouns, determiners, subjectPronouns, objectPronouns } from "./vocabulary.ts";

export type Phrase = { start: number; end: number; thirdPerson: boolean; attributes: number[] };
export function nounPhrase(tokens: Token[], start: number, end: number, recipient = false): Phrase | null {
  const words = tokens.slice(start, end).map(t => t.normalized);
  if (!words.length) return null;
  const pronouns = recipient ? objectPronouns : subjectPronouns;
  if (words.length === 1 && pronouns.has(words[0])) {
    return { start, end, thirdPerson: ["he", "she", "it"].includes(words[0]), attributes: [] };
  }
  const noun = nouns[words.at(-1)!];
  if (!noun || (recipient && !noun.person)) return null;
  const hasDeterminer = determiners.has(words[0]);
  if (!noun.plural && !hasDeterminer) return null;
  const determiner = hasDeterminer ? words[0] : null;
  if (noun.plural && determiner && ["a", "an", "this", "that"].includes(determiner)) return null;
  if (!noun.plural && determiner && ["these", "those"].includes(determiner)) return null;
  if (determiner === "a" || determiner === "an") {
    const initialSound = adjectiveInitialSounds[words[1]] ?? nouns[words[1]]?.initialSound;
    if (!initialSound || determiner !== (initialSound === "vowel" ? "an" : "a")) return null;
  }
  const modifierStart = start + (hasDeterminer ? 1 : 0);
  const attributes = [];
  for (let i = modifierStart; i < end - 1; i++) {
    if (!adjectives.has(tokens[i].normalized)) return null;
    attributes.push(i);
  }
  return { start, end, thirdPerson: !noun.plural, attributes };
}
export function directObject(tokens: Token[], start: number, end: number): Phrase | null {
  // Same noun phrase grammar; object pronouns are deferred to avoid lexical ambiguity.
  if (end <= start || !nouns[tokens[end - 1].normalized]) return null;
  return nounPhrase(tokens, start, end);
}

/** SVO/SVOC objects are independent of SVOO's person-only recipient grammar. */
export function objectPhrase(tokens: Token[], start: number, end: number): Phrase | null {
  if (end === start + 1 && directObjectPronouns.has(tokens[start].normalized)) {
    return { start, end, thirdPerson: false, attributes: [] };
  }
  return directObject(tokens, start, end);
}
