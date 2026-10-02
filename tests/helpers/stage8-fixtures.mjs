import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareStage9 } from './stage9-fixtures.mjs';
const fixtures = JSON.parse(readFileSync(new URL("../fixtures/stage8.json", import.meta.url), "utf8")).fixtures;
export function compareStage8Input(input, result) {
  const fixture = fixtures.find(f => f.input === input);
  assert.ok(fixture, input);
  compare(input, fixture.expected, result);
}


const canonicalNodes = nodes => nodes.map(n => ({ role: n.role, parentRole: n.parentKey === null ? null : nodes.find(p => p.key === n.parentKey)?.role,
  implicit: n.implicit, ranges: n.ranges })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
export const compare = (input, expected, result) => {
  assert.equal(result.status, expected.status, input);
  for (const field of ['purpose', 'pattern', 'complexity', 'tense', 'aspect', 'voice']) assert.equal(result[field], expected[field], `${input}: ${field}`);
  if (expected.complexity === 'compound' || expected.complexity === 'complex') return compareStage9(expected, result);
  const nodes = result.nodes.map(n => ({ ...n, key: n.id, parentKey: n.parentId }));
  assert.deepEqual(canonicalNodes(nodes), canonicalNodes(expected.nodes), `${input}: nodes`);
  assert.deepEqual(result.corrections.map(c => ({ ruleId: c.ruleId, edits: c.edits })), expected.corrections, `${input}: corrections`);
};
