import assert from 'node:assert/strict';
import { analyzeSentence, tokenize, validateAnalysisResult } from '../../lib/grammar.ts';
import { analyzePurpose } from '../../lib/grammar/purposes.ts';
import { analyzeClauses } from '../../lib/grammar/clauses.ts';
import { createBoundaryBudget } from '../../lib/grammar/context.ts';

const nearLimit = text => { assert.ok(text.length <= 1000); return text.padEnd(1000, ' '); };
export const performanceCases = [
  { id: '1000-simple-attributes', input: nearLimit(`The ${'small '.repeat(160)}children run.`), status: 'complete' },
  { id: '1000-double-object-boundaries', input: nearLimit(`Our teacher gave the ${'small '.repeat(150)}boys a good gift.`), status: 'complete' },
  { id: '1000-can-subject-boundaries', input: nearLimit(`Can the ${'small '.repeat(150)}children give the girls a new book?`), status: 'complete' },
  { id: '1000-if-shared-budget', input: nearLimit(`If the ${'small '.repeat(150)}children do not give her a gift, our mother smiles.`), status: 'complete' },
  { id: '1000-repeated-connectors', input: nearLimit('and '.repeat(249)), status: 'unsupported' },
  { id: '1000-rejected-verb-boundaries', input: nearLimit(`She ${'give '.repeat(190)}him a book.`), status: 'unsupported' },
];

export function instrumentBoundaries(input, limit = 4000) {
  const result = { ...analyzeSentence('She sleeps.'), input, status: 'unsupported', purpose: null, pattern: null, complexity: null, tense: null, aspect: null, voice: null, nodes: [], corrections: [], reasons: [] };
  const tokens = tokenize(input);
  const punctuation = /[.!?]/.test(tokens.at(-1).text) ? tokens.pop().text : null;
  const spend = createBoundaryBudget(limit);
  let attempts = 0, accepted = 0;
  const consume = () => { attempts++; const success = spend(); if (success) accepted++; return success; };
  const conditional = tokens.some(t => t.normalized === 'if');
  const causal = tokens.some(t => t.normalized === 'because');
  const compound = tokens.some(t => ['and', 'but'].includes(t.normalized));
  const message = conditional || causal || compound ? analyzeClauses(tokens, punctuation, result, conditional ? 'condition' : causal ? 'cause' : 'compound', consume)
    : analyzePurpose(tokens, punctuation, result, consume);
  result.messages = [message];
  validateAnalysisResult(result);
  return { result, attempts, accepted };
}

export const exhaustedCases = [
  { input: 'Our teacher gave her a new picture.', limit: 0 },
  { input: 'Our father smiled and their teacher gave her a new picture.', limit: 0, clauseIndex: 1 },
  { input: 'Our father smiled because their teacher gave her a new picture.', limit: 0, clauseIndex: 1 },
  { input: 'If our father smiled, their teacher gave her a new picture.', limit: 0, clauseIndex: 1 },
];
