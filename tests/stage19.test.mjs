import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadOriginalFixture, originalFixtureFiles, validateOriginalFixtureSource, validateOriginalFixtureAudit } from './helpers/original-fixtures.mjs';
import { baselineHash, baselineHashes, checkHistoricalIndependence, loadHistoricalBaseline, validateHistoricalBaseline } from './helpers/historical-independence.mjs';
import { validateLexiconExpectation, compareLexiconExpectation } from './helpers/lexicon-expectations.mjs';
import { checkPredicate } from './helpers/predicate-fixtures.mjs';
import { RULE_VERSION } from '../lib/grammar.ts';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const development = read('./fixtures/lexicon-development.json');
const migrations = read('./fixtures/lexicon-migrations.json');
const acceptance18 = read('./fixtures/predicate-acceptance.json');
const acceptance12 = read('./fixtures/stage12.json');
const byId = new Map(development.fixtures.map(f => [f.id, f]));
const originalSources = new Map();
function readOriginalFixture(file) {
  if (!originalSources.has(file)) originalSources.set(file, loadOriginalFixture(file));
  return originalSources.get(file);
}

test('original fixture snapshots retain frozen source hashes without Git history', () => {
  assert.equal(originalFixtureFiles.length, 9);
  for (const file of originalFixtureFiles) assert.ok(loadOriginalFixture(file));
  assert.throws(() => loadOriginalFixture('tests/fixtures/lexicon-development.json'), /Unknown original fixture/);
});

test('a changed original fixture snapshot cannot legitimize a changed migration answer', () => {
  const source = readFileSync(new URL('./baselines/original-fixtures/predicate-acceptance.json', import.meta.url), 'utf8');
  const changed = JSON.parse(source);
  changed.boundaries.find(f => f.id === 'independent-outside-12').status = 'complete';
  assert.throws(() => validateOriginalFixtureSource('tests/fixtures/predicate-acceptance.json', JSON.stringify(changed)), /content hash mismatch/);
});

test('stage 19 retains frozen basis and future scope', () => {
  assert.equal(development.basisRuleVersion, '0.14.3');
  assert.equal(RULE_VERSION, '0.15.0');
  assert.equal(development.status, 'human-fixed-future-expectations');
  assert.equal(development.formatVersion, 1);
  assert.equal(development.fixtures.length, 416);
  assert.equal(byId.size, development.fixtures.length);
  assert.deepEqual(Object.fromEntries([21, 22, 23, 24].map(stage => [stage, development.fixtures.filter(f => f.stage === stage).length])), {21: 240, 22: 53, 23: 57, 24: 66});
});

test('stage 21 declares every noun, adjective and verb with sufficient fixed correct positions and forms', () => {
  const { nouns, adjectives, verbs } = development.vocabulary;
  assert.equal(nouns.length, 30); assert.equal(adjectives.length, 15); assert.equal(verbs.length, 12);
  assert.equal(new Set([...nouns, ...adjectives, ...verbs].map(e => e.id)).size, 57);
  for (const entry of [...nouns, ...adjectives]) {
    assert.ok(['vowel', 'consonant'].includes(entry.initialSound));
    const cases = development.fixtures.filter(f => f.tags.includes(entry.id) && f.kind === 'correct');
    assert.ok(cases.length >= 2, entry.id);
    const positions = new Set(cases.flatMap(f => f.expected.nodes.filter(n => f.input.slice(n.ranges[0].start, n.ranges[0].end).toLowerCase().includes(entry.lemma)).map(n => n.role)));
    assert.ok(positions.size >= 2, entry.id);
    if (Object.hasOwn(entry, 'plural')) {
      assert.equal(typeof entry.person, 'boolean');
      assert.ok(development.fixtures.some(f => f.tags.includes(entry.id) && f.tags.includes('plural') && f.input.includes(entry.plural)));
    }
  }
  assert.deepEqual(new Set(verbs.flatMap(v => v.frames.map(f => f.pattern))), new Set(['SV','SVO','SVOO','SVOC']));
  for (const verb of verbs) {
    assert.equal(verb.forms.base, verb.lemma);
    for (const field of ['base','third','past','participle','progressive']) {
      assert.ok(verb.forms[field]);
      assert.ok(development.fixtures.some(f => f.tags.includes(verb.id) && f.kind === 'correct' && new RegExp(`\\b${verb.forms[field]}\\b`).test(f.input)), `${verb.id}: ${field}`);
    }
    assert.ok(development.fixtures.filter(f => f.tags.includes(verb.id) && f.kind === 'correct').length >= 5);
    for (const frame of verb.frames) {
      assert.equal(frame.progressive, true); assert.equal(frame.perfect, true);
      assert.equal(frame.recipient, frame.pattern === 'SVOO' ? 'person' : null);
      assert.equal(frame.complement, frame.pattern === 'SVOC' ? 'single-adjective' : null);
      assert.equal(frame.passive, frame.pattern === 'SVO' ? 'direct-object' : frame.pattern === 'SVOO' ? 'direct-object-or-recipient' : null);
    }
  }
  assert.ok(development.fixtures.filter(f => f.stage === 21 && f.kind === 'boundary').length >= 30);
  assert.equal(byId.get('lexicon-read-homograph').expected.status, 'ambiguous');
});

