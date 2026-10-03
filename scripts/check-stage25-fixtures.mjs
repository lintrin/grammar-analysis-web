import {analyzeSentence, applyCorrection} from '../lib/grammar.ts';
import {loadStage25Acceptance, checkStage25Fixture} from '../tests/helpers/stage25-fixtures.mjs';
const acceptance = loadStage25Acceptance();
for (const fixture of acceptance.fixtures) checkStage25Fixture(fixture, analyzeSentence, applyCorrection);
console.log('PASS stage 25: 80 independent correct answers, 15 safe corrections with full controls, 25 refusal controls; classifications, roles, ranges, ownership, reasons, edits and stale rejection.');
