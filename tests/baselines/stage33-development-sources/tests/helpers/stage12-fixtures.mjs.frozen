import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export const stage12 = JSON.parse(readFileSync(new URL('../fixtures/stage12.json', import.meta.url), 'utf8'));

// Locate only hand-declared text partitions. No tokenization or linguistic inference.
export function expectedStage12(fixture) {
  if (fixture.expected) return fixture.expected;
  const nodes = [];
  let cursor = 0;
  const locate = text => {
    const start = fixture.input.indexOf(text, cursor);
    assert.ok(start >= cursor && /^\s*$/.test(fixture.input.slice(cursor, start)), `Unaccounted text before ${text}`);
    cursor = start + text.length;
    return { start, end: cursor };
  };
  const multiple = fixture.group !== 'simple';
  const connectorRanges = [];
  if (fixture.group === 'if') connectorRanges.push(locate(fixture.connector[0]));
  for (const [index, clause] of fixture.clauses.entries()) {
    const parentKey = multiple ? `clause-${index + 1}` : null;
    const parts = new Map();
    const start = nodes.length;
    for (const [role, text, attributes = []] of clause.parts) {
      const position = locate(text);
      let node = parts.get(role);
      if (!node || role === 'adverbial') {
        node = { key: `${index}-${role}${node ? `-${nodes.length}` : ''}`, role, parentKey, implicit: false, ranges: [] };
        parts.set(role, node); nodes.push(node);
      } else assert.equal(role, 'verb', 'Only explicitly split verb fragments may share a role');
      node.ranges.push(position);
      let attributeCursor = 0;
      for (const [number, word] of attributes.entries()) {
        const relative = text.indexOf(word, attributeCursor);
        assert.ok(relative >= 0, `Attribute ${word} is absent from ${text}`);
        attributeCursor = relative + word.length;
        nodes.push({ key: `${node.key}-attribute-${number}`, role: 'attribute', parentKey: node.key,
          implicit: false, ranges: [{ start: position.start + relative, end: position.start + attributeCursor }] });
      }
    }
    if (multiple) {
      const kind = fixture.group === 'compound' ? 'independent' : (index === (fixture.group === 'if' ? 1 : 0) ? 'main' : 'subordinate');
      nodes.push({ key: parentKey, role: 'clause', parentKey: null, implicit: false,
        ranges: [{ start: nodes[start].ranges[0].start, end: cursor }],
        clause: { kind, purpose: 'declarative', pattern: clause.pattern, tense: clause.tense, aspect: clause.aspect, voice: clause.voice } });
      if (index === 0) for (const text of fixture.group === 'if' ? fixture.connector.slice(1) : fixture.connector) connectorRanges.push(locate(text));
    }
  }
  assert.match(fixture.input.slice(cursor), /^[.!?]?\s*$/, 'Unaccounted trailing text');
  if (multiple) nodes.push({ key: 'connector', role: 'connector', parentKey: null, implicit: false, ranges: connectorRanges, relation: fixture.relation });
  return { status: 'complete', purpose: fixture.purpose ?? 'declarative', complexity: multiple ? (fixture.group === 'compound' ? 'compound' : 'complex') : 'simple',
    pattern: multiple ? null : fixture.clauses[0].pattern, tense: multiple ? null : fixture.clauses[0].tense, aspect: multiple ? null : fixture.clauses[0].aspect, voice: multiple ? null : fixture.clauses[0].voice, corrections: [], nodes };
}
