import type { Aspect, Pattern, Tense, Voice } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { beForms, lexicalVerbs, selectedVerb } from "./vocabulary.ts";

export type LexicalVerb = typeof lexicalVerbs[number];

// Current diagnostic scope: these frames retain a participle-as-progressive
// form hint. This does not authorize their passive voice or automatic edits.
const progressiveParticipleHints = new Set(["go", "sleep", "smile", "run", "make", "find"]);

/** Finite agreement is shared by simple predicates and auxiliary chains. */
export function finiteAgreement(word: string, thirdPerson: boolean, isI: boolean): { tense: Exclude<Tense, null>; expected: string } | null {
  if (beForms.includes(word)) {
    const past = word === "was" || word === "were";
    return { tense: past ? "past" : "present", expected: past ? (thirdPerson || isI ? "was" : "were") : isI ? "am" : thirdPerson ? "is" : "are" };
  }
  if (["have", "has", "had"].includes(word)) return { tense: word === "had" ? "past" : "present", expected: word === "had" ? "had" : thirdPerson ? "has" : "have" };
  return null;
}

/** Audited forms may overlap (run, sent); retain the lemma rather than guessing by suffix. */
export function lexicalForm(word: string | Token): LexicalVerb | undefined {
  return selectedVerb(typeof word === "string" ? { normalized: word } : word, lexicalVerbs, ["base","third","past","participle","progressive"]);
}

export type Predicate = {
  lexical: LexicalVerb | null; pattern: Pattern; tense: Exclude<Tense, null>;
  aspect: Exclude<Aspect, null>; voice: Exclude<Voice, null>;
  tokens: Token[]; end: number; mismatches: Token[];
  diagnosticOnly?: boolean;
};

/** Parse a finite auxiliary chain first; phrase roles are decided by its audited frame. */
export function parsePredicate(tokens: Token[], thirdPerson: boolean, isI: boolean): Predicate[] {
  const finite = tokens[0];
  if (!finite) return [];
  const agreement = finiteAgreement(finite.normalized, thirdPerson, isI);
  if (!agreement) return [];
  const start = tokens[1]?.normalized === "not" ? 2 : 1;
  const matches: Predicate[] = [];
  const add = (index: number, aspect: Predicate["aspect"], voice: Predicate["voice"], form: "progressive" | "participle", bridges: string[] = []) => {
    const lexical = lexicalForm(tokens[index] ?? "");
    const participleHint = lexical && voice === "active" && aspect === "progressive" && lexical.passivePromotion === null && tokens[index].normalized === lexical.participle && lexical.participle !== lexical.base && lexical.participle !== lexical.third;
    if (participleHint && !progressiveParticipleHints.has(lexical.base)) return;
    if (!lexical || (voice === "passive" && lexical.passivePromotion === null) || (aspect.includes("progressive") && !lexical.allowProgressive) || (aspect.includes("perfect") && !lexical.allowPerfect)) return;
    const mismatches = finite.normalized === agreement.expected ? [] : [finite];
    if (tokens[index].normalized !== lexical[form]) mismatches.push(tokens[index]);
    for (const [offset, expected] of bridges.entries()) if (tokens[start + offset].normalized !== expected) mismatches.push(tokens[start + offset]);
    matches.push({ lexical, pattern: lexical.pattern, tense: agreement.tense, aspect, voice, tokens: tokens.slice(0, index + 1), end: index + 1, mismatches, diagnosticOnly: !!participleHint });
  };
  if (beForms.includes(finite.normalized)) {
    add(start, "progressive", "active", "progressive");
    add(start, "simple", "passive", "participle");
    if (["be", "been", "being", ...beForms].includes(tokens[start]?.normalized)) add(start + 1, "progressive", "passive", "participle", ["being"]);
  }
  if (["have", "has", "had"].includes(finite.normalized)) {
    add(start, "perfect", "active", "participle");
    if (["be", "been", "being", ...beForms].includes(tokens[start]?.normalized)) {
      add(start + 1, "perfect-progressive", "active", "progressive", ["been"]);
      add(start + 1, "perfect", "passive", "participle", ["been"]);
      const mismatches = finite.normalized === agreement.expected ? [] : [finite];
      if (tokens[start].normalized !== "been") mismatches.push(tokens[start]);
      matches.push({ lexical: null, pattern: "SVC", tense: agreement.tense, aspect: "perfect", voice: "active", tokens: tokens.slice(0, start + 1), end: start + 1, mismatches });
    }
  }
  return matches;
}

/** Finite context resolves homographs; bare agreeing base/past forms retain both tenses. */
export function lexicalTenses(token: Token, verb: LexicalVerb, thirdPerson: boolean, time?: string): ("present" | "past")[] {
  if (token.finiteTense) return [token.finiteTense];
  if (token.normalized !== verb.past) return ["present"];
  return token.normalized === (thirdPerson ? verb.third : verb.base) && time !== "yesterday" ? ["present", "past"] : ["past"];
}
