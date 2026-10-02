import type { AnalysisResult, Pattern, Purpose, Role } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { parsePredicate, type Predicate, lexicalForm } from "./predicate.ts";
import { nounPhrase, objectPhrase, directObject, type Phrase } from "./phrases.ts";
import { adjectives, adjectiveSupports, beForms, nounCandidate, directObjectPronouns, subjectPronouns } from "./vocabulary.ts";
import { diagnose, budgetMessage } from "./feedback.ts";
import { tenseLabel, voiceLabel } from "./classification.ts";

type Part = { role: Role; phrase: Phrase; explanation: string };
type Match = { subject: Phrase; predicate: Predicate; ordered: Token[]; pattern: Pattern; parts: Part[] };
const beWords = new Set([...beForms, "be", "been", "being"]);

/** Whole-frame matching: failed candidates expose neither nodes nor automatic edits. */
export function analyzeComposed(tokens: Token[], punctuation: string | null, result: AnalysisResult, consume: () => boolean, recordPurpose?: (purpose: Purpose) => void): string | null {
  const first = tokens[0]?.normalized;
  const question = beForms.includes(first) || ["have", "has", "had"].includes(first);
  // Plain be + complement continues through the existing purpose rules.
  const trigger = tokens.some((token, i) => (beForms.includes(token.normalized) || ["have", "has", "had"].includes(token.normalized))
    && tokens.slice(i + 1).some(t => lexicalForm(t) || beWords.has(t.normalized)));
  if (!trigger) return null;
  recordPurpose?.(question ? "interrogative" : "declarative");
  diagnose(result, "unsupported-structure");
  const unsupported = "未匹配当前支持的谓语组合；新结构仅提供分析与形式提示，暂不提供自动纠错。";
  if (punctuation !== null && punctuation !== (question ? "?" : ".")) { diagnose(result, "punctuation"); return unsupported; }
  const negatives = tokens.filter(t => t.normalized === "not");
  if ((question && negatives.length > 0) || negatives.length > 1) return unsupported;
  let end = tokens.length;
  const adverbials: Part[] = [];
  const tailTime = tokens.at(-1)?.normalized;
  if (tailTime === "today" || tailTime === "yesterday") {
    end--;
    adverbials.push({ role: "adverbial", phrase: { start: end, end: end + 1, thirdPerson: false, attributes: [] }, explanation: "时间状语说明动作或状态发生的时间。" });
  }
  const matches: Match[] = [];
  for (let split = question ? 2 : 1; split < end; split++) {
    const finiteIndex = question ? 0 : split;
    if (!question && !beForms.includes(tokens[finiteIndex].normalized) && !["have", "has", "had"].includes(tokens[finiteIndex].normalized)) continue;
    if (!consume()) { diagnose(result, "budget-exceeded"); return budgetMessage; }
    const subject = nounPhrase(tokens, question ? 1 : 0, split);
    if (!subject) continue;
    const ordered = [tokens[finiteIndex], ...tokens.slice(question ? split : split + 1, end)];
    const isI = split === (question ? 2 : 1) && tokens[question ? 1 : 0].normalized === "i";
    for (const predicate of parsePredicate(ordered, subject.thirdPerson, isI)) {
      if (negatives.length && ordered[1]?.normalized !== "not") continue;
      const subjectWord = tokens[subject.start].normalized;
      const recipientSubject = (subject.end === subject.start + 1 && subjectPronouns.has(subjectWord) && subjectWord !== "it")
        || nounCandidate(tokens[subject.end - 1])?.person === true;
      const parts = predicate.voice === "passive" ? passiveParts(ordered, predicate, recipientSubject) : activeParts(ordered, predicate, consume);
      if (parts === "budget") { diagnose(result, "budget-exceeded"); return budgetMessage; }
      for (const frame of parts) matches.push({ subject, predicate, ordered, pattern: predicate.voice === "passive" ? (frame.some(p => p.role === "object") ? "SVO" : "SV") : predicate.pattern, parts: frame });
    }
  }
  const valid = matches.filter(m => !m.predicate.mismatches.length);
  // A finite agreement error does not make a correctly formed chain compete with
  // a different frame whose participle would also need to be changed.
  const formed = matches.filter(m => m.predicate.mismatches.every(t => t === m.predicate.tokens[0]));
  // Preserve a correct lexical form even when a nonfinite auxiliary is wrong.
  const lexicalFormed = matches.filter(m => !m.predicate.lexical || !m.predicate.mismatches.includes(m.predicate.tokens.at(-1)!));
  const candidates = valid.length ? valid : formed.length ? formed : lexicalFormed.length ? lexicalFormed : matches;
  if (!candidates.length) return unsupported;
  if (valid.some(m => m.predicate.voice === "passive" && m.predicate.aspect === "simple" && m.parts.length === 0 && adjectives.has(m.predicate.tokens.at(-1)!.normalized))) { result.status = "ambiguous"; diagnose(result, "ambiguous"); return "过去分词同时具有词典中的形容词用法，无法唯一判断被动谓语与系表结构。"; }
  if (valid.length > 1) { result.status = "ambiguous"; diagnose(result, "ambiguous"); return "存在多个有效的谓语或成分边界，无法唯一确定结构。"; }
  if (!valid.length) {
    result.status = "partial";
    const mismatches = [...new Set(candidates.flatMap(m => m.predicate.mismatches))];
    diagnose(result, "form-mismatch", mismatches.map(({ start, end }) => ({ start, end })).sort((a,b) => a.start - b.start));
    return "完整短语搭配已匹配，但助动词的人称、数或后续动词形式不符合谓语组合规则；新结构暂不提供自动纠错。";
  }
  const match = candidates[0];
  if (match.predicate.tense === "present" && tailTime === "yesterday") { diagnose(result, "form-mismatch"); return "yesterday 与当前现在时规则不匹配，无法可靠分析；时态纠错尚未支持。"; }
  const predicate = match.predicate;
  result.status = "complete"; result.purpose = question ? "interrogative" : "declarative"; result.complexity = "simple";
  result.pattern = match.pattern; result.tense = predicate.tense; result.aspect = predicate.aspect; result.voice = predicate.voice;
  result.reasons = []; result.corrections = []; result.nodes = [];
  const ruleId = `PREDICATE-${predicate.aspect.toUpperCase()}-${predicate.voice.toUpperCase()}`;
  const addPhrase = (role: Role, phrase: Phrase, source: Token[], explanation: string) => {
    const id = `node-${result.nodes.length + 1}`;
    result.nodes.push({ id, role, parentId: null, implicit: false, ruleId, explanation,
      ranges: [{ start: source[phrase.start].start, end: source[phrase.end - 1].end }] });
    for (const i of phrase.attributes) result.nodes.push({ id: `node-${result.nodes.length + 1}`, role: "attribute", parentId: id, implicit: false, ruleId,
      ranges: [{ start: source[i].start, end: source[i].end }], explanation: `形容词 ${source[i].text} 修饰短语中的中心名词。` });
  };
  addPhrase("subject", match.subject, tokens, predicate.voice === "passive" ? `${predicate.lexical!.base} 的主动搭配为 ${predicate.pattern}；本句将${predicate.pattern === "SVOO" && match.pattern === "SVO" ? "接受者" : "原宾语"}提升为被动句主语，句型按原文实际成分标为 ${match.pattern}。` : "主语说明句子谈论的人或事物；使用原文中的人称代词或完整名词短语。");
  const chain = predicate.tokens;
  const ranges = question ? [{ start: chain[0].start, end: chain[0].end }, { start: chain[1].start, end: chain.at(-1)!.end }]
    : [{ start: chain[0].start, end: chain.at(-1)!.end }];
  result.nodes.push({ id: `node-${result.nodes.length + 1}`, role: "verb", parentId: null, implicit: false, ruleId, ranges,
    explanation: `${chain.map(t => t.text).join(" ")} 共同构成完整谓语，${chain[0].text} 承担人称与现在或过去时变化；实义动词为 ${predicate.lexical?.base ?? "be"}，后续动词使用${predicate.voice === "passive" || predicate.aspect === "perfect" ? "过去分词" : "现在分词"}形式，使用${tenseLabel(predicate.tense, predicate.aspect)}、${voiceLabel(predicate.voice)}。${question ? "助动词提前，主语不属于谓语区间。" : ""}${chain.some(t => t.normalized === "not") ? "not 是否定谓语的一部分。" : ""}` });
  for (const part of match.parts) addPhrase(part.role, part.phrase, match.ordered, part.explanation);
  for (const part of adverbials) addPhrase(part.role, part.phrase, tokens, part.explanation);
  return `已匹配${tenseLabel(predicate.tense, predicate.aspect)}、${voiceLabel(predicate.voice)}的完整谓语组合。新结构暂不提供自动纠错；规则匹配不代表所有语法问题均已检查。`;
}

