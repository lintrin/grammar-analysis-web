import type { AnalysisResult } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { analyzeClauses } from "./clauses.ts";

/** One postposed because clause or one preposed if clause with a required comma. */
export function analyzeComplex(tokens: Token[], punctuation: string | null, result: AnalysisResult, consumeBoundary?: () => boolean): string {
  return analyzeClauses(tokens, punctuation, result, tokens.some(t => t.normalized === "if") ? "condition" : "cause", consumeBoundary);
}
