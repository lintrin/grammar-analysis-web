import { migrateClassification } from "./classification-migration.mjs";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export const stage9 = JSON.parse(readFileSync(new URL('../fixtures/stage9.json', import.meta.url), 'utf8'));
export function compareStage9(expected, result, checkCorrections = true) {
  expected=migrateClassification(expected,result.input);
  for (const field of ['status', 'purpose', 'pattern', 'complexity', 'tense', 'modal', 'questionType', 'aspect', 'voice']) assert.equal(result[field], expected[field], `${result.input}: ${field}`);
  const canonical = (nodes, keyField, parentField) => {
    const byKey = new Map(nodes.map(n => [n[keyField], n]));
    const signature = n => `${n.role}:${JSON.stringify(n.ranges)}`;
    return nodes.map(n => ({ role: n.role, ranges: n.ranges, implicit: n.implicit,
      parent: n[parentField] === null ? null : signature(byKey.get(n[parentField])),
      clause: n.clause ?? null, relation: n.relation ?? null })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  };
  assert.deepEqual(canonical(result.nodes, 'id', 'parentId'), canonical(expected.nodes, 'key', 'parentKey'), `${result.input}: nodes and ownership`);
  if (checkCorrections) assert.deepEqual(result.corrections, expected.corrections);
}
