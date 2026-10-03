import type { AnalysisResult, Purpose } from "./protocol.ts";
import type { Token } from "./tokens.ts";
import { locationMarkers, selectedVerb } from "./vocabulary.ts";
import { directObject } from "./phrases.ts";
import { forkCandidate } from "./context.ts";
import { diagnose, hasReason, budgetMessage } from "./feedback.ts";

type Parse = (tokens: Token[], punctuation: string | null, result: AnalysisResult, consume: () => boolean, record: (purpose: Purpose) => void) => string;
/** Validate the entire audited PP and carrier before core parsing. Never ignore an unconsumed tail. */
export function analyzeLocation(tokens: Token[], punctuation: string | null, result: AnalysisResult, consume: () => boolean, record: (purpose: Purpose) => void, parse: Parse): string | null {
  const positions=tokens.flatMap((t,i)=>locationMarkers.has(t.normalized)?[i]:[]);
  if (!positions.length) return null;
  diagnose(result,"unsupported-structure");
  const unsupported="地点状语仅支持六个审核 SV 的单个句末介词短语与完整名词短语；不支持其他附着位置、多个短语或完成/被动/祈使结构。";
  if (positions.length !== 1) return unsupported;
  if (!consume()) { diagnose(result,"budget-exceeded");return budgetMessage; }
  const p=positions[0];
  const end=["today","yesterday"].includes(tokens.at(-1)?.normalized??"")?tokens.length-1:tokens.length;
  const phrase=directObject(tokens,p+1,end);
  if (!phrase || tokens.slice(0,p).some(t=>["today","yesterday","have","has","had","been","being"].includes(t.normalized))) return unsupported;
  const verbs=tokens.slice(0,p).map(t=>selectedVerb(t,undefined,["base","third","past","progressive","participle"])).filter(v=>v?.pattern==='SV'&&v.fixedTail?.startsWith("location:"));
  if (verbs.length !== 1 || !verbs[0]!.fixedTail!.slice(9).split(',').includes(tokens[p].normalized)) return unsupported;
  const core=[...tokens.slice(0,p),...tokens.slice(end)];
  const candidate=forkCandidate(result);
  const message=parse(core,punctuation,candidate,consume,record);
  if (hasReason(candidate,"budget-exceeded")) { result.reasons=candidate.reasons;return budgetMessage; }
  if (!["complete","partial"].includes(candidate.status)) return message;
  if (candidate.status==='complete' && (candidate.pattern!=='SV'||candidate.voice!=='active'||!["simple","progressive"].includes(candidate.aspect!)||!["declarative","interrogative"].includes(candidate.purpose!))) return unsupported;
  if (candidate.status==='complete') {
    const key=`node-${candidate.nodes.length+1}`;
    candidate.nodes.push({id:key,parentId:null,role:'adverbial',implicit:false,ranges:[{start:tokens[p].start,end:tokens[end-1].end}],ruleId:'LOCATION-001',explanation:'介词与完整名词短语共同构成地点状语；整个短语说明动作发生的位置。'});
    for(const i of phrase.attributes)candidate.nodes.push({id:`node-${candidate.nodes.length+1}`,parentId:key,role:'attribute',implicit:false,ranges:[{start:tokens[i].start,end:tokens[i].end}],ruleId:'LOCATION-001',explanation:'此形容词修饰地点短语的中心名词，保留短语内的层级。'});
  } else if (candidate.corrections.length>1) candidate.corrections=[];
  Object.assign(result,candidate);return message;
}
