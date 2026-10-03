import test from 'node:test';
import { checkHistoricalIndependence } from './helpers/historical-independence.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSentence, validateAnalysisResult, tokenize, RULE_VERSION } from '../lib/grammar.ts';
import { analyzePurpose } from '../lib/grammar/purposes.ts';
import { analyzeClauses } from '../lib/grammar/clauses.ts';
import { checkPredicate, checkBoundary } from './helpers/predicate-fixtures.mjs';
import { adjectives } from '../lib/grammar/vocabulary.ts';
import { predicatePerformanceCases } from './helpers/predicate-performance.mjs';
const acceptance = JSON.parse(readFileSync(new URL('./fixtures/predicate-acceptance.json', import.meta.url), 'utf8'));
test('stage 18 has 60 independent fixed answers, ten per capability, and 30 new contrasts', () => {
  assert.equal(acceptance.ruleVersion, "0.14.3");
  assert.equal(RULE_VERSION, "0.18.0");
  assert.equal(acceptance.fixtures.length, 60); assert.equal(acceptance.boundaries.length, 30);
  for (const category of ['progressive','perfect','passive','perfect-progressive','perfect-passive','progressive-passive']) assert.equal(acceptance.fixtures.filter(f => f.category === category).length,10);
  checkHistoricalIndependence([...acceptance.fixtures, ...acceptance.boundaries], 18);
});
for (const fixture of acceptance.fixtures) test(`stage 18 ${fixture.id}`, () => checkPredicate(fixture));
for (const fixture of acceptance.boundaries) test(`stage 18 ${fixture.id}`, () => checkBoundary(fixture));

function instrument(input, limit) {
  const result = { ...analyzeSentence('unknown'), input, messages: [] };
  const tokens = tokenize(input); const punctuation = /[.!?]/.test(tokens.at(-1).text) ? tokens.pop().text : null;
  let attempts = 0;
  const consume = () => ++attempts <= limit;
  const kind = tokens[0].normalized === 'if' ? 'condition' : tokens.some(t => t.normalized === 'because') ? 'cause' : tokens.some(t => ['and','but'].includes(t.normalized)) ? 'compound' : null;
  const message = kind ? analyzeClauses(tokens,punctuation,result,kind,consume) : analyzePurpose(tokens,punctuation,result,consume);
  result.messages = [message]; validateAnalysisResult(result); return { result, attempts };
}
for (const input of ['She is sleeping.','Has she given him books?','The book is being given to her by him.','She sleeps and he has been running.','She smiles because he has been running.','If she sleeps, he has been running.']) test(`stage 18 budget exhaustion discards the entire candidate: ${input}`, () => {
  const { result, attempts } = instrument(input,0);
  assert.equal(attempts,1); assert.equal(result.status,'unsupported'); assert.equal(result.reasons[0].code,'budget-exceeded');
  assert.deepEqual(result.nodes,[]); assert.deepEqual(result.corrections,[]);
  for (const field of ['pattern','tense','aspect','voice']) assert.equal(result[field],null);
});
for (const input of ['The small children have been running.','Our teacher has been giving the young boys an old book.','Have the young teachers been showing her a useful book?','The old book is being given to the young girl by the kind teacher.','If the books had been given to her, she was being offered a pen.']) test(`stage 18 exact input limit and deterministic original positions: ${input}`, () => {
  const padded = input.padEnd(1000,' '), result = analyzeSentence(padded);
  assert.equal(result.status,'complete'); validateAnalysisResult(result);
  assert.equal(instrument(padded,4000).result.status,'complete');
  assert.equal(analyzeSentence(padded+' ').status,'invalid');
  assert.deepEqual(analyzeSentence(padded),result);
});
test('stage 18 ambiguity across perfect copula and perfect passive remains uncertain', () => {
  adjectives.add('seen');
  try {
    const result=analyzeSentence('It has been seen.'); assert.equal(result.status,'ambiguous');
    assert.deepEqual(result.nodes,[]); assert.deepEqual(result.corrections,[]);
  } finally { adjectives.delete('seen'); }
});
for (const fixture of predicatePerformanceCases) test(`stage 18 substantive 1000-character performance input: ${fixture.id}`, () => {
  assert.equal(fixture.input.length,1000);
  const result = analyzeSentence(fixture.input);
  assert.equal(result.status,'complete'); assert.deepEqual(result.corrections,[]);
  const { result: bounded, attempts } = instrument(fixture.input,4000);
  assert.ok(attempts <= 4000); assert.deepEqual(bounded.nodes,result.nodes);
  assert.equal(analyzeSentence(fixture.input+' ').status,'invalid');
});
