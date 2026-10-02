import type { AnalysisResult } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { analyzeClauses } from "./clauses.ts";

export function analyzeCompound(tokens: Token[], punctuation: string | null, result: AnalysisResult, consumeBoundary?: () => boolean): string {
  return analyzeClauses(tokens, punctuation, result, "compound", consumeBoundary);
}
