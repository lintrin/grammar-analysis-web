// The released browser snapshot is the only vocabulary source. Teaching metadata is version-bound.
import snapshot from './generated/lexicon.json' with { type: 'json' };
import manifest from '../../data/analysis-manifest.json' with { type: 'json' };
import teaching from '../../data/grammar/query-capabilities.json' with { type: 'json' };
import examples from '../../data/grammar/query-examples.json' with { type: 'json' };
import secondMatrix from '../../data/grammar/stage30-capabilities.json' with { type: 'json' };
import whMatrix from '../../data/grammar/stage29-capabilities.json' with { type: 'json' };
import willMatrix from '../../data/grammar/stage27-capabilities.json' with { type: 'json' };

export type DictionaryEntry = (typeof snapshot.entries)[number];
export type DictionaryFrame = DictionaryEntry['frames'][number];
export type DictionaryFilter = 'all' | DictionaryEntry['partOfSpeech'];
export const dictionaryLabels: Record<DictionaryFilter, string> = {all:'全部词性',noun:'名词',adjective:'形容词',verb:'动词','function-word':'功能词'};
export const formLabels: Record<string,string> = {base:'原形',third:'第三人称单数',past:'过去式',participle:'过去分词',progressive:'现在分词',singular:'单数',plural:'复数',positive:'原级',marker:'功能词'};
export const dictionaryIdentity = Object.freeze({ruleVersion:teaching.ruleVersion,lexiconVersion:teaching.lexiconVersion,lexiconHash:teaching.lexiconHash});
export function assertDictionaryIdentity(identity = manifest) {
  if (identity.ruleVersion !== teaching.ruleVersion || identity.lexiconVersion !== teaching.lexiconVersion || identity.lexiconHash !== teaching.lexiconHash || snapshot.lexiconVersion !== teaching.lexiconVersion || snapshot.lexiconHash !== teaching.lexiconHash || examples.ruleVersion !== teaching.exampleBasisRuleVersion) throw new Error('词典教学说明与当前规则/词典版本不一致。');
}
assertDictionaryIdentity();

/** Exact lemma or surface lookup retains every entry and homographic form, in release order. */
export function queryDictionary(query: string, filter: DictionaryFilter = 'all'): DictionaryEntry[] {
  const word = query.trim().toLowerCase();
  if (!word) return [];
  return snapshot.entries.filter(e => (filter === 'all' || e.partOfSpeech === filter) && (e.lemma === word || e.forms.some(f => f.surface === word)));
}
export function matchingForms(entry: DictionaryEntry, query: string) {
  return entry.forms.filter(f => f.surface === query.trim().toLowerCase());
}
export function entrySources(entry: DictionaryEntry) {
  return snapshot.sources.filter(s => entry.sourceIds.includes(s.id));
}
export function frameExample(entry: DictionaryEntry, frame: DictionaryFrame) {
  return examples.examples.find(e => e.entryId === entry.id && e.frameId === frame.id)!;
}
export function entryExamples(entry: DictionaryEntry) {
  return examples.examples.filter(e => e.entryId === entry.id);
}
export const dictionaryLimits = teaching.limits;
export function entryNotes(entry: DictionaryEntry): string[] {
  if (entry.partOfSpeech === 'noun') return [`可数名词；${entry.attributes.person ? '人物义可作人物接受者' : '当前义项不作人物接受者'}。单复数按上列词形使用。`];
  const labels: Record<string,string> = teaching.useLabels;
  return (entry.attributes.uses ?? []).map(use => labels[use]);
}

/** Frame flags are bounded by actual rule carriers, not expanded to all auxiliary combinations. */
export function frameCapabilities(entry: DictionaryEntry, frame: DictionaryFrame) {
  const scopes: Record<string,{entryId:string;meaning:string;subject:string}> = secondMatrix.frames;
  const second = scopes[frame.id]?.entryId === entry.id ? scopes[frame.id] : undefined;
  const possession = entry.sense === 'possession';
  const location = frame.fixedTail?.startsWith('location:') ? frame.fixedTail.slice(9).split(',') : [];
  const wh = whMatrix.patterns.includes(frame.pattern) ? {
    subject: second?.subject === 'person' ? ['who'] : second ? ['what'] : [...whMatrix.subject.words],
    object: frame.pattern === whMatrix.object.pattern ? [...whMatrix.object.words] : [],
    adverbial: [...(location.length ? whMatrix.adverbial.words : second ? secondMatrix.whAdverbials : whMatrix.adverbial.words.filter(w=>w!=='where'))],
  } : {subject:[],object:[],adverbial:[]};
  const passive = frame.passivePromotion !== null;
  const patterns: Record<string,string> = teaching.patterns;
  const purposes: Record<string,string> = teaching.purposes;
  return {
    title: patterns[frame.pattern],
    meaning: possession ? '拥有：接一个名词短语宾语' : second?.meaning ?? (frame.pattern === 'SV' ? '不接宾语的审核活动或状态义' : patterns[frame.pattern]),
    subject: second?.subject === 'person' ? '仅人物主语；主语提问用 who' : second ? '仅 door/window/it；主语提问用 what' : '按当前名词短语或主语代词范围',
    progressive: frame.allowProgressive,
    perfect: frame.allowPerfect,
    passive,
    passiveNote: frame.passivePromotion === 'direct-object-or-recipient' ? '直接宾语或人物接受者提升' : passive ? '直接宾语提升' : '未开放',
    modals: possession ? [] : ['can',willMatrix.modal],
    purposes: frame.allowedPurposes.map(p=>purposes[p]),
    polarities: frame.allowedPolarities,
    wh,
    location,
    compound: !second,
    perfectProgressive: frame.allowPerfect && frame.allowProgressive,
    perfectPassive: frame.allowPerfect && passive,
    progressivePassive: frame.allowProgressive && passive,
    notes: [
      ...(possession ? ['仅一般现在/过去时；否定和一般疑问使用 do；不支持情态、祈使、进行/完成/被动或无需 do 的拥有疑问。'] : [teaching.limits.modal,teaching.limits.composed]),
      ...(second ? ['仅单句；一般现在/过去时、进行时及 can/will 简单体；不支持完成、被动、祈使、分句或地点尾部；特殊疑问不进入进行体。'] : ['完整陈述可进入既有 and/but、后置 because、前置 if 两分句框架；will 仅限 if 主句。']),
      ...(location.length ? [teaching.limits.location] : []),
      ...(frame.fixedTail === 'to school' ? ['go 可接固定 to school；简单体的该固定尾部不与时间尾部同用。不开放自由目的地，where 提问未开放。'] : []),
      ...(frame.pattern === 'SVOC' ? ['宾补仅一个已收录形容词，不接受名词或非谓语补语。'] : []),
      ...(wh.subject.length ? ['特殊疑问仅肯定、单句、简单体主动；不附地点尾部，且 when 不带时间尾部。主语/宾语可带 today/yesterday（will 不带 yesterday）。'] : ['此搭配不开放特殊疑问。']),
    ],
  };
}
