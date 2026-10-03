import type { AnalysisResult } from "./protocol.ts";
import { contractNegativeAuxiliary, type Token } from "./tokens.ts";

export function suggest(result: AnalysisResult, token: Token, replacement: string, ruleId: string, reason: string) {
  const original = token.text;
  if (token.contraction) {
    // Edit the whole contraction and retain its negative polarity and apostrophe.
    const contracted = contractNegativeAuxiliary(replacement, token.contraction.apostrophe);
    if (token.normalized === "not" || !contracted) return;
    replacement = contracted;
  }
  const text = original === original.toUpperCase() ? replacement.toUpperCase()
    : /^[A-Z]/.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  result.corrections.push({ id: `correction-${result.corrections.length + 1}`, ruleId, reason,
    context: "仅适用于当前词典和完整匹配的简单句结构；不检查语义或复杂时态。",
    edits: [{ range: { start: token.start, end: token.end }, expected: original, replacement: text }] });
}
