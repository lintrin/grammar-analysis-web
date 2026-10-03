import { readFileSync } from "node:fs";
const migrations=JSON.parse(readFileSync(new URL("../fixtures/structure-migrations.json",import.meta.url))).migrations;
export const migratedBehavior = input => migrations.find(m=>m.input===input);
// Explicit protocol migration of frozen historical answers. No analyzer imports;
// original source bytes/hashes remain unchanged. Only new classification fields
// are added; roles, ranges, tense, status, edits and provenance are preserved.
export function migrateClassification(expected, input) {
  expected=migratedBehavior(input)?.expected ?? expected;
  const modalFor = nodes => nodes.some(n=>n.role==='verb'&&n.ranges.some(q=>/\bcan(?:not)?\b|\bcan['’]t\b/i.test(input.slice(q.start,q.end))))?'can':null;
  const nodes=expected.nodes.map(n=>n.clause?{...n,clause:{...n.clause,questionType:Object.hasOwn(n.clause,'questionType')?n.clause.questionType:n.clause.purpose==='interrogative'?'yes-no':null,modal:Object.hasOwn(n.clause,'modal')?n.clause.modal:modalFor(expected.nodes.filter(p=>p.parentKey===n.key))}}:n);
  return {...expected,questionType:Object.hasOwn(expected,'questionType')?expected.questionType:expected.status==='complete'&&expected.purpose==='interrogative'?'yes-no':null,modal:Object.hasOwn(expected,'modal')?expected.modal:expected.status==='complete'&&expected.complexity==='simple'?modalFor(nodes):null,nodes};
}
