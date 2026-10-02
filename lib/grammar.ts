/** Hand-authored local grammar rules and vocabulary; distributed under this repository's MIT license. */
export const RULE_VERSION = "0.4.0";
export const MAX_INPUT_LENGTH = 1000;
export type Range = { start: number; end: number };
export type Role = "subject" | "verb" | "indirectObject" | "object" | "complement" | "adverbial" | "attribute" | "clause";
export type ComponentNode = {
  id: string; role: Role; parentId: string | null; ranges: Range[];
  implicit: boolean; ruleId: string; explanation: string;
};
export type Correction = {
  id: string; ruleId: string; reason: string; context: string;
  edits: { range: Range; expected: string; replacement: string }[];
};
export type AnalysisResult = {
  input: string; inputVersion: number; ruleVersion: string;
  status: "complete" | "partial" | "unsupported" | "ambiguous" | "invalid";
  purpose: "declarative" | "interrogative" | "imperative" | "exclamatory" | null;
  pattern: "SV" | "SVO" | "SVC" | "SVOO" | "SVOC" | null;
  complexity: "simple" | "complex" | null;
  tense: "present" | "past" | null;
  nodes: ComponentNode[]; corrections: Correction[]; messages: string[];
};
export type Token = Range & { text: string; normalized: string };
export function tokenize(input: string): Token[] {
  return Array.from(input.matchAll(/[A-Za-z]+|[^\s]/gu), match => ({
    text: match[0], normalized: match[0].toLowerCase(),
    start: match.index!, end: match.index! + match[0].length,
  }));
}

