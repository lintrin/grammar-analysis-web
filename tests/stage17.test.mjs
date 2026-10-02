import test from 'node:test';
import { development, checkPredicate, checkBoundary } from './helpers/predicate-fixtures.mjs';
for (const fixture of development.fixtures.filter(f => f.stage === 17)) test(`stage 17 ${fixture.id}`, () => checkPredicate(fixture));
for (const fixture of development.boundaries.filter(f => f.stage === 17)) test(`stage 17 ${fixture.id}`, () => checkBoundary(fixture));