function activeParts(tokens: Token[], predicate: Predicate, consume: () => boolean): Part[][] | "budget" {
  const start = predicate.end;
  let end = tokens.length;
  const extras: Part[] = [];
  if (predicate.lexical?.fixedTail === "to school" && tokens.at(-2)?.normalized === "to" && tokens.at(-1)?.normalized === "school") {
    end -= 2; extras.push({ role: "adverbial", phrase: { start: end, end: end + 2, thirdPerson: false, attributes: [] }, explanation: "to school 是 go 的固定目的地状语，说明动作的目的地。" });
  }
  const part = (role: Role, phrase: Phrase, explanation: string): Part => ({ role, phrase, explanation });
  const objectExplanation = "宾语说明动作涉及的人或事物，保留完整宾格代词或名词短语。";
  switch (predicate.pattern) {
    case "SV": return start === end ? [extras] : [];
    case "SVO": {
      const object = objectPhrase(tokens, start, end);
      return object ? [[part("object", object, objectExplanation), ...extras]] : [];
    }
    case "SVC": {
      const complement = end === start + 1 && adjectiveSupports(tokens[start],"subject-complement") ? { start, end, thirdPerson: false, attributes: [] } : directObject(tokens, start, end);
      return complement ? [[part("complement", complement, "表语通过系动词 be 说明主语的身份或性质，属于完成时的系表结构。")]] : [];
    }
    case "SVOC": {
      const object = objectPhrase(tokens, start, end - 1);
      return object && adjectiveSupports(tokens[end - 1],"object-complement") ? [[part("object", object, objectExplanation), part("complement", { start: end - 1, end, thirdPerson: false, attributes: [] }, "宾语补足语用单个形容词说明宾语的性质或状态。"), ...extras]] : [];
    }
    case "SVOO": {
      const matches: Part[][] = [];
      for (let split = start + 1; split < end; split++) {
        if (!consume()) return "budget";
        const recipient = nounPhrase(tokens, start, split, true), object = directObject(tokens, split, end);
        if (recipient && object) matches.push([part("indirectObject", recipient, "间接宾语说明动作的接受者，限定为人物名词短语或宾格代词。"), part("object", object, "直接宾语说明给予、传递、展示或提供的事物。"), ...extras]);
      }
      return matches;
    }
  }
}

