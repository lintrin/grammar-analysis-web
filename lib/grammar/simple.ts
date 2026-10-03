import type { AnalysisResult, Role } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { adjectiveSupports, selectedVerb, verbForms, simpleVerbs, beForms, isPossession } from "./vocabulary.ts";
import { nounPhrase, directObject, objectPhrase, type Phrase } from "./phrases.ts";
import { createBoundaryBudget } from "./context.ts";
import { finiteAgreement, lexicalTenses } from "./predicate.ts";
import { suggest } from "./suggestions.ts";
import { diagnose, budgetMessage } from "./feedback.ts";

export function analyzeDeclarative(tokens: Token[], result: AnalysisResult, consumeBoundary = createBoundaryBudget()): string {
  diagnose(result, "unsupported-structure");
  let end = tokens.length;
  let adverb: Token | null = ["today", "yesterday"].includes(tokens.at(-1)?.normalized ?? "") ? tokens[--end] : null;
  // Fixed destination frame only, not a general preposition grammar.
  if (!adverb && tokens.at(-2)?.normalized === "to" && tokens.at(-1)?.normalized === "school" && tokens.some(t => selectedVerb(t)?.fixedTail === "to school")) {
    end -= 2;
    adverb = { start: tokens[end].start, end: tokens[end + 1].end, text: result.input.slice(tokens[end].start, tokens[end + 1].end), normalized: "to school" };
  }
  const simple = analyzeSimplePatterns(tokens, end, adverb, result);
  if (simple) return (simple);
  type Candidate = { subject: Phrase; verbIndex: number; verb: typeof verbForms[number]; tense: "present" | "past"; recipient: Phrase; object: Phrase };
  const candidates: Candidate[] = [];
  // At most 1000 code units and a closed vocabulary: enumerate phrase boundaries within a fixed budget.
  for (let v = 1; v < end - 2; v++) {
    const form = selectedVerb(tokens[v], verbForms);
    if (!form) continue;
    const subject = nounPhrase(tokens, 0, v);
    if (!subject) continue;
    for (let split = v + 2; split < end; split++) {
      if (!consumeBoundary()) { diagnose(result, "budget-exceeded"); return budgetMessage; }
      const recipient = nounPhrase(tokens, v + 1, split, true);
      const object = directObject(tokens, split, end);
      if (recipient && object) for (const tense of lexicalTenses(tokens[v],form,subject.thirdPerson,adverb?.normalized)) candidates.push({ subject, verbIndex: v, verb: form, tense, recipient, object });
    }
  }
  if (!candidates.length) return ("未匹配词典及动词搭配限定的五种句型结构。");
  if (candidates.length > 1) { result.status = "ambiguous"; diagnose(result, "ambiguous"); return ("存在多个可能的成分边界，无法唯一确定结构。"); }
  const c = candidates[0];
  if (c.tense === "present" && tokens[c.verbIndex].normalized !== (c.subject.thirdPerson ? c.verb.third : c.verb.base)) {
    result.status = "partial";
    diagnose(result, "form-mismatch");
    if (adverb?.normalized !== "yesterday") suggest(result, tokens[c.verbIndex], c.subject.thirdPerson ? c.verb.third : c.verb.base, "AGREEMENT-001", "一般现在时的动词形式需要与主语的人称和单复数一致。");
    return ("名词短语与双宾语结构已匹配，但动词形式不在此规则的支持条件内；请查看语法检查中的限定纠错建议。");
  }
  if (c.tense === "present" && adverb?.normalized === "yesterday") {
    diagnose(result, "form-mismatch");
    return ("yesterday 与当前一般现在时规则不匹配，无法可靠分析。时态纠错尚未支持。");
  }
  result.status = "complete"; result.purpose = "declarative"; result.pattern = "SVOO";
  result.complexity = "simple"; result.tense = c.tense; result.aspect = "simple"; result.voice = "active";
  result.reasons = [];
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


/** Each verb has an explicit supported frame; no fallback from word class to role. */
function analyzeSimplePatterns(tokens: Token[], end: number, adverb: Token | null, result: AnalysisResult): string | null {
  type Match = { subject: Phrase; v: number; pattern: "SV" | "SVO" | "SVC" | "SVOC"; tense: "present" | "past"; expected: string; object?: Phrase; complement?: Phrase };
  const matches: Match[] = [];
  const adjective = (start: number, stop: number, use: string): Phrase | null => stop === start + 1 && adjectiveSupports(tokens[start],use)
    ? { start, end: stop, thirdPerson: false, attributes: [] } : null;
  for (let v = 1; v < end; v++) {
    const word = tokens[v].normalized;
    const form = selectedVerb(tokens[v], simpleVerbs);
    const isBe = beForms.includes(word);
    if (!form && !isBe) continue;
    const subject = nounPhrase(tokens, 0, v);
    if (!subject) continue;
    for (const tense of isBe ? [["was", "were"].includes(word) ? "past" : "present"] as const : lexicalTenses(tokens[v],form!,subject.thirdPerson,adverb?.normalized)) {
    const past = tense === "past";
    const isI = v === 1 && tokens[0].normalized === "i";
    const expected = isBe ? finiteAgreement(word, subject.thirdPerson, isI)!.expected
      : past ? form!.past : subject.thirdPerson ? form!.third : form!.base;
    const common = { subject, v, tense: past ? "past" as const : "present" as const, expected };
    if (isBe) {
      const complement = adjective(v + 1, end,"subject-complement") ?? directObject(tokens, v + 1, end);
      if (complement) matches.push({ ...common, pattern: "SVC", complement });
    } else if (form!.pattern === "SV") {
      if (v + 1 === end) matches.push({ ...common, pattern: "SV" });
    } else if (form!.pattern === "SVO") {
      const object = isPossession(form) ? directObject(tokens, v + 1, end) : objectPhrase(tokens, v + 1, end);
      if (object) matches.push({ ...common, pattern: "SVO", object });
    } else {
      // Single adjective object complement only; noun complements and other frames are deferred.
      const complement = adjective(end - 1, end,"object-complement");
      const object = objectPhrase(tokens, v + 1, end - 1);
      if (complement && object) matches.push({ ...common, pattern: "SVOC", object, complement });
    }
  }
  }
  if (!matches.length) return null;
  if (matches.length > 1) { result.status = "ambiguous"; diagnose(result, "ambiguous"); return "存在多个可能的成分边界，无法唯一确定结构。"; }
  const c = matches[0];
  const possession = isPossession(selectedVerb(tokens[c.v], simpleVerbs));
  if (tokens[c.v].normalized !== c.expected) {
    result.status = "partial";
    diagnose(result, "form-mismatch", possession || tokens[c.v].contraction ? [{ start: tokens[c.v].start, end: tokens[c.v].end }] : []);
    if (c.tense === "past" || adverb?.normalized !== "yesterday") suggest(result, tokens[c.v], c.expected, "AGREEMENT-001", "动词形式需要与主语的人称和单复数一致；be 同时保留原句的现在或过去时。");
    return "短语结构已匹配，但主语与动词形式不在此规则的支持条件内；请查看语法检查中的限定纠错建议。";
  }
  if (c.tense === "present" && adverb?.normalized === "yesterday") { diagnose(result, "form-mismatch"); return "yesterday 与当前一般现在时规则不匹配，无法可靠分析。时态纠错尚未支持。"; }
  result.status = "complete"; result.pattern = c.pattern; result.purpose = "declarative";
  result.complexity = "simple"; result.tense = c.tense; result.aspect = "simple"; result.voice = "active";
  result.reasons = [];
  const ruleId = `${c.pattern}-001`;
  const add = (role: Role, phrase: Phrase, explanation: string) => {
    const id = `node-${result.nodes.length + 1}`;
    result.nodes.push({ id, role, parentId: null, implicit: false, ruleId, explanation,
      ranges: [{ start: tokens[phrase.start].start, end: tokens[phrase.end - 1].end }] });
    for (const i of phrase.attributes) result.nodes.push({ id: `node-${result.nodes.length + 1}`, role: "attribute", parentId: id, implicit: false, ruleId,
      ranges: [{ start: tokens[i].start, end: tokens[i].end }], explanation: `形容词 ${tokens[i].text} 修饰短语的中心名词 ${tokens[phrase.end - 1].text}。` });
  };
  add("subject", c.subject, "主语说明句子谈论的人或事物；由人称代词或简单名词短语构成。");
  add("verb", { start: c.v, end: c.v + 1, thirdPerson: false, attributes: [] }, `${tokens[c.v].text} 是句子的${c.pattern === "SVC" ? "系动词，连接主语和表语" : possession ? "实义谓语动词 have，表示拥有" : "谓语动词，表示动作"}，使用${c.tense === "past" ? "一般过去时" : "一般现在时"}。`);
  if (c.object) add("object", c.object, possession ? "宾语表示拥有的事物；本规则限定为已支持的名词短语。" : "宾语说明动作涉及的人或事物；由宾格代词或简单名词短语构成。");
  if (c.complement) add("complement", c.complement, c.pattern === "SVC" ? "表语通过系动词说明主语的身份或性质，不是动作的接受者。" : "宾语补足语用形容词说明宾语的性质或状态，与宾语一起表达完整意思。");
  if (adverb) result.nodes.push({ id: `node-${result.nodes.length + 1}`, role: "adverbial", parentId: null, implicit: false, ruleId,
    ranges: [{ start: adverb.start, end: adverb.end }], explanation: `${adverb.text} 说明动作或状态发生的${adverb.normalized === "to school" ? "目的地" : "时间"}。` });
  return `已匹配本地规则 ${ruleId}。此结果不代表已经检查所有语法问题。`;
}
