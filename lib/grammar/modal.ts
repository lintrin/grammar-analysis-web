import type { AnalysisResult, Purpose } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { selectedVerb, beForms, isPossession } from "./vocabulary.ts";
import { nounPhrase } from "./phrases.ts";
import { analyzeDeclarative } from "./simple.ts";
import { forkCandidate } from "./context.ts";
import { diagnose, hasReason, budgetMessage } from "./feedback.ts";
import { suggest } from "./suggestions.ts";

/** Only will + a complete, audited simple active frame; references keep original offsets. */
export function analyzeWill(tokens: Token[], punctuation: string | null, result: AnalysisResult, consume: () => boolean, recordPurpose: (purpose: Purpose) => void): string | null {
  if (!tokens.some(t => t.normalized === "will")) return null;
  const question = tokens[0]?.normalized === "will";
  recordPurpose(question ? "interrogative" : "declarative");
  const unsupported = "will 首批只开放完整简单体主动搭配和 will be 系表；否定疑问、拥有义 have 与其他谓语链尚未开放。";
  diagnose(result,"unsupported-structure");
  if (punctuation && punctuation !== (question ? "?" : ".")) { diagnose(result,"punctuation"); return unsupported; }
  if (tokens.filter(t=>t.normalized === "will").length !== 1 || (question && tokens.some(t=>t.normalized === "not")) || tokens.filter(t=>t.normalized === "not").length > 1) return unsupported;
  if (tokens.filter(t=>["today","yesterday"].includes(t.normalized)).length > 1) return unsupported;
  if (tokens.at(-1)?.normalized === "yesterday") { diagnose(result,"form-mismatch"); return "首批 will 用法与 yesterday 不匹配；不猜测时态修改。"; }
  const matches: AnalysisResult[] = [];
  for (let split=question?2:1;split<tokens.length;split++) {
    if (!consume()) { diagnose(result,"budget-exceeded"); return budgetMessage; }
    const start=question?1:0,subject=nounPhrase(tokens,start,split);
    if (!subject || (!question && tokens[split].normalized !== "will")) continue;
    const aux=question?tokens[0]:tokens[split];
    const negative=!question && tokens[split+1]?.normalized === "not";
    const v=question?split:split+(negative?2:1),lexical=tokens[v];
    if (!lexical) continue;
    const form=selectedVerb(lexical);
    if (isPossession(form) || (!form && !["be",...beForms].includes(lexical.normalized))) continue;
    const normalized=form?(subject.thirdPerson?form.third:form.base):split===start+1&&tokens[start].normalized==="i"?"am":subject.thirdPerson?"is":"are";
    const candidate=forkCandidate(result);
    analyzeDeclarative([...tokens.slice(start,split),{...lexical,normalized,finiteTense:"present"},...tokens.slice(v+1)],candidate,consume);
    if (hasReason(candidate,"budget-exceeded")) { result.reasons=candidate.reasons; return budgetMessage; }
    if (candidate.status !== "complete") continue;
    if (lexical.normalized !== (form?.base ?? "be")) {
      Object.assign(candidate,forkCandidate(candidate),{status:"partial"});diagnose(candidate,"form-mismatch");
      suggest(candidate,lexical,form?.base ?? "be","MODAL-BASE-001","will 后接动词原形；保留原文否定、时态表达与语序。");
    } else {
      candidate.tense=null;candidate.modal="will";candidate.purpose=question?"interrogative":"declarative";
      const verb=candidate.nodes.find(n=>n.role === "verb")!;
      verb.ranges=question?[{start:aux.start,end:aux.end},{start:lexical.start,end:lexical.end}]:[{start:aux.start,end:lexical.end}];
      verb.ruleId=question?"QUESTION-WILL-001":negative?"NEGATIVE-WILL-001":"MODAL-WILL-001";
      verb.explanation="will 与动词原形共同构成简单体主动谓语；常用于将来表达，不推断意愿或预测。主语不包含在疑问谓语区间内。";
    }
    matches.push(candidate);
  }
  if (matches.length>1) { result.status="ambiguous";diagnose(result,"ambiguous");return "will 结构存在多个完整搭配解释。"; }
  if (!matches.length) return unsupported;
  Object.assign(result,matches[0]);return "已匹配 will 的完整搭配；形式错误仅提供单处原形替换。";
}
