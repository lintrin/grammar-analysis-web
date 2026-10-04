import { readFileSync } from 'node:fs';
import { RULE_VERSION } from '../lib/grammar.ts';
import { development, checkPredicate, checkBoundary } from '../tests/helpers/predicate-fixtures.mjs';
const acceptance = JSON.parse(readFileSync(new URL('../tests/fixtures/predicate-acceptance.json',import.meta.url),'utf8'));
const review = JSON.parse(readFileSync(new URL('../tests/fixtures/predicate-review.json',import.meta.url),'utf8'));
const groups = {};
for (const fixture of acceptance.fixtures) {
  checkPredicate(fixture);
  groups[fixture.category] = (groups[fixture.category] ?? 0) + 1;
}
for (const fixture of acceptance.boundaries) checkBoundary(fixture);
for (const fixture of development.fixtures) checkPredicate(fixture);
for (const fixture of development.boundaries) checkBoundary(fixture);
for (const fixture of review.fixtures) checkPredicate(fixture);
for (const fixture of review.boundaries) checkBoundary(fixture);
console.log(JSON.stringify({ ruleVersion: RULE_VERSION, independentCorrect: acceptance.fixtures.length, independentContrasts: acceptance.boundaries.length,
  groups, developmentCorrect: development.fixtures.length, developmentBoundaries: development.boundaries.length,
  reviewCorrect: review.fixtures.length, reviewBoundaries: review.boundaries.length, failures: 0 },null,2));
