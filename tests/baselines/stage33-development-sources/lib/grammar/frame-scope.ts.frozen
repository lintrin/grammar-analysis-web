import matrix from "../../data/grammar/stage30-capabilities.json" with { type: "json" };
import type { Token } from "./tokens.ts";
import { nounCandidate, subjectPronouns, type VerbFrame } from "./vocabulary.ts";
const scopes: Record<string,{entryId:string;subject:string;allowProgressive:boolean;allowPerfect:boolean}> = matrix.frames;
export function isSecondFrame(v: VerbFrame): boolean { return Object.hasOwn(scopes,v.frameId) && scopes[v.frameId].entryId === v.entryId; }
/** Teaching sense constraints belong to the chosen frame, never a lemma's first entry. */
export function secondFrameSubjectPermits(v: VerbFrame,tokens: Token[]): boolean {
  if(!isSecondFrame(v))return true;
  const scope=scopes[v.frameId];
  const first=tokens[0]?.normalized;
  if(['who','what'].includes(first))return scope.subject==='person'?first==='who':first==='what';
  const auxiliaries=['do','does','did','can','will','am','is','are','was','were','have','has','had'];
  const start=['where','when','why'].includes(first)?2:auxiliaries.includes(first)?1:0;
  const lexical=tokens.findIndex((t,i)=>i>start&&[v.base,v.third,v.past,v.participle,v.progressive].includes(t.normalized));
  if(lexical<0)return false;
  const finite=tokens.findIndex((t,i)=>i>start&&i<lexical&&auxiliaries.includes(t.normalized));
  const end=finite>=0?finite:lexical;
  const head=tokens[end-1];
  if(!head)return false;
  if(scope.subject==='person')return end===start+1&&subjectPronouns.has(head.normalized)&&head.normalized!=='it'||nounCandidate(head)?.person===true;
  return end===start+1&&head.normalized==='it'||['door','doors','window','windows'].includes(head.normalized)&&!!nounCandidate(head);
}
