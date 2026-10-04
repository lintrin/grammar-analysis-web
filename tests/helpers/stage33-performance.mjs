import assert from 'node:assert/strict';
import {stage32PerformanceCases} from './stage32-performance.mjs';
// Human-selected before execution; no analyzer-derived expected statuses.
const limit = input => {assert.ok(input.length <= 1000);return input.padEnd(1000,' ');};
export const stage33NewPerformanceCases = [
 {id:'be-location-long-subject',status:'complete',input:limit(`The ${'small '.repeat(145)}books are under the table.`)},
 {id:'be-location-long-complement',status:'complete',input:limit(`The book was near the ${'empty '.repeat(145)}chairs.`)},
 {id:'negative-location-long-complement',status:'complete',input:limit(`The bags aren't on the ${'small '.repeat(145)}table.`)},
 {id:'question-location-long-subject',status:'complete',input:limit(`Were the ${'small '.repeat(145)}bags in the buses?`)},
 {id:'where-long-subject',status:'complete',input:limit(`Where are the ${'small '.repeat(145)}books?`)},
 {id:'location-agreement-long-complement',status:'partial',input:limit(`The books is under the ${'small '.repeat(145)}chair.`)},
];
export const stage33PerformanceCases=[...stage32PerformanceCases,...stage33NewPerformanceCases];