test('stage 22 fixes possession, errors and controls separately from auxiliary have', () => {
  const cases = development.fixtures.filter(f => f.stage === 22);
  assert.ok(cases.filter(f => f.kind === 'correct' && !f.id.startsWith('have-control')).length >= 15);
  assert.ok(cases.filter(f => f.kind === 'error').length >= 10);
  assert.ok(cases.filter(f => f.kind === 'boundary').length >= 15);
  assert.equal(byId.get('have-correct-1').expected.aspect, 'simple');
  assert.equal(byId.get('have-auxiliary-control').expected.aspect, 'perfect');
});

test('stage 23 has three fixed answers per whitelist form and both original apostrophes', () => {
  assert.equal(development.contractions.length, 11);
  for (const contraction of development.contractions) {
    const cases = development.fixtures.filter(f => f.stage === 23 && f.tags.includes(contraction));
    assert.equal(cases.length, 3);
    assert.ok(cases.some(f => f.tags.includes('curly'))); assert.ok(cases.some(f => f.tags.includes('straight')));
    for (const f of cases) {
      const text = contraction.replace("'", f.tags.includes('curly') ? '’' : "'");
      const start = f.input.toLowerCase().indexOf(text), end = start + text.length;
      assert.ok(f.expected.nodes.some(n => n.role === 'verb' && n.ranges.some(q => q.start <= start && q.end >= end)));
      assert.equal(f.expected.nodes.some(n => n.ranges.some(q => (q.start > start && q.start < end) || (q.end > start && q.end < end))), false);
    }
  }
  assert.ok(development.fixtures.filter(f => f.stage === 23 && f.kind === 'boundary').length >= 20);
  assert.equal(byId.get('contraction-outside-21').input.codePointAt(0), 0x1f600);
});

test('stage 24 declares twenty error/control pairs and twenty unsafe-edit refusals', () => {
  const cases = development.fixtures.filter(f => f.stage === 24);
  assert.ok(cases.filter(f => f.kind === 'error').length >= 20);
  assert.ok(cases.filter(f => f.kind === 'boundary' && f.tags.includes('no-unsafe-edit')).length >= 20);
  assert.deepEqual(byId.get('predicate-two-errors').steps, ["She doesn't likes books.", "She doesn't like books."]);
  assert.deepEqual(byId.get('predicate-question-control').expected.nodes.find(n => n.role === 'verb').ranges, [{start:0,end:4},{start:10,end:15}]);
});

// Identical correct/control records keep their IDs and references in the manifest.
const futureAnswers = new Map();
for (const f of development.fixtures) {
  const { id, ...answer } = f;
  const key = JSON.stringify(Object.fromEntries(Object.entries(answer).sort(([a], [b]) => a.localeCompare(b))));
  if (!futureAnswers.has(key)) futureAnswers.set(key, { fixture: f, ids: [] });
  futureAnswers.get(key).ids.push(id);
}
for (const { fixture: f, ids } of futureAnswers.values()) test(`stage 19 future answer shape: ${ids.join(', ')}`, () => {
  validateLexiconExpectation(f.input, f.expected);
  if (f.kind === 'error') {
    const control = byId.get(f.controlId);
    assert.equal(control.kind, 'correct'); assert.equal(control.stage, f.stage);
    assert.ok(f.expected.corrections.length > 0);
    assert.equal(f.steps.at(-1), control.input);
    let next = f.input;
    for (const [index, correction] of f.expected.corrections.entries()) {
      // Recompute a shifted range only from preceding declared edits, not parsing.
      const edit = correction.edits[0];
      const shift = f.expected.corrections.slice(0, index).flatMap(c => c.edits).filter(e => e.range.end <= edit.range.start).reduce((n,e) => n+e.replacement.length-e.expected.length, 0);
      const start = edit.range.start + shift;
      assert.equal(next.slice(start,start+edit.expected.length),edit.expected);
      next = next.slice(0,start)+edit.replacement+next.slice(start+edit.expected.length);
      assert.equal(next,f.steps[index]);
    }
  }
});

