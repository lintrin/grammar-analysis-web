import type { Token } from "./tokens.ts";
import { nounCandidate, adjectiveSupports, initialSound, directObjectPronouns, determiners, subjectPronouns, objectPronouns } from "./vocabulary.ts";

export type Phrase = { start: number; end: number; thirdPerson: boolean; attributes: number[] };
export function nounPhrase(tokens: Token[], start: number, end: number, recipient = false): Phrase | null {
  if(end===start+1&&tokens[start]?.whSubject)return {start,end,thirdPerson:true,attributes:[]};
  const words = tokens.slice(start, end).map(t => t.normalized);
  if (!words.length) return null;
  const pronouns = recipient ? objectPronouns : subjectPronouns;
  if (words.length === 1 && pronouns.has(words[0])) {
    return { start, end, thirdPerson: ["he", "she", "it"].includes(words[0]), attributes: [] };
  }
  const noun = nounCandidate(tokens[end - 1]);
  if (!noun || (recipient && !noun.person)) return null;
  const hasDeterminer = determiners.has(words[0]);
  if (!noun.plural && !hasDeterminer) return null;
  const determiner = hasDeterminer ? words[0] : null;
  if (noun.plural && determiner && ["a", "an", "this", "that"].includes(determiner)) return null;
  if (!noun.plural && determiner && ["these", "those"].includes(determiner)) return null;
  if (determiner === "a" || determiner === "an") {
    const sound = initialSound(tokens[start + 1]);
    if (!sound || determiner !== (sound === "vowel" ? "an" : "a")) return null;
  }
  const modifierStart = start + (hasDeterminer ? 1 : 0);
  const attributes = [];
  for (let i = modifierStart; i < end - 1; i++) {
    if (!adjectiveSupports(tokens[i],"attribute")) return null;
    attributes.push(i);
  }
  return { start, end, thirdPerson: !noun.plural, attributes };
}
export function directObject(tokens: Token[], start: number, end: number): Phrase | null {
  // Same noun phrase grammar; object pronouns are deferred to avoid lexical ambiguity.
  if(end===start+1&&tokens[start]?.whObject)return {start,end,thirdPerson:false,attributes:[]};
  if (end <= start || !nounCandidate(tokens[end - 1])) return null;
  return nounPhrase(tokens, start, end);
}

/** SVO/SVOC objects are independent of SVOO's person-only recipient grammar. */
export function objectPhrase(tokens: Token[], start: number, end: number): Phrase | null {
  if(end===start+1&&tokens[start]?.whObject)return {start,end,thirdPerson:false,attributes:[]};
  if (end === start + 1 && directObjectPronouns.has(tokens[start].normalized)) {
    return { start, end, thirdPerson: false, attributes: [] };
  }
  return directObject(tokens, start, end);
}
