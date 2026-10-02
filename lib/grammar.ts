/** Hand-authored local rules; public API retained across internal rule modules. */
import { RULE_VERSION, MAX_INPUT_LENGTH, validateAnalysisResult, type AnalysisResult } from "./grammar/protocol.ts";
import { tokenize } from "./grammar/tokens.ts";
import { knownWords } from "./grammar/vocabulary.ts";
import { analyzePurpose } from "./grammar/purposes.ts";

export { RULE_VERSION, MAX_INPUT_LENGTH, validateAnalysisResult } from "./grammar/protocol.ts";
export type { Range, Role, ComponentNode, Correction, AnalysisResult } from "./grammar/protocol.ts";
export { tokenize } from "./grammar/tokens.ts";
export type { Token } from "./grammar/tokens.ts";
export { VOCABULARY } from "./grammar/vocabulary.ts";

/** Apply one current suggestion atomically. Never trust stale positions or edited text. */
export function applyCorrection(result: AnalysisResult, id: string, input: string, inputVersion: number): string {
  validateAnalysisResult(result);
  if (result.inputVersion !== inputVersion || result.input !== input || result.ruleVersion !== RULE_VERSION) throw new Error("建议已过期，请重新分析。");
  const correction = result.corrections.find(c => c.id === id);
  if (!correction) throw new Error("修改建议不存在。");
  let next = input;
  for (const edit of [...correction.edits].sort((a, b) => b.range.start - a.range.start)) {
    next = next.slice(0, edit.range.start) + edit.replacement + next.slice(edit.range.end);
  }
  return next;
}

/** No network, storage, logging, or mutation. All positions refer to the original UTF-16 string. */
export function analyzeSentence(input: string, inputVersion = 0): AnalysisResult {
  const result: AnalysisResult = {
    input, inputVersion, ruleVersion: RULE_VERSION, status: "unsupported", purpose: null,
    pattern: null, complexity: null, tense: null, nodes: [], corrections: [],
    messages: ["当前仅分析词典及规则覆盖的五种句型与四种用途；纠错仅覆盖主谓一致、do/does/did 后原形及 can 后原形。"],
  };
  const finish = (message?: string) => {
    if (message) result.messages.unshift(message);
    validateAnalysisResult(result);
    return result;
  };
  if (!input.trim() || input.length > MAX_INPUT_LENGTH) {
    result.status = "invalid";
    return finish(!input.trim() ? "请输入一个英文句子。" : "输入超过 1000 个 UTF-16 字符，请缩短后重试。");
  }
  const tokens = tokenize(input);
  const terminals = tokens.filter(t => /[.!?]/.test(t.text));
  if (terminals.length > 1 || (terminals.length && terminals[0] !== tokens.at(-1))) {
    result.status = "invalid";
    return finish("每次只能分析一个句子，请检查句末标点。");
  }
  const punctuation = terminals[0]?.text ?? null;
  if (punctuation) tokens.pop();
  if (tokens.some(t => !/^[A-Za-z]+$/.test(t.text))) {
    return finish("本阶段支持英文单词和可选的句末句号、问号或感叹号；其他符号尚未支持。");
  }
  const unknown = [...new Set(tokens.filter(t => !knownWords.has(t.normalized)).map(t => t.text))];
  if (unknown.length) return finish(`词典尚未覆盖：${unknown.join("、")}。无法可靠分析此句。`);
  const purposeMessage = analyzePurpose(tokens, punctuation, result);
  return finish(purposeMessage);
}
