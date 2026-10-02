import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareStage9 } from './stage9-fixtures.mjs';
import { stage10b } from './stage10b-fixtures.mjs';
export const stage10a = JSON.parse(readFileSync(new URL('../fixtures/stage10a.json', import.meta.url), 'utf8'));
export function compareStage10a(expected, result) {
  const migration = stage10a.fixtures.find(f => f.input === result.input)?.migration;
  if (migration && result.ruleVersion.localeCompare(migration.targetRuleVersion, 'en', { numeric: true }) >= 0) {
    const target = stage10b.fixtures.find(f => f.id === migration.fixtureId);
    assert.equal(target.input, result.input);
    return compareStage9(target.expected, result);
  }
  return compareStage9(expected, result);
}
