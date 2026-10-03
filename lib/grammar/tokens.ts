import type { Range } from "./protocol.ts";

const negativeContractions: Record<string, string> = {
  "don't": "do", "doesn't": "does", "didn't": "did", "isn't": "is", "aren't": "are",
  "wasn't": "was", "weren't": "were", "can't": "can", "haven't": "have", "hasn't": "has", "hadn't": "had",
};
export type Token = Range & { text: string; normalized: string; contraction?: { auxiliary: string; apostrophe: "'" | "’" }; lexiconChoice?: string; finiteTense?: "present" | "past" };
export function isWordToken(token: Token): boolean {
  return !!token.contraction || /^[A-Za-z]+$/.test(token.text);
}
export function contractNegativeAuxiliary(auxiliary: string, apostrophe: "'" | "’"): string | undefined {
  return Object.entries(negativeContractions).find(([, word]) => word === auxiliary)?.[0].replace("'", apostrophe);
}
export function tokenize(input: string): Token[] {
  return Array.from(input.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*|[^\s]/gu)).flatMap(match => {
    const text = match[0], normalized = text.toLowerCase();
    const token = { text, normalized, start: match.index!, end: match.index! + text.length };
    const key = normalized.replace("’", "'");
    const auxiliary = Object.hasOwn(negativeContractions, key) ? negativeContractions[key] : undefined;
    if (!auxiliary) return [token];
    const contraction = { auxiliary, apostrophe: (text.includes("’") ? "’" : "'") as "'" | "’" };
    // Virtual grammar tokens share the full original token; never expand input or offsets.
    return [{ ...token, normalized: auxiliary, contraction }, { ...token, normalized: "not", contraction }];
  });
}
