import assert from 'node:assert/strict';
import {stage25PerformanceCases} from './stage25-performance.mjs';
const limit=s=>{assert.ok(s.length<=1000);return s.padEnd(1000,' ');};
export const stage32PerformanceCases=[...stage25PerformanceCases,
 {id:'will-read-many-attributes',status:'complete',input:limit(`Will the ${'clean '.repeat(145)}doctors read the old letter?`)},
 {id:'location-phrase-attributes',status:'complete',input:limit(`The young doctor will wait under the ${'small '.repeat(145)}umbrella.`)},
 {id:'wh-second-frame-many-attributes',status:'complete',input:limit(`Why will the ${'young '.repeat(145)}teachers read?`)},
 {id:'open-second-frame-many-attributes',status:'complete',input:limit(`The ${'clean '.repeat(145)}door is opening.`)},
];