/** Three audited passive promotions; to/by are limited tails, never general prepositions. */
function passiveParts(tokens: Token[], predicate: Predicate, recipientSubject: boolean): Part[][] {
  const start = predicate.end;
  let end = tokens.length;
  const extras: Part[] = [];
  const by = tokens.findIndex((t, i) => i >= start && t.normalized === "by");
  if (by >= 0) {
    const agent = end === by + 2 && directObjectPronouns.has(tokens[by + 1].normalized)
      ? objectPhrase(tokens, by + 1, end) : nounPhrase(tokens, by + 1, end, true);
    if (!agent) return [];
    extras.push({ role: "adverbial", phrase: { ...agent, start: by }, explanation: "by 引出被动动作的施事，说明谁发出动作；整个介词短语作施事状语。" });
    end = by;
  }
  const to = tokens.findIndex((t, i) => i >= start && i < end && t.normalized === "to");
  if (to >= 0) {
    if (predicate.pattern !== "SVOO") return [];
    const recipient = nounPhrase(tokens, to + 1, end, true);
    if (!recipient) return [];
    extras.unshift({ role: "adverbial", phrase: { ...recipient, start: to }, explanation: "to 引出双宾语动作的接受者；原直接宾语成为主语，接受者使用限定的介词状语表达。" });
    end = to;
  }
  if (predicate.pattern === "SVO") return start === end ? [extras] : [];
  if (predicate.pattern !== "SVOO") return [];
  if (start === end) return [extras];
  // Recipient promotion retains one direct object and cannot also supply a to-recipient.
  const object = to < 0 && recipientSubject ? directObject(tokens, start, end) : null;
  return object ? [[{ role: "object", phrase: object, explanation: "原间接宾语已提升为主语，这个直接宾语保留在被动谓语后，说明给予、传递或展示的事物。" }, ...extras]] : [];
}