// Deliberately small, audited vocabulary. No runtime downloads or inference service.
const nouns: Record<string, { plural: boolean; person: boolean }> = {};
for (const [singular, plural, person] of [
  ["teacher", "teachers", true], ["student", "students", true], ["girl", "girls", true],
  ["boy", "boys", true], ["friend", "friends", true], ["mother", "mothers", true],
  ["father", "fathers", true], ["child", "children", true],
  ["book", "books", false], ["gift", "gifts", false], ["letter", "letters", false],
  ["picture", "pictures", false], ["pen", "pens", false], ["toy", "toys", false],
] as const) {
  nouns[singular] = { plural: false, person }; nouns[plural] = { plural: true, person };
}
const adjectives = new Set(["useful", "new", "old", "good", "small", "big", "beautiful", "young", "kind"]);
const determiners = new Set(["a", "an", "the", "my", "your", "his", "her", "our", "their", "this", "that", "these", "those"]);
const subjectPronouns = new Set(["i", "you", "he", "she", "it", "we", "they"]);
const objectPronouns = new Set(["me", "you", "him", "her", "us", "them"]);
const verbForms = [
  { base: "give", third: "gives", past: "gave" },
  { base: "send", third: "sends", past: "sent" },
  { base: "show", third: "shows", past: "showed" },
  { base: "lend", third: "lends", past: "lent" },
  { base: "offer", third: "offers", past: "offered" },
];
const simpleVerbs = [
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
const beForms = ["am", "is", "are", "was", "were"];
export const VOCABULARY = {
  nouns: Object.keys(nouns), adjectives: [...adjectives], determiners: [...determiners],
  pronouns: [...new Set([...subjectPronouns, ...objectPronouns])],
  verbs: [...verbForms, ...simpleVerbs].flatMap(v => [v.base, v.third, v.past]).concat(beForms), adverbs: ["today", "yesterday"], markers: ["do", "does", "did", "be", "what", "how", "can", "to", "school"],
};
const knownWords = new Set(Object.values(VOCABULARY).flat());

type Phrase = { start: number; end: number; thirdPerson: boolean; attributes: number[] };
function nounPhrase(tokens: Token[], start: number, end: number, recipient = false): Phrase | null {
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
  // a/an needs pronunciation data to be reliable; this milestone accepts only audited combinations.
  if (determiner === "an" || (determiner === "a" && words[1] === "old")) return null;
  const modifierStart = start + (hasDeterminer ? 1 : 0);
  const attributes = [];
  for (let i = modifierStart; i < end - 1; i++) {
    if (!adjectives.has(tokens[i].normalized)) return null;
    attributes.push(i);
  }
  return { start, end, thirdPerson: !noun.plural, attributes };
}
function suggest(result: AnalysisResult, token: Token, replacement: string, ruleId: string, reason: string) {
  const original = token.text;
  const text = original === original.toUpperCase() ? replacement.toUpperCase()
    : /^[A-Z]/.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  result.corrections.push({ id: `correction-${result.corrections.length + 1}`, ruleId, reason,
    context: "仅适用于当前词典和完整匹配的简单句结构；不检查语义或复杂时态。",
    edits: [{ range: { start: token.start, end: token.end }, expected: original, replacement: text }] });
}

/** Apply one current suggestion atomically. Never trust stale positions or edited text. */
export function applyCorrection(result: AnalysisResult, id: string, input: string, inputVersion: number): string {
  validateAnalysisResult(result);
  if (result.inputVersion !== inputVersion || result.input !== input || result.ruleVersion !== RULE_VERSION) throw new Error("建议已过期，请重新分析。");
  const correction = result.corrections.find(c => c.id === id);
  if (!correction) throw new Error("修改建议不存在。");
  let next = input;
  for (const edit of [...correction.edits].sort((a, b) => b.range.start - a.range.start)) {
    next = next.slice(0, edit.range.start) + edit.replacement + next.slice(edit.range.end);
  }
  return next;
}

function directObject(tokens: Token[], start: number, end: number): Phrase | null {
  // Same noun phrase grammar; object pronouns are deferred to avoid lexical ambiguity.
  if (end <= start || !nouns[tokens[end - 1].normalized]) return null;
  return nounPhrase(tokens, start, end);
}

/** No network, storage, logging, or mutation. All positions refer to the original UTF-16 string. */
export function analyzeSentence(input: string, inputVersion = 0): AnalysisResult {
  const result: AnalysisResult = {
    input, inputVersion, ruleVersion: RULE_VERSION, status: "unsupported", purpose: null,
    pattern: null, complexity: null, tense: null, nodes: [], corrections: [],
    messages: ["当前仅分析词典及规则覆盖的五种句型与四种用途；纠错仅覆盖主谓一致、do/does/did 后原形及 can 后原形。"],
  };
  const finish = (message?: string) => {
    if (message) result.messages.unshift(message);
    validateAnalysisResult(result);
    return result;
  };
  if (!input.trim() || input.length > MAX_INPUT_LENGTH) {
    result.status = "invalid";
    return finish(!input.trim() ? "请输入一个英文句子。" : "输入超过 1000 个 UTF-16 字符，请缩短后重试。");
  }
  const tokens = tokenize(input);
  const terminals = tokens.filter(t => /[.!?]/.test(t.text));
  if (terminals.length > 1 || (terminals.length && terminals[0] !== tokens.at(-1))) {
    result.status = "invalid";
    return finish("每次只能分析一个句子，请检查句末标点。");
  }
  const punctuation = terminals[0]?.text ?? null;
  if (punctuation) tokens.pop();
  if (tokens.some(t => !/^[A-Za-z]+$/.test(t.text))) {
    return finish("本阶段支持英文单词和可选的句末句号、问号或感叹号；其他符号尚未支持。");
  }
  const unknown = [...new Set(tokens.filter(t => !knownWords.has(t.normalized)).map(t => t.text))];
  if (unknown.length) return finish(`词典尚未覆盖：${unknown.join("、")}。无法可靠分析此句。`);
  const purposeMessage = analyzePurpose(tokens, punctuation, result);
  return finish(purposeMessage);
}

function analyzeDeclarative(tokens: Token[], result: AnalysisResult): string {
  let end = tokens.length;
  let adverb: Token | null = ["today", "yesterday"].includes(tokens.at(-1)?.normalized ?? "") ? tokens[--end] : null;
  // Fixed destination frame only, not a general preposition grammar.
  if (!adverb && tokens.at(-2)?.normalized === "to" && tokens.at(-1)?.normalized === "school" && tokens.some(t => ["go", "goes", "went"].includes(t.normalized))) {
    end -= 2;
    adverb = { start: tokens[end].start, end: tokens[end + 1].end, text: result.input.slice(tokens[end].start, tokens[end + 1].end), normalized: "to school" };
  }
  const simple = analyzeSimplePatterns(tokens, end, adverb, result);
  if (simple) return (simple);
  type Candidate = { subject: Phrase; verbIndex: number; verb: typeof verbForms[number]; tense: "present" | "past"; recipient: Phrase; object: Phrase };
  const candidates: Candidate[] = [];
  // At most 1000 code units and a closed vocabulary: enumerate phrase boundaries within a fixed budget.
  let budget = 4000;
  for (let v = 1; v < end - 2; v++) {
    const form = verbForms.find(verb => [verb.base, verb.third, verb.past].includes(tokens[v].normalized));
    if (!form) continue;
    const subject = nounPhrase(tokens, 0, v);
    if (!subject) continue;
    for (let split = v + 2; split < end; split++) {
      if (--budget < 0) return ("输入结构过长，超出本地规则的计算预算。");
      const recipient = nounPhrase(tokens, v + 1, split, true);
      const object = directObject(tokens, split, end);
      if (recipient && object) candidates.push({ subject, verbIndex: v, verb: form,
        tense: tokens[v].normalized === form.past ? "past" : "present", recipient, object });
    }
  }
  if (!candidates.length) return ("未匹配词典及动词搭配限定的五种句型结构。");
  if (candidates.length > 1) { result.status = "ambiguous"; return ("存在多个可能的成分边界，无法唯一确定结构。"); }
  const c = candidates[0];
  if (c.tense === "present" && tokens[c.verbIndex].normalized !== (c.subject.thirdPerson ? c.verb.third : c.verb.base)) {
    result.status = "partial";
    if (adverb?.normalized !== "yesterday") suggest(result, tokens[c.verbIndex], c.subject.thirdPerson ? c.verb.third : c.verb.base, "AGREEMENT-001", "一般现在时的动词形式需要与主语的人称和单复数一致。");
    return ("名词短语与双宾语结构已匹配，但动词形式不在此规则的支持条件内；请查看语法检查中的限定纠错建议。");
  }
  if (c.tense === "present" && adverb?.normalized === "yesterday") {
    return ("yesterday 与当前一般现在时规则不匹配，无法可靠分析。时态纠错尚未支持。");
  }
  result.status = "complete"; result.purpose = "declarative"; result.pattern = "SVOO";
  result.complexity = "simple"; result.tense = c.tense;
  const add = (role: Role, start: number, stop: number, explanation: string, parentId: string | null = null) => {
    const id = `node-${result.nodes.length + 1}`;
    result.nodes.push({ id, role, parentId, implicit: false, ranges: [{ start: tokens[start].start, end: tokens[stop - 1].end }], ruleId: "SVOO-001", explanation });
    return id;
  };
  const addPhrase = (role: Role, phrase: Phrase, explanation: string) => {
    const id = add(role, phrase.start, phrase.end, explanation);
    for (const index of phrase.attributes) add("attribute", index, index + 1, `形容词 ${tokens[index].text} 修饰短语的中心名词 ${tokens[phrase.end - 1].text}。`, id);
  };
  addPhrase("subject", c.subject, "主语说明谁发出这个动作；本规则使用人称代词或简单名词短语识别主语。");
  add("verb", c.verbIndex, c.verbIndex + 1, `${tokens[c.verbIndex].text} 是 ${c.verb.base} 的${c.tense === "past" ? "过去式" : "一般现在时形式"}，表示句子的动作。`);
  addPhrase("indirectObject", c.recipient, "间接宾语表示动作的接受者，即“给谁”。本阶段限定为人物名词短语或宾格代词。");
  addPhrase("object", c.object, "直接宾语表示给予、展示或传递的事物，即“给什么”。");
  if (adverb) add("adverbial", end, end + 1, `${adverb.text} 说明动作发生的时间。`);
  return ("已匹配本地双宾语规则 SVOO-001。此结果不代表已经检查所有语法问题。");
}


/** Reorder token references, never input text: every explicit range stays in the original string. */
function analyzePurpose(tokens: Token[], punctuation: string | null, result: AnalysisResult): string {
  const first = tokens[0]?.normalized;
  const unsupported = "未匹配当前支持的句子用途结构，或句末标点与结构不匹配。";
  const tryParse = (ordered: Token[]) => {
    const candidate: AnalysisResult = { ...result, nodes: [], corrections: [], messages: [...result.messages] };
    const message = analyzeDeclarative(ordered, candidate);
    return { candidate, message };
  };
  const accept = (candidate: AnalysisResult, message: string, purpose: AnalysisResult["purpose"]) => {
    Object.assign(result, candidate);
    if (result.status === "complete") result.purpose = purpose;
    return message;
  };
  if (["do", "does", "did"].includes(first)) {
    if (punctuation && punctuation !== "?") return unsupported;
    for (let v = 2; v < tokens.length; v++) {
      const subject = nounPhrase(tokens, 1, v);
      const form = [...verbForms, ...simpleVerbs].find(f => [f.base, f.third, f.past].includes(tokens[v].normalized));
      if (!subject || !form) continue;
      const past = first === "did";
      const lexical = { ...tokens[v], normalized: past ? form.past : subject.thirdPerson ? form.third : form.base };
      const { candidate, message } = tryParse([...tokens.slice(1, v), lexical, ...tokens.slice(v + 1)]);
      if (candidate.status !== "complete") continue;
      if ((!past && first !== (subject.thirdPerson ? "does" : "do")) || tokens[v].normalized !== form.base) {
        result.status = "partial";
        if (!past && first !== (subject.thirdPerson ? "does" : "do")) suggest(result, tokens[0], subject.thirdPerson ? "does" : "do", "AGREEMENT-001", "一般现在时疑问句的 do/does 需要与主语一致。");
        if (tokens[v].normalized !== form.base) suggest(result, tokens[v], form.base, "DO-BASE-001", "do/does/did 已承担时态与人称变化，其后的实义动词应使用原形。");
        return "疑问句短语已匹配，但助动词与主语或其后动词形式不符合当前规则；请查看语法检查中的限定纠错建议。";
      }
      const verb = candidate.nodes.find(n => n.role === "verb")!;
      verb.ranges.unshift({ start: tokens[0].start, end: tokens[0].end });
      verb.ruleId = "QUESTION-DO-001";
      verb.explanation = `${tokens[0].text} 与原形 ${tokens[v].text} 共同构成疑问句的动词成分；中间的主语不属于动词区间。`;
      return accept(candidate, `已匹配一般疑问句规则 QUESTION-DO-001。${message}`, "interrogative");
    }
    return unsupported;
  }
  if (beForms.includes(first)) {
    if (punctuation && punctuation !== "?") return unsupported;
    const parsed = [];
    for (let split = 2; split < tokens.length; split++) {
      if (!nounPhrase(tokens, 1, split)) continue;
      const entry = tryParse([...tokens.slice(1, split), tokens[0], ...tokens.slice(split)]);
      if (["complete", "partial"].includes(entry.candidate.status)) parsed.push(entry);
    }
    if (parsed.length > 1) { result.status = "ambiguous"; return "存在多个可能的疑问句边界，无法唯一确定结构。"; }
    if (!parsed.length) return unsupported;
    const { candidate, message } = parsed[0];
    const verb = candidate.nodes.find(n => n.role === "verb");
    if (verb) { verb.ruleId = "QUESTION-BE-001"; verb.explanation = `${tokens[0].text} 是提前到主语之前的系动词，连接主语与表语，构成一般疑问句。`; }
    return accept(candidate, `已匹配 be 疑问句规则 QUESTION-BE-001。${message}`, "interrogative");
  }
  if (first === "how" || first === "what") {
    if (punctuation && punctuation !== "!") return unsupported;
    const last = tokens.at(-1)!;
    if (!beForms.includes(last.normalized)) return unsupported;
    const parsed = [];
    // Full subject + be is required; fragment exclamations are deliberately deferred.
    for (let split = 2; split < tokens.length - 1; split++) {
      if (first === "how" && (split !== 2 || !adjectives.has(tokens[1].normalized))) continue;
      if (first === "what") {
        // Exclamative What permits an indefinite article or a bare plural,
        // unlike an ordinary noun phrase with the/my/this/etc.
        const determiner = tokens[1].normalized;
        if (determiners.has(determiner) && !["a", "an"].includes(determiner)) continue;
        if (!directObject(tokens, 1, split)) continue;
      }
      if (!nounPhrase(tokens, split, tokens.length - 1)) continue;
      const entry = tryParse([...tokens.slice(split, -1), last, ...tokens.slice(1, split)]);
      if (["complete", "partial"].includes(entry.candidate.status)) parsed.push(entry);
    }
    if (parsed.length > 1) { result.status = "ambiguous"; return "存在多个可能的感叹句边界，无法唯一确定结构。"; }
    if (!parsed.length) return unsupported;
    const { candidate, message } = parsed[0];
    const complement = candidate.nodes.find(n => n.role === "complement");
    if (complement) {
      complement.ranges[0].start = tokens[0].start;
      complement.ruleId = "EXCLAMATION-001";
      complement.explanation = `${tokens[0].text} 引导提前的表语，强调主语的性质或身份；后面保留主语与系动词。`;
      candidate.nodes.push({ id: `node-${candidate.nodes.length + 1}`, role: "attribute", parentId: complement.id, implicit: false,
        ranges: [{ start: tokens[0].start, end: tokens[0].end }], ruleId: "EXCLAMATION-001", explanation: `${tokens[0].text} 是感叹结构中的强调成分，修饰此表语短语。` });
    }
    return accept(candidate, `已匹配完整感叹句规则 EXCLAMATION-001。${message}`, "exclamatory");
  }
  if (tokens.some(t => t.normalized === "can")) {
    if (punctuation && punctuation !== ".") return unsupported;
    const m = tokens.findIndex(t => t.normalized === "can");
    const subject = nounPhrase(tokens, 0, m);
    const lexical = tokens[m + 1];
    const form = [...verbForms, ...simpleVerbs].find(f => [f.base, f.third, f.past].includes(lexical?.normalized));
    if (!subject || !lexical || (!form && !["be", ...beForms].includes(lexical.normalized))) return unsupported;
    const normalized = form ? subject.thirdPerson ? form.third : form.base : m === 1 && first === "i" ? "am" : subject.thirdPerson ? "is" : "are";
    const { candidate, message } = tryParse([...tokens.slice(0, m), { ...lexical, normalized }, ...tokens.slice(m + 2)]);
    if (candidate.status !== "complete") return unsupported;
    if (lexical.normalized !== (form?.base ?? "be")) {
      result.status = "partial";
      suggest(result, lexical, form?.base ?? "be", "MODAL-BASE-001", "情态动词 can 后使用动词原形，不随主语变化。");
      return "已匹配 can 的简单句搭配，但其后动词需要使用原形。";
    }
    const verb = candidate.nodes.find(n => n.role === "verb")!;
    verb.ranges.unshift({ start: tokens[m].start, end: tokens[m].end });
    verb.ruleId = "MODAL-CAN-001";
    verb.explanation = "can 表示能力或可能性，其后接动词原形；不按一般现在时或过去时分类。";
    candidate.tense = null;
    return accept(candidate, `已匹配 can + 原形规则。${message}`, "declarative");
  }
  const imperativeForm = [...verbForms, ...simpleVerbs].some(f => f.base === first) || first === "be";
  if (imperativeForm) {
    if (punctuation && ![".", "!"].includes(punctuation)) return unsupported;
    const implicit: Token = { text: "you", normalized: "you", start: 0, end: 0 };
    const verb = first === "be" ? { ...tokens[0], normalized: "are" } : tokens[0];
    const { candidate, message } = tryParse([implicit, verb, ...tokens.slice(1)]);
    if (candidate.status !== "complete") return unsupported;
    const subject = candidate.nodes.find(n => n.role === "subject")!;
    subject.implicit = true; subject.ranges = []; subject.ruleId = "IMPERATIVE-001";
    subject.explanation = "祈使句省略了听话者 you 作为主语；这是隐含成分，没有对应的原文位置。";
    const predicate = candidate.nodes.find(n => n.role === "verb")!;
    predicate.ruleId = "IMPERATIVE-001";
    predicate.explanation = `${tokens[0].text} 使用动词原形表达要求或指令；祈使句在此不标为一般现在时。`;
    candidate.tense = null;
    return accept(candidate, `已匹配祈使句规则 IMPERATIVE-001。${message}`, "imperative");
  }
  if (punctuation && punctuation !== ".") return unsupported;
  return analyzeDeclarative(tokens, result);
}

/** Each verb has an explicit supported frame; no fallback from word class to role. */
function analyzeSimplePatterns(tokens: Token[], end: number, adverb: Token | null, result: AnalysisResult): string | null {
  type Match = { subject: Phrase; v: number; pattern: "SV" | "SVO" | "SVC" | "SVOC"; tense: "present" | "past"; expected: string; object?: Phrase; complement?: Phrase };
  const matches: Match[] = [];
  const objectPhrase = (start: number, stop: number) => nounPhrase(tokens, start, stop, true) ?? directObject(tokens, start, stop);
  const adjective = (start: number, stop: number): Phrase | null => stop === start + 1 && adjectives.has(tokens[start].normalized)
    ? { start, end: stop, thirdPerson: false, attributes: [] } : null;
  for (let v = 1; v < end; v++) {
    const word = tokens[v].normalized;
    const form = simpleVerbs.find(f => [f.base, f.third, f.past].some(value => value === word));
    const isBe = beForms.includes(word);
    if (!form && !isBe) continue;
    const subject = nounPhrase(tokens, 0, v);
    if (!subject) continue;
    const past = isBe ? ["was", "were"].includes(word) : word === form!.past;
    const isI = v === 1 && tokens[0].normalized === "i";
    const expected = isBe ? (past ? (subject.thirdPerson || isI ? "was" : "were") : (isI ? "am" : subject.thirdPerson ? "is" : "are"))
      : past ? form!.past : subject.thirdPerson ? form!.third : form!.base;
    const common = { subject, v, tense: past ? "past" as const : "present" as const, expected };
    if (isBe) {
      const complement = adjective(v + 1, end) ?? directObject(tokens, v + 1, end);
      if (complement) matches.push({ ...common, pattern: "SVC", complement });
    } else if (form!.pattern === "SV") {
      if (v + 1 === end) matches.push({ ...common, pattern: "SV" });
    } else if (form!.pattern === "SVO") {
      const object = objectPhrase(v + 1, end);
      if (object) matches.push({ ...common, pattern: "SVO", object });
    } else {
      // Single adjective object complement only; noun complements and other frames are deferred.
      const complement = adjective(end - 1, end);
      const object = objectPhrase(v + 1, end - 1);
      if (complement && object) matches.push({ ...common, pattern: "SVOC", object, complement });
    }
  }
  if (!matches.length) return null;
  if (matches.length > 1) { result.status = "ambiguous"; return "存在多个可能的成分边界，无法唯一确定结构。"; }
  const c = matches[0];
  if (tokens[c.v].normalized !== c.expected) {
    result.status = "partial";
    if (c.tense === "past" || adverb?.normalized !== "yesterday") suggest(result, tokens[c.v], c.expected, "AGREEMENT-001", "动词形式需要与主语的人称和单复数一致；be 同时保留原句的现在或过去时。");
    return "短语结构已匹配，但主语与动词形式不在此规则的支持条件内；请查看语法检查中的限定纠错建议。";
  }
  if (c.tense === "present" && adverb?.normalized === "yesterday") return "yesterday 与当前一般现在时规则不匹配，无法可靠分析。时态纠错尚未支持。";
  result.status = "complete"; result.pattern = c.pattern; result.purpose = "declarative";
  result.complexity = "simple"; result.tense = c.tense;
  const ruleId = `${c.pattern}-001`;
  const add = (role: Role, phrase: Phrase, explanation: string) => {
    const id = `node-${result.nodes.length + 1}`;
    result.nodes.push({ id, role, parentId: null, implicit: false, ruleId, explanation,
      ranges: [{ start: tokens[phrase.start].start, end: tokens[phrase.end - 1].end }] });
    for (const i of phrase.attributes) result.nodes.push({ id: `node-${result.nodes.length + 1}`, role: "attribute", parentId: id, implicit: false, ruleId,
      ranges: [{ start: tokens[i].start, end: tokens[i].end }], explanation: `形容词 ${tokens[i].text} 修饰短语的中心名词 ${tokens[phrase.end - 1].text}。` });
  };
  add("subject", c.subject, "主语说明句子谈论的人或事物；由人称代词或简单名词短语构成。");
  add("verb", { start: c.v, end: c.v + 1, thirdPerson: false, attributes: [] }, `${tokens[c.v].text} 是句子的${c.pattern === "SVC" ? "系动词，连接主语和表语" : "谓语动词，表示动作"}，使用${c.tense === "past" ? "一般过去时" : "一般现在时"}。`);
  if (c.object) add("object", c.object, "宾语说明动作涉及的人或事物；由宾格代词或简单名词短语构成。");
  if (c.complement) add("complement", c.complement, c.pattern === "SVC" ? "表语通过系动词说明主语的身份或性质，不是动作的接受者。" : "宾语补足语用形容词说明宾语的性质或状态，与宾语一起表达完整意思。");
  if (adverb) result.nodes.push({ id: `node-${result.nodes.length + 1}`, role: "adverbial", parentId: null, implicit: false, ruleId,
    ranges: [{ start: adverb.start, end: adverb.end }], explanation: `${adverb.text} 说明动作或状态发生的${adverb.normalized === "to school" ? "目的地" : "时间"}。` });
  return `已匹配本地规则 ${ruleId}。此结果不代表已经检查所有语法问题。`;
}

/** Reject malformed data before rendering or applying edits. This is separate from linguistic correctness. */
export function validateAnalysisResult(value: unknown): asserts value is AnalysisResult {
  const fail = (message: string): never => { throw new Error(`分析数据无效：${message}`); };
  const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  const nonempty = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  if (!object(value)) fail("结果不是对象");
  const r = value as Record<string, unknown>;
  if (typeof r.input !== "string" || !Number.isSafeInteger(r.inputVersion) || (r.inputVersion as number) < 0 || !nonempty(r.ruleVersion)) fail("输入元信息");
  const input = r.input as string;
  if (!["complete", "partial", "unsupported", "ambiguous", "invalid"].includes(r.status as string)) fail("状态");
  for (const [field, allowed] of [
    ["purpose", ["declarative", "interrogative", "imperative", "exclamatory"]],
    ["pattern", ["SV", "SVO", "SVC", "SVOO", "SVOC"]], ["complexity", ["simple", "complex"]], ["tense", ["present", "past"]],
  ] as const) if (r[field] !== null && !allowed.includes(r[field] as never)) fail(field);
  if (r.status === "complete" && (!r.purpose || !r.pattern || !r.complexity)) fail("完整结果缺少分类");
  if (!Array.isArray(r.messages) || !r.messages.every(nonempty) || !Array.isArray(r.nodes) || !Array.isArray(r.corrections)) fail("结果列表");
  const range = (v: unknown, insertion = false): Range => {
    if (!object(v) || !Number.isSafeInteger(v.start) || !Number.isSafeInteger(v.end)) fail("位置类型");
    const q = v as Range;
    if (q.start < 0 || q.end > input.length || q.start > q.end || (!insertion && q.start === q.end)) fail("位置边界");
    // Never split a UTF-16 surrogate pair.
    for (const p of [q.start, q.end]) if (p > 0 && p < input.length && /[\uD800-\uDBFF]/.test(input[p - 1]) && /[\uDC00-\uDFFF]/.test(input[p])) fail("位置拆分字符");
    return q;
  };
  const nodes = r.nodes as unknown[];
  const byId = new Map<string, ComponentNode>();
  for (const raw of nodes) {
    if (!object(raw) || !nonempty(raw.id) || byId.has(raw.id) || !["subject", "verb", "indirectObject", "object", "complement", "adverbial", "attribute", "clause"].includes(raw.role as string) || (raw.parentId !== null && !nonempty(raw.parentId)) || typeof raw.implicit !== "boolean" || !nonempty(raw.ruleId) || !nonempty(raw.explanation) || !Array.isArray(raw.ranges)) fail("成分节点");
    const node = raw as ComponentNode;
    if (node.implicit ? node.ranges.length !== 0 : node.ranges.length === 0) fail("隐含成分位置");
    let previousEnd = -1;
    for (const rawRange of node.ranges) { const q = range(rawRange); if (q.start < previousEnd) fail("成分区间重叠或乱序"); previousEnd = q.end; }
    byId.set(node.id, node);
  }
  for (const node of byId.values()) {
    const seen = new Set([node.id]); let current = node;
    while (current.parentId !== null) {
      if (seen.has(current.parentId)) fail("成分循环引用");
      seen.add(current.parentId);
      const parent = byId.get(current.parentId);
      if (!parent) fail("父成分不存在");
      if (current.ranges.some(q => !parent!.ranges.some(p => p.start <= q.start && p.end >= q.end))) fail("子成分超出父成分");
      current = parent!;
    }
  }
  if (r.status === "complete" && ![...byId.values()].some(n => !n.implicit)) fail("完整结果缺少原文成分");
  const explicit = [...byId.values()].filter(n => !n.implicit);
  for (let i = 0; i < explicit.length; i++) for (let j = i + 1; j < explicit.length; j++) {
    const a = explicit[i], b = explicit[j];
    if (a.parentId === b.parentId && a.ranges.some(x => b.ranges.some(y => x.start < y.end && y.start < x.end))) fail("同层成分区间重叠");
  }
  const ids = new Set<string>();
  for (const raw of r.corrections as unknown[]) {
    if (!object(raw) || !nonempty(raw.id) || ids.has(raw.id) || !nonempty(raw.ruleId) || !nonempty(raw.reason) || !nonempty(raw.context) || !Array.isArray(raw.edits) || !raw.edits.length) fail("纠错项");
    const correction = raw as Correction; ids.add(correction.id);
    const edits = correction.edits.map(edit => {
      if (!object(edit) || typeof edit.expected !== "string" || typeof edit.replacement !== "string") fail("编辑内容");
      const q = range(edit.range, true);
      if (input.slice(q.start, q.end) !== edit.expected || edit.expected === edit.replacement) fail("编辑原文不匹配或无变化");
      return q;
    }).sort((a, b) => a.start - b.start || a.end - b.end);
    for (let i = 1; i < edits.length; i++) if (edits[i].start < edits[i - 1].end || edits[i].start === edits[i - 1].start) fail("编辑区间冲突");
  }
}
