import assert from 'node:assert/strict';
const limit = input => { assert.ok(input.length <= 1000); return input.padEnd(1000,' '); };
export const predicatePerformanceCases = [
  { id:'progressive-subject',stage:14,category:'progressive',input:limit(`The ${'small '.repeat(155)}children are running.`) },
  { id:'perfect-double-object',stage:15,category:'perfect',input:limit(`Our teacher has given the ${'small '.repeat(145)}girls a useful book.`) },
  { id:'passive-agent',stage:16,category:'passive',input:limit(`The useful book was given to her by the ${'young '.repeat(145)}teachers.`) },
  { id:'perfect-progressive-question',stage:17,category:'perfect-progressive',input:limit(`Have the ${'young '.repeat(145)}teachers been showing her an old book?`) },
  { id:'perfect-passive-recipient',stage:17,category:'perfect-passive',input:limit(`Our teacher has been offered the ${'small '.repeat(145)}books by her.`) },
  { id:'progressive-passive-agent',stage:17,category:'progressive-passive',input:limit(`The old book is being sent to the girl by the ${'kind '.repeat(160)}teachers.`) },
  { id:'mixed-clause-budget',stage:18,category:'mixed',input:limit(`If the ${'small '.repeat(75)}books had been given to her, the ${'young '.repeat(65)}girl was being offered a pen.`) },
];
