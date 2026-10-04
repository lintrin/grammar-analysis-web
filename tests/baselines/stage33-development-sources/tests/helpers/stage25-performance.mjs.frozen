import assert from 'node:assert/strict';
// Hand-selected read/past/participle, her/determiner/object and same-form
// carried/past/participle candidates; substantive modifiers approach the limit.
const limit = input => { assert.ok(input.length <= 1000); return input.padEnd(1000, ' '); };
export const stage25PerformanceCases = [
  {id:'read-her-question',status:'complete',input:limit(`Have the ${'young '.repeat(145)}nurses read her old books?`)},
  {id:'recipient-her',status:'complete',input:limit(`The artist has taught her the ${'small '.repeat(145)}children.`)},
  {id:'carried-her-passive',status:'complete',input:limit(`The ${'empty '.repeat(145)}chairs are carried by her.`)},
  {id:'read-mixed-ambiguity',status:'ambiguous',input:limit(`The ${'young '.repeat(70)}nurses read her books and the ${'small '.repeat(70)}children are laughing.`)},
];
