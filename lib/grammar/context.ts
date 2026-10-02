import type { AnalysisResult } from "./protocol.ts";

/** Isolate tentative nodes and edits; a rejected purpose must not leak suggestions. */
export function forkCandidate(result: AnalysisResult): AnalysisResult {
  return { ...result, nodes: [], corrections: [], reasons: [], messages: [...result.messages] };
}

/** Preserve the existing SVOO boundary limit; reusable by future frame rules. */
export function createBoundaryBudget(limit = 4000): () => boolean {
  let remaining = limit;
  return () => --remaining >= 0;
}
