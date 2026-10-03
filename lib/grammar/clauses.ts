import type { AnalysisResult, ComponentNode } from "./protocol.ts";
import { isWordToken, type Token } from "./tokens.ts";
import { analyzePurpose } from "./purposes.ts";
import { knownWords } from "./vocabulary.ts";
import { createBoundaryBudget, forkCandidate } from "./context.ts";
import { diagnose, clauseReasons } from "./feedback.ts";

/** Exactly two complete declaratives. Tentative clause nodes and edits never escape. */
export function analyzeClauses(tokens: Token[], punctuation: string | null, result: AnalysisResult, mode: "compound" | "cause" | "condition", consumeBoundary = createBoundaryBudget()): string {
  diagnose(result, "unsupported-structure");
  const causal = mode === "cause";
  const conditional = mode === "condition";
  const complex = mode !== "compound";
  const connectors = tokens.filter(t => ["and", "but", "because", "if"].includes(t.normalized));
  const unsupported = conditional ? "当前条件从句仅支持句首 If + 条件从句, + 主句，必须有一个英文逗号；两侧须为显式主语的完整陈述结构。主从句暂不提供纠错。" : causal ? "当前原因从句仅支持主句 + because + 原因从句，无逗号；两侧须为显式主语的完整陈述结构。主从句暂不提供纠错。" : "当前并列句仅支持两个显式主语的完整陈述分句，由一个 and/but 连接；可在连接词前加一个逗号。并列句暂不提供纠错。";
  if (connectors.length !== 1 || (conditional ? connectors[0].normalized !== "if" : causal ? connectors[0].normalized !== "because" : !["and", "but"].includes(connectors[0].normalized))) return unsupported;
  if (punctuation !== null && punctuation !== ".") { diagnose(result, "punctuation"); return unsupported; }
  const connector = connectors[0];
  const split = tokens.indexOf(connector);
  const commas = tokens.filter(t => t.text === ",");
  if (conditional && split !== 0) return unsupported;
  if (conditional && commas.length !== 1) { diagnose(result, "punctuation"); return unsupported; }
  const comma = conditional ? commas[0] : !causal && tokens[split - 1]?.text === "," ? tokens[split - 1] : null;
  const commaIndex = conditional ? tokens.indexOf(comma!) : -1;
  const groups = conditional ? [tokens.slice(1, commaIndex), tokens.slice(commaIndex + 1)] : [tokens.slice(0, split - (comma ? 1 : 0)), tokens.slice(split + 1)];
  if (groups.some(group => group.some(t => !isWordToken(t)))) { diagnose(result, "punctuation"); return unsupported; }
  if (groups.some(group => !group.length)) return unsupported;
  const candidates: AnalysisResult[] = [];
  const unknownReasons = groups.flatMap((group, index) => {
    const ranges = group.filter(t => !knownWords.has(t.normalized)).map(({ start, end }) => ({ start, end }));
    return ranges.length ? [{ code: "unknown-word" as const, ranges, clauseIndex: (index + 1) as 1 | 2 }] : [];
  });
  if (unknownReasons.length) result.reasons = unknownReasons;
  for (const [index, group] of groups.entries()) {
    const unknown = [...new Set(group.filter(t => !knownWords.has(t.normalized)).map(t => t.text))];
    if (unknown.length) return `第 ${index + 1} 分句的词典尚未覆盖：${unknown.join("、")}。整句无法可靠分析；${complex ? "主从句" : "并列句"}暂不提供纠错。`;
  }
  for (const [index, group] of groups.entries()) {
    const candidate = forkCandidate(result);
    const message = analyzePurpose(group, ".", candidate, consumeBoundary);
    if (candidate.status !== "complete" || candidate.purpose !== "declarative" || !candidate.nodes.some(n => n.role === "subject" && !n.implicit)) {
      result.status = candidate.status === "complete" ? "unsupported" : candidate.status;
      if (candidate.status === "complete") diagnose(result, "unsupported-structure", [], (index + 1) as 1 | 2);
      else result.reasons = clauseReasons(candidate, (index + 1) as 1 | 2);
      const detail = candidate.status === "partial" ? "该分句的动词形式不符合当前规则。" : message;
      return `第 ${index + 1} 分句未完整匹配限定陈述结构。${detail} ${unsupported}`;
    }
    candidates.push(candidate);
  }
  const ruleId = conditional ? "IF-001" : causal ? "BECAUSE-001" : "COMPOUND-001";
  const relation = conditional ? "condition" : causal ? "cause" : connector.normalized === "and" ? "addition" : "contrast";
  const explanation = conditional ? "if 引导前置条件从句，提出主句成立的条件；逗号分隔条件从句与主句，两侧各有自己的主语和谓语，不推断语义或时态搭配。" : causal ? "because 引导后置原因从句，说明主句发生的原因；主句与原因从句各有自己的主语和谓语。" : relation === "addition" ? "and 连接两个完整陈述分句，表示并列添加；两个分句各有自己的主语和谓语。" : "but 连接两个完整陈述分句，表示转折；两个分句各有自己的主语和谓语。";
  const nodes: ComponentNode[] = [];
  for (const [index, candidate] of candidates.entries()) {
    const clauseId = `clause-${index + 1}`;
    const group = groups[index];
    nodes.push({ id: clauseId, role: "clause", parentId: null, implicit: false,
      ranges: [{ start: group[0].start, end: group.at(-1)!.end }], ruleId, explanation: `${conditional ? (index === 0 ? "条件从句" : "主句") : causal ? (index === 0 ? "主句" : "原因从句") : `第 ${index + 1} 分句`}是完整陈述结构。${explanation}`,
      clause: { kind: complex ? (index === (conditional ? 1 : 0) ? "main" : "subordinate") : "independent", purpose: "declarative", pattern: candidate.pattern!, tense: candidate.tense, aspect: candidate.aspect, voice: candidate.voice } });
    for (const node of candidate.nodes) nodes.push({ ...node, id: `${clauseId}-${node.id}`, parentId: node.parentId === null ? clauseId : `${clauseId}-${node.parentId}` });
  }
  nodes.push({ id: "connector", role: "connector", parentId: null, implicit: false,
    ranges: (comma ? [comma, connector] : [connector]).sort((a, b) => a.start - b.start).map(({ start, end }) => ({ start, end })),
    ruleId, relation, explanation: `${explanation}${comma ? " 原文逗号标记两个分句之间的停顿，保留在连接节点中。" : ""}` });
  result.status = "complete"; result.purpose = "declarative"; result.complexity = complex ? "complex" : "compound";
  result.pattern = null; result.tense = null; result.aspect = null; result.voice = null; result.corrections = []; result.reasons = []; result.nodes = nodes;
  return `已匹配${conditional ? "前置条件从句" : causal ? "后置原因从句" : "两个完整分句的并列句"}规则 ${ruleId}。${explanation} 句型与时态分别按分句展示；${complex ? "主从句" : "并列句"}暂不提供纠错。`;
}
