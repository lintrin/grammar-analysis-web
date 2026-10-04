import type {AnalysisResult,ComponentNode,Purpose,Role} from './protocol.ts';
import type {Token} from './tokens.ts';
import {beForms,complementQuestionMarkers,copularLocationFrames,locationMarkers,locationHeadPermits,selectedNounIdentity,selectedVerb} from './vocabulary.ts';
import {nounPhrase,directObject,type Phrase} from './phrases.ts';
import {finiteAgreement} from './predicate.ts';
import {suggest} from './suggestions.ts';
import {diagnose,budgetMessage} from './feedback.ts';

/** One original finite-be carrier. Never normalize a modal/chain into this rule. */
export function analyzeCopularLocation(tokens:Token[],punctuation:string|null,result:AnalysisResult,consume:()=>boolean,record:(purpose:Purpose)=>void):string|null {
 const where=complementQuestionMarkers.has(tokens[0]?.normalized);
 const positions=tokens.flatMap((t,i)=>locationMarkers.has(t.normalized)?[i]:[]);
 const finite=tokens.flatMap((t,i)=>beForms.includes(t.normalized)?[i]:[]);
 // Action where and six old SV location carriers continue through their own rules.
 if(!(where&&beForms.includes(tokens[1]?.normalized))&&!(positions.length&&finite.length))return null;
 if(!where&&positions.length&&tokens.slice(0,positions[0]).some(t=>selectedVerb(t,undefined,['base','third','past','progressive','participle'])?.location?.attachment==='adverbial'))return null;
 diagnose(result,'unsupported-structure');
 const unsupported='地点表语仅支持有限 be 的单个完整审核地点短语或 where 提问；限定单简单句、简单主动，无情态或时间尾部。';
 if(!where&&['who','what','when','why','how'].includes(tokens[0]?.normalized))return unsupported;
 const question=where||beForms.includes(tokens[0]?.normalized);
 record(question?'interrogative':'declarative');
 if(punctuation&&punctuation!==(question?'?':'.')){diagnose(result,'punctuation');return unsupported;}
 if(!consume()){diagnose(result,'budget-exceeded');return budgetMessage;}
 if(finite.length!==1||tokens.some(t=>['can','will','have','has','had','be','been','being','today','yesterday'].includes(t.normalized)))return unsupported;
 const v=finite[0],negative=tokens[v+1]?.normalized==='not';
 if(question&&(negative||tokens.some(t=>t.contraction||t.normalized==='not')))return unsupported;
 if(where ? v!==1||positions.length!==0 : positions.length!==1)return unsupported;
 const p=positions[0];
 const subject=where?nounPhrase(tokens,2,tokens.length):question?nounPhrase(tokens,1,p):nounPhrase(tokens,0,v);
 if(!subject)return unsupported;
 if(!where&&(question?v!==0:p!==v+(negative?2:1)))return unsupported;
 if(tokens.some((t,i)=>t.normalized==='not'&&i!==v+1))return unsupported;
 const phrase=where?null:directObject(tokens,p+1,tokens.length);
 if(!where&&!phrase)return unsupported;
 const frames=copularLocationFrames(tokens[v],consume);
 if(frames===null){diagnose(result,'budget-exceeded');return budgetMessage;}
 const permits=(f:typeof frames[number])=>f.pattern==='SVC'&&f.complement==='location-phrase'&&!f.allowProgressive&&!f.allowPerfect&&f.passivePromotion===null&&f.allowedPurposes.includes(question?'interrogative':'declarative')&&f.allowedPolarities.includes(negative?'negative':'positive')&&(where||locationHeadPermits(tokens[p].normalized,f.location!.policyId,selectedNounIdentity(tokens.at(-1)!)??''));
 const permitted=frames.filter(permits);
 if(permitted.length>1){result.status='ambiguous';diagnose(result,'ambiguous');return '有多个地点搭配解释，无法唯一确定。';}
 if(permitted.length!==1)return unsupported;
 const agreement=finiteAgreement(tokens[v].normalized,subject.thirdPerson,subject.end===subject.start+1&&tokens[subject.start].normalized==='i')!;
 if(tokens[v].normalized!==agreement.expected){
  const targets=copularLocationFrames({normalized:agreement.expected},consume);
  if(targets===null){diagnose(result,'budget-exceeded');return budgetMessage;}
  const safeTarget=targets.filter(f=>permits(f)&&f.location!.policyId===permitted[0].location!.policyId).length===1;
  result.status='partial';diagnose(result,'form-mismatch',tokens[v].contraction?[{start:tokens[v].start,end:tokens[v].end}]:[]);
  if(safeTarget)suggest(result,tokens[v],agreement.expected,'AGREEMENT-001','有限 be 需要与完整主语一致，保留原句时态和否定形式。');
  return '地点结构已完整匹配，但 be 与主语不一致；可表示且唯一的同一时态替换才提供建议。';
 }
 result.status='complete';result.purpose=question?'interrogative':'declarative';result.pattern='SVC';result.complexity='simple';result.tense=agreement.tense;result.aspect='simple';result.voice='active';result.questionType=where?'wh-complement':question?'yes-no':null;result.reasons=[];
 const add=(role:Role,start:number,end:number,ruleId:string,explanation:string,parentId:string|null=null)=>{
  const id=`node-${result.nodes.length+1}`;const node:ComponentNode={id,role,parentId,implicit:false,ranges:[{start:tokens[start].start,end:tokens[end-1].end}],ruleId,explanation};result.nodes.push(node);return id;
 };
 const addPhrase=(role:Role,phrase:Phrase,start=phrase.start)=>{
  const id=add(role,start,phrase.end,'SVC-LOCATION-001',role==='subject'?'完整主语说明句子谈论的人或事物。':'介词和完整名词短语共同作地点表语，说明主语所在的位置。');
  for(const i of phrase.attributes)add('attribute',i,i+1,'SVC-LOCATION-001','前置形容词修饰所属短语的中心名词。',id);
 };
 addPhrase('subject',subject);
 add('verb',v,v+(negative?2:1),question?'QUESTION-BE-LOCATION-001':negative?'NEGATIVE-BE-LOCATION-001':'SVC-LOCATION-001','有限 be 连接主语与地点表语；否定词属于完整谓语，疑问谓语不包含主语。');
 if(where)add('complement',0,1,'WH-COMPLEMENT-001','where 是原文中被提问的地点表语，没有虚构的地点短语。');else addPhrase('complement',phrase!,p);
 return '已匹配有限 be 的地点表语结构，保留原文角色、定语层级与地点表语提问。';
}
