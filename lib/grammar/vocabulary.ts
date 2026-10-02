// Deliberately small, audited vocabulary. No runtime downloads or inference service.
export const nouns: Record<string, { plural: boolean; person: boolean; initialSound: "consonant" }> = {};
for (const [singular, plural, person] of [
  ["teacher", "teachers", true], ["student", "students", true], ["girl", "girls", true],
  ["boy", "boys", true], ["friend", "friends", true], ["mother", "mothers", true],
  ["father", "fathers", true], ["child", "children", true],
  ["book", "books", false], ["gift", "gifts", false], ["letter", "letters", false],
  ["picture", "pictures", false], ["pen", "pens", false], ["toy", "toys", false],
] as const) {
  nouns[singular] = { plural: false, person, initialSound: "consonant" }; nouns[plural] = { plural: true, person, initialSound: "consonant" };
}
export const adjectives = new Set(["useful", "new", "old", "good", "small", "big", "beautiful", "young", "kind"]);
// Audited pronunciation, including /j/ in useful and young; never infer from letters.
export const adjectiveInitialSounds: Record<string, "vowel" | "consonant"> = {
  useful: "consonant", new: "consonant", old: "vowel", good: "consonant", small: "consonant",
  big: "consonant", beautiful: "consonant", young: "consonant", kind: "consonant",
};
export const directObjectPronouns = new Set(["me", "you", "him", "her", "it", "us", "them"]);
export const determiners = new Set(["a", "an", "the", "my", "your", "his", "her", "our", "their", "this", "that", "these", "those"]);
export const subjectPronouns = new Set(["i", "you", "he", "she", "it", "we", "they"]);
export const objectPronouns = new Set(["me", "you", "him", "her", "us", "them"]);
export const verbForms = [
  { base: "give", third: "gives", past: "gave" },
  { base: "send", third: "sends", past: "sent" },
  { base: "show", third: "shows", past: "showed" },
  { base: "lend", third: "lends", past: "lent" },
  { base: "offer", third: "offers", past: "offered" },
];
export const simpleVerbs = [
  { base: "go", third: "goes", past: "went", pattern: "SV" },
  { base: "sleep", third: "sleeps", past: "slept", pattern: "SV" },
  { base: "smile", third: "smiles", past: "smiled", pattern: "SV" },
  { base: "run", third: "runs", past: "ran", pattern: "SV" },
  { base: "like", third: "likes", past: "liked", pattern: "SVO" },
  { base: "enjoy", third: "enjoys", past: "enjoyed", pattern: "SVO" },
  { base: "see", third: "sees", past: "saw", pattern: "SVO" },
  { base: "make", third: "makes", past: "made", pattern: "SVOC" },
  { base: "find", third: "finds", past: "found", pattern: "SVOC" },
] as const;
export const beForms = ["am", "is", "are", "was", "were"];
export const VOCABULARY = {
  nouns: Object.keys(nouns), adjectives: [...adjectives], determiners: [...determiners],
  pronouns: [...new Set([...subjectPronouns, ...objectPronouns])],
  verbs: [...verbForms, ...simpleVerbs].flatMap(v => [v.base, v.third, v.past]).concat(beForms), adverbs: ["today", "yesterday"], markers: ["do", "does", "did", "be", "what", "how", "can", "to", "school", "not", "and", "but", "because", "if"],
};
export const knownWords = new Set(Object.values(VOCABULARY).flat());
