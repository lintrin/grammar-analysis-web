import type { AnalysisResult, AnalysisReason, ReasonCode, Range } from "./protocol.ts";

/** Called by the rule that detected the failure, never inferred from a message. */
export function diagnose(result: AnalysisResult, code: ReasonCode, ranges: Range[] = [], clauseIndex?: 1 | 2): void {
  result.reasons = [{ code, ranges: ranges.map(q => ({ ...q })), ...(clauseIndex ? { clauseIndex } : {}) }];
}
export function hasReason(result: AnalysisResult, code: ReasonCode): boolean {
  return result.reasons?.some(reason => reason.code === code) ?? false;
}
export function clauseReasons(candidate: AnalysisResult, index: 1 | 2): AnalysisReason[] {
  return (candidate.reasons ?? []).map(reason => ({ ...reason, ranges: reason.ranges.map(q => ({ ...q })), clauseIndex: index }));
}
export const reasonLabels: Record<ReasonCode, string> = {
  "unknown-word": "词典未覆盖", "unsupported-structure": "结构超出范围", "form-mismatch": "形式与规则不匹配",
  punctuation: "标点或多句限制", ambiguous: "无法唯一确定结构", "budget-exceeded": "计算预算已耗尽", "invalid-input": "输入为空或过长",
};
export const budgetMessage = "输入结构过长，超出本地规则的计算预算。";