test('migration audit preserves every old fixed input and associates original source and answer', () => {
  assert.equal(migrations.migrations.length, 65);
  assert.equal(migrations.audit.length, 625);
  validateOriginalFixtureAudit(migrations.audit);
  assert.equal(new Set(migrations.migrations.map(m => m.id)).size, 65);
  const migrationKeys = new Set(migrations.migrations.map(m => `${m.source.file}:${m.source.collection}:${m.source.index}`));
  for (const item of migrations.audit) {
    const source = readOriginalFixture(item.file)[item.collection][item.index];
    assert.equal(item.input,source.input); assert.equal(item.id,source.id??null);
    assert.equal(item.disposition, migrationKeys.has(`${item.file}:${item.collection}:${item.index}`) ? 'migrate' : 'preserve');
  }
  for (const migration of migrations.migrations) {
    const {file,collection,index,id} = migration.source;
    const original = readOriginalFixture(file)[collection][index];
    assert.equal(original.id??null,id); assert.equal(migration.input, original.input);
    assert.deepEqual(migration.originalFixture, original);
    validateLexiconExpectation(migration.input, migration.oldExpected);
    validateLexiconExpectation(migration.input, migration.newExpected);
    assert.ok(migration.reason.length > 10);
    if (migration.control) validateLexiconExpectation(migration.control.input,migration.control.expected);
  }
});

test('migration audit rejects duplicate, missing and unexpected original sources', () => {
  const duplicate = structuredClone(migrations.audit);
  duplicate[0] = structuredClone(duplicate[1]);
  assert.equal(duplicate.length, 625);
  assert.throws(() => validateOriginalFixtureAudit(duplicate), /Duplicate original fixture audit source/);
  assert.throws(() => validateOriginalFixtureAudit(migrations.audit.slice(1)), /sources differ from frozen snapshots/);
  const unexpected = structuredClone(migrations.audit);
  unexpected[0].index = 100000;
  assert.equal(unexpected.length, 625);
  assert.throws(() => validateOriginalFixtureAudit(unexpected), /sources differ from frozen snapshots/);
});

for (const [stage, acceptance] of [[12,acceptance12],[18,acceptance18]]) {
  const cases = [...acceptance.fixtures,...acceptance.boundaries];
  test(`stage ${stage} reused development input is rejected`, () => {
    const baseline = loadHistoricalBaseline(stage);
    const input = baseline.inputs.find(e => /she.*book/.test(e.input)).input;
    assert.throws(() => checkHistoricalIndependence([...cases.slice(0,-1),{input}],stage), /Development input reused/);
  });
  test(`stage ${stage} normalized duplicate acceptance input is rejected`, () => assert.throws(() => checkHistoricalIndependence([...cases,{input:`  ${cases[0].input.toUpperCase()}  `}],stage), /Duplicate independent input/));
  test(`stage ${stage} missing and changed baselines are rejected even if self hash is recomputed`, () => {
    assert.throws(() => validateHistoricalBaseline(null,stage), /Missing/);
    const changed = structuredClone(loadHistoricalBaseline(stage)); changed.inputs.pop();
    assert.throws(() => validateHistoricalBaseline(changed,stage), /hash mismatch/);
    const { contentHash: ignored, ...payload } = changed; void ignored;
    changed.contentHash = baselineHash(payload);
    assert.notEqual(changed.contentHash,baselineHashes[stage]);
    assert.throws(() => validateHistoricalBaseline(changed,stage), /hash changed/);
  });
}

test('migration of an old independent contraction remains independent of its frozen development baseline', () => {
  const migration = migrations.migrations.find(m => m.source.file.endsWith('predicate-acceptance.json') && m.source.id === 'independent-outside-12');
  assert.ok(migration);
  assert.equal(migration.stage, 23);
  assert.equal(migration.newExpected.status, 'complete');
  assert.equal(loadHistoricalBaseline(18).inputs.some(e => e.input === migration.input.toLowerCase()), false);
});

test('historical behavior checker still rejects a wrong fixed classification and raw position', () => {
  const changed = structuredClone(acceptance18.fixtures[0]);
  changed.clauses[0].pattern = 'SVOO';
  assert.throws(() => checkPredicate(changed));
  const position = structuredClone(acceptance18.fixtures[0]); position.clauses[0].parts[0][1] = 'Absent';
  assert.throws(() => checkPredicate(position), /Unaccounted/);
});

test('future checker rejects weakened reason, ownership, classification and edit answers', () => {
  const f = byId.get('predicate-error-1'), result = validateLexiconExpectation(f.input,f.expected);
  for (const mutate of [r=>r.reasons=[], r=>r.corrections[0].edits[0].replacement='had', r=>r.status='unsupported']) {
    const bad=structuredClone(result); mutate(bad); assert.throws(()=>compareLexiconExpectation(f.expected,bad));
  }
  const phrase=byId.get('adjective-happy-attribute'), good=validateLexiconExpectation(phrase.input,phrase.expected);
  const bad=structuredClone(good); bad.nodes.find(n=>n.role==='attribute').parentId=null;
  assert.throws(()=>compareLexiconExpectation(phrase.expected,bad));
});
