import { readFileSync } from 'node:fs';
import { compareStage9 } from './stage9-fixtures.mjs';
export const stage10b = JSON.parse(readFileSync(new URL('../fixtures/stage10b.json', import.meta.url), 'utf8'));
export const compareStage10b = compareStage9;
