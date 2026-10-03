import type { AnalysisResult, Purpose } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { selectedVerb, isPossession, whMarkers, locationMarkers, determiners, adjectives, nounCandidate } from "./vocabulary.ts";
import { nounPhrase } from "./phrases.ts";
import { analyzeDeclarative } from "./simple.ts";
import { forkCandidate } from "./context.ts";
import { diagnose, hasReason, budgetMessage } from "./feedback.ts";

type Parse=(tokens:Token[],punctuation:string|null,result:AnalysisResult,consume:()=>boolean,record:(purpose:Purpose)=>void)=>string;
/** WH words are original token references, never fictitious subjects or objects. */
export function analyzeWh(tokens:Token[],punctuation:string|null,result:AnalysisResult,consume:()=>boolean,record:(purpose:Purpose)=>void,parse:Parse):string|null {
  const wh=tokens[0]?.normalized;
  if(tokens[0]?.whSubject || !whMarkers.has(wh))return null;
  // Preserve the established full what exclamation, including punctuation handling.
  if(wh==='what' && !tokens.some(t=>['can','will'].includes(t.normalized)) && (determiners.has(tokens[1]?.normalized)||adjectives.has(tokens[1]?.normalized)||(tokens[1]&&nounCandidate(tokens[1]))))return null;
  record('interrogative');diagnose(result,'unsupported-structure');
  const unsupported='首批特殊疑问仅支持肯定单简单句的主语、直接宾语或限定状语提问；不支持其它谓语链、强调 do 或需要语境的重排。';
  if(punctuation&&punctuation!=='?'){diagnose(result,'punctuation');return unsupported;}
  if(tokens.some(t=>t.normalized==='not'||t.contraction))return unsupported;
  // Location tails are outside every WH type, including modal subject questions.
  if(tokens.some(t=>locationMarkers.has(t.normalized)))return unsupported;
  if(!consume()){diagnose(result,'budget-exceeded');return budgetMessage;}
  const aux=tokens[1]?.normalized;
  let inverted=['do','does','did','can','will'].includes(aux);
  if(['who','what'].includes(wh)&&['can','will'].includes(aux)&&!tokens.some((t,i)=>i>=3&&selectedVerb(t)&&nounPhrase(tokens,2,i)))inverted=false;
  const adverbial=['where','when','why'].includes(wh);
  if(adverbial&&!inverted)return unsupported;
  if(wh==='when'&&tokens.some(t=>['today','yesterday'].includes(t.normalized)))return unsupported;
  const candidate=forkCandidate(result);
  // The direct object precedes a trailing time adverbial in the core order.
  // Move only token references: all nodes and edits keep their original offsets.
  const end=['today','yesterday'].includes(tokens.at(-1)?.normalized??'')?tokens.length-1:tokens.length;
  const ordered=inverted&&!adverbial
    ? [...tokens.slice(1,end),{...tokens[0],whObject:true},...tokens.slice(end)]
    : inverted?tokens.slice(1):[{...tokens[0],whSubject:true},...tokens.slice(1)];
  // Non-modal subject questions go directly through simple active frames.
  // Composed predicates must not leak partial form diagnostics across WH scope.
  const message=!inverted&&!['can','will'].includes(aux)
    ? analyzeDeclarative(ordered,candidate,consume)
    : parse(ordered,inverted?punctuation:'.',candidate,consume,record);
  if(hasReason(candidate,'budget-exceeded')){result.reasons=candidate.reasons;return budgetMessage;}
  const lexical=tokens.slice(inverted?2:1).map(t=>selectedVerb(t)).find(Boolean);
  if(!lexical||!['SV','SVO'].includes(lexical.pattern)||(!adverbial&&inverted&&lexical.pattern!=='SVO')||(isPossession(lexical)&&['can','will'].includes(aux))||(wh==='where'&&!lexical.fixedTail?.startsWith('location:')))return unsupported;
  if(candidate.status==='partial'){
    if(inverted && candidate.corrections.length>1)return unsupported;
    // WH subject agreement may depend on plural context; do not force singular.
    if(!inverted||candidate.corrections.length!==1)candidate.corrections=[];
    Object.assign(result,candidate);return message;
  }
  if(candidate.status!=='complete'||candidate.voice!=='active'||candidate.aspect!=='simple'||!['SV','SVO'].includes(candidate.pattern!))return unsupported;
  candidate.purpose='interrogative';candidate.questionType=adverbial?'wh-adverbial':inverted?'wh-object':'wh-subject';
  const role=adverbial?'adverbial':inverted?'object':'subject';
  let node=candidate.nodes.find(n=>n.role===role&&n.ranges.some(q=>q.start===tokens[0].start));
  if(!node){node={id:`node-${candidate.nodes.length+1}`,parentId:null,implicit:false,role,ranges:[{start:tokens[0].start,end:tokens[0].end}],ruleId:'WH-ADVERBIAL-001',explanation:'疑问词在原文中直接表示被询问的状语。'};candidate.nodes.push(node);}
  node.ruleId=`WH-${adverbial?'ADVERBIAL':inverted?'OBJECT':'SUBJECT'}-001`;
  node.explanation=adverbial?'疑问词询问动作的位置、时间或原因，在原文中作状语。':inverted?'前置的疑问词直接作宾语；助动词倒装，不补虚构宾语。':'疑问词直接作显式主语，首批采用没有复数线索的单数教学范围；不强制改写依赖语境的一致。';
  Object.assign(result,candidate);return '已匹配限定特殊疑问结构；疑问词保留原文角色和位置。';
}
