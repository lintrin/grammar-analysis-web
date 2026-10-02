import type { AnalysisResult } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { adjectives, determiners, verbForms, simpleVerbs, beForms } from "./vocabulary.ts";
import { nounPhrase, directObject } from "./phrases.ts";
import { analyzeDeclarative } from "./simple.ts";
import { analyzeExtended } from "./extended.ts";
import { createBoundaryBudget, forkCandidate } from "./context.ts";
import { suggest } from "./suggestions.ts";

/** Reorder token references, never input text: every explicit range stays in the original string. */
export function analyzePurpose(tokens: Token[], punctuation: string | null, result: AnalysisResult, consumeBoundary = createBoundaryBudget()): string {
  const extended = analyzeExtended(tokens, punctuation, result, consumeBoundary);
  if (extended !== null) return extended;
  const first = tokens[0]?.normalized;
  const unsupported = "未匹配当前支持的句子用途结构，或句末标点与结构不匹配。";
  const tryParse = (ordered: Token[]) => {
    const candidate = forkCandidate(result);
    const message = analyzeDeclarative(ordered, candidate, consumeBoundary);
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
  return analyzeDeclarative(tokens, result, consumeBoundary);
}
