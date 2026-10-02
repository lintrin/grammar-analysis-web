import type { AnalysisResult, Purpose } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { beForms, selectedVerb } from "./vocabulary.ts";
import { nounPhrase } from "./phrases.ts";
import { analyzeDeclarative } from "./simple.ts";
import { forkCandidate } from "./context.ts";
import { suggest } from "./suggestions.ts";
import { diagnose, hasReason, budgetMessage } from "./feedback.ts";

const unsupported = "未匹配当前限定的否定陈述句或 can 疑问句；否定疑问、缩写及其他搭配尚未支持。";

/** Match the whole frame before exposing any correction. Keep every original token offset. */
export function analyzeExtended(tokens: Token[], punctuation: string | null, result: AnalysisResult, consumeBoundary: () => boolean, recordPurpose?: (purpose: Purpose) => void): string | null {
  const question = tokens[0]?.normalized === "can";
  const negatives = tokens.filter(t => t.normalized === "not");
  if (!question && !negatives.length) return null;
  recordPurpose?.(question ? "interrogative" : "declarative");
  diagnose(result, "unsupported-structure");
  if (punctuation !== null && punctuation !== (question ? "?" : ".")) { diagnose(result, "punctuation"); return unsupported; }
  if (question ? negatives.length > 0 : negatives.length !== 1) return unsupported;
  const parsed: { candidate: AnalysisResult; message: string }[] = [];
  for (let m = question ? 2 : 1; m < tokens.length; m++) {
    if (!consumeBoundary()) { diagnose(result, "budget-exceeded"); return budgetMessage; }
    const subjectStart = question ? 1 : 0;
    const subject = nounPhrase(tokens, subjectStart, m);
    if (!subject) continue;
    const auxiliary = question ? tokens[0] : tokens[m];
    const aux = auxiliary.normalized;
    const beNegative = !question && beForms.includes(aux);
    const doNegative = !question && ["do", "does", "did"].includes(aux);
    if (!question && !beNegative && !doNegative && aux !== "can") continue;
    if (!question && tokens[m + 1]?.normalized !== "not") continue;
    const v = question ? m : beNegative ? m : m + 2;
    const lexical = tokens[v];
    if (!lexical) continue;
    const form = selectedVerb(lexical);
    if (!beNegative && !form && (doNegative || !["be", ...beForms].includes(lexical.normalized))) continue;
    const normalized = beNegative ? lexical.normalized : doNegative && aux === "did" ? form!.past
      : form ? subject.thirdPerson ? form.third : form.base
      : m === subjectStart + 1 && tokens[subjectStart].normalized === "i" ? "am" : subject.thirdPerson ? "is" : "are";
    const candidate = forkCandidate(result);
    const tailStart = beNegative ? m + 2 : v + 1;
    const message = analyzeDeclarative([...tokens.slice(subjectStart, m), { ...lexical, normalized, finiteTense: doNegative && aux === "did" ? "past" : "present" }, ...tokens.slice(tailStart)], candidate, consumeBoundary);
    if (hasReason(candidate, "budget-exceeded")) { result.reasons = candidate.reasons; return message; }
    if (beNegative) {
      if (!["complete", "partial"].includes(candidate.status)) continue;
    } else {
      if (candidate.status !== "complete") continue;
      const past = doNegative && aux === "did";
      const wrongAux = doNegative && !past && aux !== (subject.thirdPerson ? "does" : "do");
      const wrongBase = lexical.normalized !== (form?.base ?? "be");
      if (wrongAux || wrongBase) {
        candidate.status = "partial"; candidate.purpose = null; candidate.pattern = null;
        diagnose(candidate, "form-mismatch");
        candidate.complexity = null; candidate.tense = null; candidate.aspect = null; candidate.voice = null; candidate.nodes = [];
        if (wrongAux) suggest(candidate, auxiliary, subject.thirdPerson ? "does" : "do", "AGREEMENT-001", "否定陈述句的 do/does 需要与主语的人称和单复数一致。");
        if (wrongBase) suggest(candidate, lexical, form?.base ?? "be", doNegative ? "DO-BASE-001" : "MODAL-BASE-001",
          doNegative ? "do/does/did 已承担时态和人称变化，not 后的实义动词使用原形。" : "can 后的动词使用原形，否定词和疑问语序不改变这一要求。");
      }
    }
    if (candidate.status === "complete") {
      candidate.purpose = question ? "interrogative" : "declarative";
      if (!doNegative && !beNegative) candidate.tense = null;
      const verb = candidate.nodes.find(n => n.role === "verb")!;
      verb.ranges = question ? [{ start: auxiliary.start, end: auxiliary.end }, { start: lexical.start, end: lexical.end }]
        : [{ start: auxiliary.start, end: beNegative ? tokens[m + 1].end : lexical.end }];
      verb.ruleId = question ? "QUESTION-CAN-001" : beNegative ? "NEGATIVE-BE-001" : doNegative ? "NEGATIVE-DO-001" : "NEGATIVE-CAN-001";
      verb.explanation = question ? "can 提前到主语之前构成一般疑问句，与后面的原形动词共同组成动词成分；主语不在这两个原文区间内。"
        : beNegative ? "be 与 not 共同构成否定的系动词成分，否定主语具有此身份或性质；保留 be 的人称和时态。"
        : doNegative ? "do/does/did 与 not、原形动词共同构成否定谓语；助动词承担人称及现在或过去时变化。"
        : "can 与 not、原形动词共同构成否定谓语，表示能力或可能性的否定；不推断一般现在或过去时。";
    }
    parsed.push({ candidate, message: candidate.status === "complete" ? `已匹配${question ? "can 一般疑问" : "否定陈述"}规则。${message}`
      : "完整短语搭配已匹配，但否定或 can 疑问中的动词形式不符合规则；请查看限定纠错建议。" });
  }
  if (parsed.length > 1) { result.status = "ambiguous"; diagnose(result, "ambiguous"); return "存在多个可能的成分边界，无法唯一确定结构。"; }
  if (!parsed.length) return unsupported;
  Object.assign(result, parsed[0].candidate);
  return parsed[0].message;
}
