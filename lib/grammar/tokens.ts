import type { Range } from "./protocol.ts";

export type Token = Range & { text: string; normalized: string; lexiconChoice?: string; finiteTense?: "present" | "past" };
export function tokenize(input: string): Token[] {
  return Array.from(input.matchAll(/[A-Za-z]+|[^\s]/gu), match => ({
    text: match[0], normalized: match[0].toLowerCase(),
    start: match.index!, end: match.index! + match[0].length,
  }));
}
