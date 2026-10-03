import { tokenize } from "./tokens.ts";

export const RULE_VERSION = "0.22.2";
export const MAX_INPUT_LENGTH = 1000;
export type Range = { start: number; end: number };
export type Purpose = "declarative" | "interrogative" | "imperative" | "exclamatory";
export type Pattern = "SV" | "SVO" | "SVC" | "SVOO" | "SVOC";
export type QuestionType = "yes-no" | "wh-subject" | "wh-object" | "wh-adverbial" | null;
export type Modal = "can" | "will" | null;
export type Tense = "present" | "past" | null;
export type Aspect = "simple" | "progressive" | "perfect" | "perfect-progressive" | null;
export type Voice = "active" | "passive" | null;
export type Role = "subject" | "verb" | "indirectObject" | "object" | "complement" | "adverbial" | "attribute" | "clause" | "connector";
export type ComponentNode = {
  id: string; role: Role; parentId: string | null; ranges: Range[];
  implicit: boolean; ruleId: string; explanation: string;
  clause?: { kind: "independent" | "main" | "subordinate"; purpose: Purpose; pattern: Pattern; tense: Tense; modal: Modal; questionType: QuestionType; aspect: Aspect; voice: Voice };
  relation?: "addition" | "contrast" | "cause" | "condition";
};
export type Correction = {
  id: string; ruleId: string; reason: string; context: string;
  edits: { range: Range; expected: string; replacement: string }[];
};
export type ReasonCode = "unknown-word" | "unsupported-structure" | "form-mismatch" | "punctuation" | "ambiguous" | "budget-exceeded" | "invalid-input";
export type AnalysisReason = { code: ReasonCode; ranges: Range[]; clauseIndex?: 1 | 2 };
export type AnalysisResult = {
  input: string; inputVersion: number; ruleVersion: string; lexiconVersion: string; lexiconHash: string;
  status: "complete" | "partial" | "unsupported" | "ambiguous" | "invalid";
  purpose: Purpose | null;
  pattern: Pattern | null;
  complexity: "simple" | "compound" | "complex" | null;
  tense: Tense; modal: Modal; questionType: QuestionType; aspect: Aspect; voice: Voice;
  nodes: ComponentNode[]; corrections: Correction[]; messages: string[];
  reasons: AnalysisReason[];
};
/** Reject malformed data before rendering or applying edits. This is separate from linguistic correctness. */
export function validateAnalysisResult(value: unknown): asserts value is AnalysisResult {
  const fail = (message: string): never => { throw new Error(`分析数据无效：${message}`); };
  const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  const nonempty = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  if (!object(value)) fail("结果不是对象");
  const r = value as Record<string, unknown>;
  if (typeof r.input !== "string" || !Number.isSafeInteger(r.inputVersion) || (r.inputVersion as number) < 0 || !nonempty(r.ruleVersion)) fail("输入元信息");
  if (!nonempty(r.lexiconVersion) || typeof r.lexiconHash !== "string" || !/^[a-f0-9]{64}$/.test(r.lexiconHash)) fail("词典元信息");
  const input = r.input as string;
  let contractions: ReturnType<typeof tokenize> | undefined;
  if (!["complete", "partial", "unsupported", "ambiguous", "invalid"].includes(r.status as string)) fail("状态");
  for (const [field, allowed] of [
    ["purpose", ["declarative", "interrogative", "imperative", "exclamatory"]],
    ["pattern", ["SV", "SVO", "SVC", "SVOO", "SVOC"]], ["complexity", ["simple", "compound", "complex"]], ["questionType", ["yes-no","wh-subject","wh-object","wh-adverbial"]], ["modal", ["can", "will"]], ["tense", ["present", "past"]], ["aspect", ["simple", "progressive", "perfect", "perfect-progressive"]], ["voice", ["active", "passive"]],
  ] as const) if (r[field] !== null && !allowed.includes(r[field] as never)) fail(field);
  if (r.status === "complete" && (!r.purpose || !r.complexity || (r.complexity === "simple" && (!r.pattern || !r.aspect || !r.voice)))) fail("完整结果缺少分类");
  if (!Array.isArray(r.messages) || !r.messages.every(nonempty) || !Array.isArray(r.nodes) || !Array.isArray(r.corrections)) fail("结果列表");
  const range = (v: unknown, insertion = false): Range => {
    if (!object(v) || !Number.isSafeInteger(v.start) || !Number.isSafeInteger(v.end)) fail("位置类型");
    const q = v as Range;
    if (q.start < 0 || q.end > input.length || q.start > q.end || (!insertion && q.start === q.end)) fail("位置边界");
    // Never split a UTF-16 surrogate pair.
    for (const p of [q.start, q.end]) if (p > 0 && p < input.length && /[\uD800-\uDBFF]/.test(input[p - 1]) && /[\uDC00-\uDFFF]/.test(input[p])) fail("位置拆分字符");
    // Failure results without positions (including oversized inputs) need no token scan.
    contractions ??= tokenize(input).filter(t => t.contraction && t.normalized !== "not");
    for (const p of [q.start, q.end]) if (contractions.some(t => t.start < p && p < t.end)) fail("位置拆分缩写");
    return q;
  };
  if (r.modal !== null && (r.status !== "complete" || r.tense !== null || r.aspect !== "simple" || r.voice !== "active" || r.complexity !== "simple")) fail("情态分类组合");
  if (r.questionType !== null && (r.status !== "complete" || r.purpose !== "interrogative" || r.complexity !== "simple")) fail("疑问分类组合");
  if (r.status === "complete" && r.purpose === "interrogative" && r.questionType === null) fail("疑问分类缺失");
  const nodes = r.nodes as unknown[];
  {
    if (!Array.isArray(r.reasons) || (r.status === "complete" ? r.reasons.length !== 0 : r.reasons.length === 0)) fail("分析原因列表");
    const states: Record<ReasonCode, string[]> = {
      "unknown-word": ["unsupported"], "unsupported-structure": ["unsupported"], "form-mismatch": ["partial", "unsupported"],
      punctuation: ["invalid", "unsupported"], ambiguous: ["ambiguous"], "budget-exceeded": ["unsupported"], "invalid-input": ["invalid"],
    };
    for (const reason of r.reasons as unknown[]) {
      if (!object(reason) || typeof reason.code !== "string" || !Object.hasOwn(states, reason.code) || !states[reason.code as ReasonCode].includes(r.status as string) || !Array.isArray(reason.ranges) || (reason.clauseIndex !== undefined && ![1, 2].includes(reason.clauseIndex as number))) fail("分析原因");
      const diagnostic = reason as AnalysisReason;
      if (diagnostic.code === "unknown-word" && !diagnostic.ranges.length) fail("未知词缺少位置");
      let end = -1;
      for (const q of diagnostic.ranges) { const position = range(q); if (position.start < end) fail("原因位置乱序或重叠"); end = position.end; }
    }
  }
  const byId = new Map<string, ComponentNode>();
  for (const raw of nodes) {
    if (!object(raw) || !nonempty(raw.id) || byId.has(raw.id) || !["subject", "verb", "indirectObject", "object", "complement", "adverbial", "attribute", "clause", "connector"].includes(raw.role as string) || (raw.parentId !== null && !nonempty(raw.parentId)) || typeof raw.implicit !== "boolean" || !nonempty(raw.ruleId) || !nonempty(raw.explanation) || !Array.isArray(raw.ranges)) fail("成分节点");
    const node = raw as ComponentNode;
    const metadata = raw as Record<string, unknown>;
    const classification = metadata.clause;
    if (classification !== undefined && (node.role !== "clause" || !object(classification) || !["independent", "main", "subordinate"].includes(classification.kind as string) || !["declarative", "interrogative", "imperative", "exclamatory"].includes(classification.purpose as string) || !["SV", "SVO", "SVC", "SVOO", "SVOC"].includes(classification.pattern as string) || ![null,"yes-no","wh-subject","wh-object","wh-adverbial"].includes(classification.questionType as string | null) || ![null, "can", "will"].includes(classification.modal as string | null) || ![null, "present", "past"].includes(classification.tense as string | null) || ![null, "simple", "progressive", "perfect", "perfect-progressive"].includes(classification.aspect as string | null) || ![null, "active", "passive"].includes(classification.voice as string | null))) fail("分句分类");
    if (metadata.relation !== undefined && (node.role !== "connector" || !["addition", "contrast", "cause", "condition"].includes(metadata.relation as string))) fail("连接关系");
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
  const verifyModal = (classification: {modal: unknown;tense: unknown;purpose: unknown}, parts: ComponentNode[]) => {
    const verbs = parts.filter(n=>n.role==="verb");
    const modalTokens = tokenize(input).filter(t=>["can","will"].includes(t.normalized)&&verbs.some(n=>n.ranges.some(q=>q.start<=t.start&&q.end>=t.end)));
    const actual = modalTokens[0]?.normalized ?? null;
    if(classification.modal !== actual || (classification.purpose !== "imperative" && classification.tense === null && actual === null)) fail("情态原文与分类不一致");
  };
  if(r.status === "complete" && r.complexity === "simple") verifyModal({modal:r.modal,tense:r.tense,purpose:r.purpose},[...byId.values()]);
  if(r.status === "complete") for(const node of byId.values()) if(node.clause) verifyModal(node.clause,[...byId.values()].filter(n=>n.parentId === node.id));
  const explicit = [...byId.values()].filter(n => !n.implicit);
  for (let i = 0; i < explicit.length; i++) for (let j = i + 1; j < explicit.length; j++) {
    const a = explicit[i], b = explicit[j];
    if (a.parentId === b.parentId && a.ranges.some(x => b.ranges.some(y => x.start < y.end && y.start < x.end))) fail("同层成分区间重叠");
  }
  if (r.status === "complete" && ["compound", "complex"].includes(r.complexity as string)) {
    const complex = r.complexity === "complex";
    const roots = [...byId.values()].filter(n => n.parentId === null);
    const clauses = roots.filter(n => n.role === "clause");
    const connector = roots.find(n => n.role === "connector");
    const conditional = complex && connector?.relation === "condition";
    if (r.questionType !== null || r.modal !== null || r.purpose !== "declarative" || r.pattern !== null || r.tense !== null || r.aspect !== null || r.voice !== null || (r.corrections as unknown[]).length || roots.length !== 3 || clauses.length !== 2 || !connector?.relation) fail("多分句整体分类与关系");
    for (const clause of clauses) {
      if (clause.implicit || clause.ranges.length !== 1 || (clause.clause?.questionType !== null || clause.clause?.purpose !== "declarative" || !clause.clause.aspect || !clause.clause.voice)) fail("分句分类");
      if (clause.clause?.modal !== null && (clause.clause?.tense !== null || clause.clause?.aspect !== "simple" || clause.clause?.voice !== "active")) fail("分句情态分类组合");
      const parts = [...byId.values()].filter(n => n.parentId === clause.id);
      for (const role of ["subject", "verb"]) if (parts.filter(n => n.role === role && !n.implicit).length !== 1) fail("分句缺少显式主谓");
    }
    clauses.sort((a, b) => a.ranges[0].start - b.ranges[0].start);
    if (clauses.some((clause, i) => clause.clause?.kind !== (complex ? (i === (conditional ? 1 : 0) ? "main" : "subordinate") : "independent"))) fail("主从或独立分句归属");
    const link = connector!;
    const word = link.ranges.map(q => input.slice(q.start, q.end)).join(" ").toLowerCase();
    if (link.implicit) fail("连接词原文或顺序");
    if (conditional) {
      if (link.ranges.length !== 2 || input.slice(link.ranges[0].start, link.ranges[0].end).toLowerCase() !== "if" || input.slice(link.ranges[1].start, link.ranges[1].end) !== "," || link.ranges[0].end > clauses[0].ranges[0].start || clauses[0].ranges[0].end > link.ranges[1].start || link.ranges[1].end > clauses[1].ranges[0].start) fail("if 与逗号原文或顺序");
    } else if ((complex ? (word !== "because" || link.ranges.length !== 1 || link.relation !== "cause") : (!/^,?\s*(and|but)$/.test(word) || link.relation !== (word.endsWith("and") ? "addition" : "contrast"))) || clauses[0].ranges[0].end > link.ranges[0].start || link.ranges.at(-1)!.end > clauses[1].ranges[0].start) fail("连接词原文或顺序");
    for (const node of byId.values()) {
      if (roots.includes(node)) continue;
      let ancestor = node;
      while (ancestor.parentId !== null) ancestor = byId.get(ancestor.parentId)!;
      if (!clauses.includes(ancestor) || node.role === "clause" || node.role === "connector") fail("分句归属");
    }
    const ranges = roots.flatMap(n => n.ranges).sort((a, b) => a.start - b.start);
    let end = 0;
    for (const q of ranges) { if (input.slice(end, q.start).trim()) fail("多分句存在未归属原文"); end = q.end; }
    if (!/^\s*\.?\s*$/.test(input.slice(end))) fail("多分句末尾原文");
  }
  if (typeof r.questionType === "string" && r.questionType.startsWith("wh-")) {
    if (!["SV","SVO"].includes(r.pattern as string) || r.aspect !== "simple" || r.voice !== "active") fail("特殊疑问句型组合");
    const role = {"wh-subject":"subject","wh-object":"object","wh-adverbial":"adverbial"}[r.questionType as "wh-subject"|"wh-object"|"wh-adverbial"];
    const first = tokenize(input)[0];
    const word = first?.normalized;
    if (!(r.questionType === "wh-adverbial" ? ["where","when","why"] : ["who","what"]).includes(word) || ![...byId.values()].some(n=>n.role===role&&!n.implicit&&n.ranges.length===1&&n.ranges[0].start===first.start&&n.ranges[0].end===first.end) || (r.questionType === "wh-object" && r.pattern !== "SVO")) fail("特殊疑问原文角色");
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
