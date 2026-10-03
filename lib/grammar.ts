/** Hand-authored local rules; public API retained across internal rule modules. */
import { RULE_VERSION, MAX_INPUT_LENGTH, validateAnalysisResult, type AnalysisResult } from "./grammar/protocol.ts";
import { tokenize, isWordToken } from "./grammar/tokens.ts";
import { knownWords, LEXICON_VERSION, LEXICON_HASH } from "./grammar/vocabulary.ts";
import { analyzePurpose } from "./grammar/purposes.ts";
import { analyzeComplex } from "./grammar/complex.ts";
import { analyzeCompound } from "./grammar/compound.ts";
import { diagnose } from "./grammar/feedback.ts";

export { RULE_VERSION, MAX_INPUT_LENGTH, validateAnalysisResult } from "./grammar/protocol.ts";
export type { Range, Role, Purpose, Pattern, Tense, Aspect, Voice, ComponentNode, Correction, AnalysisResult, AnalysisReason, ReasonCode } from "./grammar/protocol.ts";
export { tokenize } from "./grammar/tokens.ts";
export type { Token } from "./grammar/tokens.ts";
export { VOCABULARY, LEXICON_VERSION, LEXICON_HASH } from "./grammar/vocabulary.ts";

/** Apply one current suggestion atomically. Never trust stale positions or edited text. */
export function applyCorrection(result: AnalysisResult, id: string, input: string, inputVersion: number): string {
  validateAnalysisResult(result);
  if (result.inputVersion !== inputVersion || result.input !== input || result.ruleVersion !== RULE_VERSION || result.lexiconVersion !== LEXICON_VERSION || result.lexiconHash !== LEXICON_HASH) throw new Error("建议已过期，请重新分析。");
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
    input, inputVersion, ruleVersion: RULE_VERSION, lexiconVersion: LEXICON_VERSION, lexiconHash: LEXICON_HASH, status: "unsupported", purpose: null,
    pattern: null, complexity: null, tense: null, aspect: null, voice: null, nodes: [], corrections: [], reasons: [],
    messages: ["当前仅分析闭合词典内的五种句型、四种简单句用途、现在/过去进行时与完成时、限定被动及三种常用谓语组合，陈述结构可用于两个完整分句的 and/but、后置无逗号 because、前置带逗号 if；自动纠错仅覆盖原有简单句的主谓一致、do/does/did 后原形及 can 后原形，新谓语组合暂不提供自动纠错。"],
  };
  const finish = (message?: string) => {
    if (message) result.messages.unshift(message);
    validateAnalysisResult(result);
    return result;
  };
  if (!input.trim() || input.length > MAX_INPUT_LENGTH) {
    result.status = "invalid";
    diagnose(result, "invalid-input");
    return finish(!input.trim() ? "请输入一个英文句子。" : "输入超过 1000 个 UTF-16 字符，请缩短后重试。");
  }
  const tokens = tokenize(input);
  const terminals = tokens.filter(t => /[.!?]/.test(t.text));
  if (terminals.length > 1 || (terminals.length && terminals[0] !== tokens.at(-1))) {
    result.status = "invalid";
    diagnose(result, "punctuation");
    return finish("每次只能分析一个句子，请检查句末标点。");
  }
  const punctuation = terminals[0]?.text ?? null;
  if (punctuation) tokens.pop();
  if (tokens.some(t => ["because", "if"].includes(t.normalized))) return finish(analyzeComplex(tokens, punctuation, result));
  if (tokens.some(t => ["and", "but"].includes(t.normalized))) return finish(analyzeCompound(tokens, punctuation, result));
  if (tokens.some(t => !isWordToken(t))) {
    diagnose(result, "punctuation");
    return finish("本阶段支持英文单词和可选的句末句号、问号或感叹号；其他符号尚未支持。");
  }
  const unknown = [...new Set(tokens.filter(t => !knownWords.has(t.normalized)).map(t => t.text))];
  if (unknown.length) {
    diagnose(result, "unknown-word", tokens.filter(t => !knownWords.has(t.normalized)).map(({ start, end }) => ({ start, end })));
    return finish(`词典尚未覆盖：${unknown.join("、")}。请参照页面例句和限定词汇范围；未覆盖不表示句子有语法错误。无法可靠分析此句。`);
  }
  const purposeMessage = analyzePurpose(tokens, punctuation, result);
  return finish(purposeMessage);
}

export function getAnalysisIdentity(): string { return `${RULE_VERSION}/${LEXICON_VERSION}/${LEXICON_HASH}`; }
