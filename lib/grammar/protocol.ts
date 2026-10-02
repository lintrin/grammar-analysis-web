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
