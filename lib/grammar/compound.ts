import type { AnalysisResult, ComponentNode } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { analyzePurpose } from "./purposes.ts";
import { knownWords } from "./vocabulary.ts";
import { createBoundaryBudget, forkCandidate } from "./context.ts";

/** Exactly two complete declaratives. Tentative clause nodes and edits never escape. */
export function analyzeCompound(tokens: Token[], punctuation: string | null, result: AnalysisResult, consumeBoundary = createBoundaryBudget()): string {
  const connectors = tokens.filter(t => ["and", "but"].includes(t.normalized));
  const unsupported = "当前并列句仅支持两个显式主语的完整陈述分句，由一个 and/but 连接；可在连接词前加一个逗号。并列句暂不提供纠错。";
  if (connectors.length !== 1 || (punctuation !== null && punctuation !== ".")) return unsupported;
  const connector = connectors[0];
  const split = tokens.indexOf(connector);
  const comma = tokens[split - 1]?.text === "," ? tokens[split - 1] : null;
  const groups = [tokens.slice(0, split - (comma ? 1 : 0)), tokens.slice(split + 1)];
  if (groups.some(group => !group.length || group.some(t => !/^[A-Za-z]+$/.test(t.text)))) return unsupported;
  const candidates: AnalysisResult[] = [];
  for (const [index, group] of groups.entries()) {
    const unknown = [...new Set(group.filter(t => !knownWords.has(t.normalized)).map(t => t.text))];
    if (unknown.length) return `第 ${index + 1} 分句的词典尚未覆盖：${unknown.join("、")}。整句无法可靠分析；并列句暂不提供纠错。`;
  }
  for (const [index, group] of groups.entries()) {
    const candidate = forkCandidate(result);
    const message = analyzePurpose(group, ".", candidate, consumeBoundary);
    if (candidate.status !== "complete" || candidate.purpose !== "declarative" || !candidate.nodes.some(n => n.role === "subject" && !n.implicit)) {
      result.status = candidate.status === "complete" ? "unsupported" : candidate.status;
      const detail = candidate.status === "partial" ? "该分句的动词形式不符合当前规则。" : message;
      return `第 ${index + 1} 分句未完整匹配限定陈述结构。${detail} ${unsupported}`;
    }
    candidates.push(candidate);
  }
  const relation = connector.normalized === "and" ? "addition" : "contrast";
  const explanation = relation === "addition" ? "and 连接两个完整陈述分句，表示并列添加；两个分句各有自己的主语和谓语。" : "but 连接两个完整陈述分句，表示转折；两个分句各有自己的主语和谓语。";
  const nodes: ComponentNode[] = [];
  for (const [index, candidate] of candidates.entries()) {
    const clauseId = `clause-${index + 1}`;
    const group = groups[index];
    nodes.push({ id: clauseId, role: "clause", parentId: null, implicit: false,
      ranges: [{ start: group[0].start, end: group.at(-1)!.end }], ruleId: "COMPOUND-001", explanation: `第 ${index + 1} 分句是完整陈述分句。${explanation}`,
      clause: { kind: "independent", purpose: "declarative", pattern: candidate.pattern!, tense: candidate.tense } });
    for (const node of candidate.nodes) nodes.push({ ...node, id: `${clauseId}-${node.id}`, parentId: node.parentId === null ? clauseId : `${clauseId}-${node.parentId}` });
  }
  nodes.push({ id: "connector", role: "connector", parentId: null, implicit: false,
    ranges: [...(comma ? [{ start: comma.start, end: comma.end }] : []), { start: connector.start, end: connector.end }],
    ruleId: "COMPOUND-001", relation, explanation: `${explanation}${comma ? " 原文逗号标记两个分句之间的停顿，保留在连接节点中。" : ""}` });
  result.status = "complete"; result.purpose = "declarative"; result.complexity = "compound";
  result.nodes = nodes;
  return `已匹配两个完整分句的并列句规则 COMPOUND-001。${explanation} 句型与时态分别按分句展示；并列句暂不提供纠错。`;
}
