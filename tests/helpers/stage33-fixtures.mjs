// Validate authored future answers, not current grammar behavior. No grammar imports.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const normalizeStage33Input = s => s.toLowerCase().replace(/\s+/g,' ').trim();
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function frozenStage33File(path) {
  const bytes=readFileSync(path);
  assert.equal(sha256(bytes),readFileSync(path.replace(/\.json$/,'.sha256'),'utf8').trim(),`Frozen file changed: ${path}`);
  return JSON.parse(bytes);
}
export function validateStage33Expectation(input,e) {
  assert.ok(['complete','partial','unsupported','invalid','ambiguous'].includes(e.status));
  const allowed={purpose:['declarative','interrogative'],pattern:['SVC'],complexity:['simple'],tense:['present','past'],modal:[],questionType:['yes-no','wh-complement'],aspect:['simple'],voice:['active']};
  for(const [k,values] of Object.entries(allowed)) {
    assert.ok(Object.hasOwn(e,k),`Missing ${k}`);
    assert.ok(e[k]===null||values.includes(e[k]),`Invalid ${k}`);
  }
  for(const key of ['nodes','reasons','corrections'])assert.ok(Array.isArray(e[key]));
  const range = q => {
    assert.deepEqual(Object.keys(q).sort(),['end','start']);
    assert.ok(Number.isSafeInteger(q.start)&&Number.isSafeInteger(q.end)&&q.start>=0&&q.end<=input.length&&q.start<q.end);
    for(const p of [q.start,q.end])assert.ok(!(p>0&&p<input.length&&/[\uD800-\uDBFF]/.test(input[p-1])&&/[\uDC00-\uDFFF]/.test(input[p])));
    for(const m of input.matchAll(/\b\w+['’]\w+\b/g))for(const p of [q.start,q.end])assert.ok(p<=m.index||p>=m.index+m[0].length,'Contraction split');
  };
  if(e.status==='complete') {
    assert.equal(e.pattern,'SVC');assert.equal(e.complexity,'simple');assert.equal(e.modal,null);assert.equal(e.aspect,'simple');assert.equal(e.voice,'active');assert.ok(e.tense);assert.ok(e.purpose);
    assert.equal(e.purpose==='interrogative',e.questionType!==null);
    assert.deepEqual(e.reasons,[]);assert.deepEqual(e.corrections,[]);
    const byKey=new Map(e.nodes.map(n=>[n.key,n]));assert.equal(byKey.size,e.nodes.length);
    for(const n of e.nodes){
      assert.equal(n.implicit,false);assert.equal(n.ranges.length,1);n.ranges.forEach(range);
      assert.ok(['subject','verb','complement','attribute'].includes(n.role));assert.ok(typeof n.ruleId==='string'&&n.ruleId.length>0);
      if(n.role==='attribute') {
        const p=byKey.get(n.parentKey);assert.ok(p&&['subject','complement'].includes(p.role));
        assert.ok(p.ranges.some(q=>q.start<=n.ranges[0].start&&q.end>=n.ranges[0].end));
      } else assert.equal(n.parentKey,null);
    }
    const roots=e.nodes.filter(n=>n.parentKey===null);
    for(const role of ['subject','verb','complement'])assert.equal(roots.filter(n=>n.role===role).length,1);
    for(let i=0;i<roots.length;i++)for(let j=i+1;j<roots.length;j++)assert.ok(!roots[i].ranges.some(a=>roots[j].ranges.some(b=>a.start<b.end&&b.start<a.end)),'Overlapping roots');
    if(e.questionType==='wh-complement') {
      const c=roots.find(n=>n.role==='complement');assert.equal(input.slice(c.ranges[0].start,c.ranges[0].end).toLowerCase(),'where');assert.equal(c.ruleId,'WH-COMPLEMENT-001');
    }
  } else {
    for(const key of Object.keys(allowed))assert.equal(e[key],null);assert.deepEqual(e.nodes,[]);assert.ok(e.reasons.length);
    for(const reason of e.reasons){assert.ok(['unknown-word','unsupported-structure','punctuation','form-mismatch'].includes(reason.code));reason.ranges.forEach(range);if(reason.clauseIndex!==undefined)assert.ok([1,2].includes(reason.clauseIndex));if(reason.code==='unknown-word')assert.ok(reason.ranges.length);}
    if(e.status!=='partial')assert.deepEqual(e.corrections,[]);
    for(const c of e.corrections){assert.equal(c.ruleId,'AGREEMENT-001');assert.equal(c.edits.length,1);for(const edit of c.edits){range(edit.range);assert.equal(input.slice(edit.range.start,edit.range.end),edit.expected);assert.notEqual(edit.expected,edit.replacement);}}
  }
}
export function compareStage33Expectation(expected,result) {
  // Strict complete-answer comparison, including every rule ID and parent relation.
  for(const field of ['status','purpose','pattern','complexity','tense','modal','questionType','aspect','voice'])assert.equal(result[field],expected[field],field);
  const canonical=(nodes,key,parent)=>{
    const byKey=new Map(nodes.map(n=>[n[key],n]));
    const signature=n=>JSON.stringify([n.role,n.ranges]);
    return nodes.map(n=>({role:n.role,implicit:n.implicit,ranges:n.ranges,ruleId:n.ruleId,parent:n[parent]===null?null:signature(byKey.get(n[parent]))})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  };
  assert.deepEqual(canonical(result.nodes,'id','parentId'),canonical(expected.nodes,'key','parentKey'));
  assert.deepEqual(result.reasons,expected.reasons);
  assert.deepEqual(result.corrections.map(({ruleId,edits})=>({ruleId,edits})),expected.corrections);
}
