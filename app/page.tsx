"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Braces, ChevronRight, CircleHelp, Feather, Layers3, ScanText, Sparkles } from "lucide-react";
import { analyzeSentence, applyCorrection, type AnalysisResult, type ComponentNode, type Role } from "@/lib/grammar";

const sample = "The teacher gave the students a useful book yesterday.";
const examples = [
  { title: "双宾语 · 过去时", text: sample },
  { title: "双宾语 · 现在时", text: "She gives him a new book today." },
  { title: "双宾语 · 更换动词", text: "They sent the children small gifts." },
  { title: "主谓", text: "The children smiled yesterday." },
  { title: "主谓宾", text: "She likes the useful book." },
  { title: "主系表", text: "The book is useful." },
  { title: "宾语补足语", text: "We found the book useful." },
  { title: "一般疑问句", text: "Did she give him a book yesterday?" },
  { title: "祈使句", text: "Be kind." },
  { title: "感叹句", text: "What a useful book it is!" },
  { title: "基础纠错", text: "She go to school." },
  { title: "情态动词", text: "She can go to school." },
  { title: "范围提示", text: "The weather is beautiful today." },
];
const labels: Record<Role, { role: string; code: string; color: string }> = {
  subject: { role: "主语", code: "S", color: "subject" },
  verb: { role: "谓语", code: "V", color: "verb" },
  indirectObject: { role: "间接宾语", code: "IO", color: "object" },
  object: { role: "直接宾语", code: "DO", color: "complement" },
  complement: { role: "补语", code: "C", color: "complement" },
  adverbial: { role: "状语", code: "A", color: "adverbial" },
  attribute: { role: "定语", code: "ATTR", color: "attribute" },
  clause: { role: "分句", code: "CL", color: "clause" },
};
const patternDetails = {
  SV: { title: "主语 + 谓语", note: "sleep、smile、run、go 的当前规则不接宾语；go 可接固定目的地 to school。" },
  SVO: { title: "主语 + 谓语 + 宾语", note: "like、enjoy、see 的当前规则接一个宾语，可以是名词短语或宾格代词。" },
  SVC: { title: "主语 + 系动词 + 表语", note: "be 连接主语与表语。表语说明主语的身份或性质，可以是名词短语或单个形容词。" },
  SVOO: { title: "主语 + 谓语 + 双宾语", note: "这些动词可以接两个宾语：动词 + 接受者 + 事物。短语内的形容词可以在成分详情中继续查看。" },
  SVOC: { title: "主语 + 谓语 + 宾语 + 宾语补足语", note: "make、find 的当前规则在宾语后接单个形容词，说明宾语的性质或状态。" },
};
const purposeLabels = { declarative: "陈述句", interrogative: "疑问句", imperative: "祈使句", exclamatory: "感叹句" };
const statusLabels = { complete: "规则分析完成", partial: "部分支持", unsupported: "超出当前范围", ambiguous: "存在歧义", invalid: "请检查输入" };
function nodeText(result: AnalysisResult, node: ComponentNode) {
  return node.implicit ? "（隐含成分）" : node.ranges.map(r => result.input.slice(r.start, r.end)).join(" … ");
}

export default function Home() {
  const [input, setInput] = useState(sample);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"parts" | "checks">("parts");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const version = useRef(0);
  const request = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (pending.current !== null) clearTimeout(pending.current); }, []);

  function editInput(text: string) {
    version.current++; request.current++;
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
    setInput(text); setResult(null); setSelectedId(null); setBusy(false); setFailure(null);
  }
  function analyze(text = input) {
    if (pending.current !== null) return;
    const inputVersion = version.current;
    const requestId = ++request.current;
    setBusy(true); setResult(null); setSelectedId(null); setFailure(null);
    pending.current = setTimeout(() => {
      pending.current = null;
      try {
        const next = analyzeSentence(text, inputVersion);
        if (version.current !== inputVersion || request.current !== requestId) return;
        setResult(next); setSelectedId(next.nodes[0]?.id ?? null);
      } catch {
        if (version.current === inputVersion && request.current === requestId) setFailure("本次分析失败，输入已保留，请重试。");
      } finally {
        if (version.current === inputVersion && request.current === requestId) setBusy(false);
      }
    }, 0);
  }
  function apply(id: string) {
    if (!result || busy) return;
    try {
      const next = applyCorrection(result, id, input, version.current);
      editInput(next);
      analyze(next);
    } catch {
      setFailure("建议已失效，请重新分析当前输入。");
    }
  }
  const roots = result?.nodes.filter(n => n.parentId === null) ?? [];
  const selected = result?.nodes.find(n => n.id === selectedId);
  const children = result?.nodes.filter(n => n.parentId === selectedId) ?? [];
  const labelFor = (role: Role) => role === "complement" ? { ...labels[role], role: result?.pattern === "SVC" ? "表语" : "宾语补足语" } : labels[role];
  const selectedLabel = selected ? labelFor(selected.role) : null;
  const patternDetail = result?.pattern ? patternDetails[result.pattern] : null;
  // Render original gaps and punctuation too: no reconstruction or normalization of input.
  const spans = result ? roots.flatMap(node => node.ranges.map(range => ({ node, range }))).sort((a, b) => a.range.start - b.range.start) : [];

  return <div className="app-shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark"><Braces size={23}/></span><span>clause<span className="brand-period">.</span></span></Link><span className="topbar-caption">ENGLISH, IN STRUCTURE</span><span className="header-help"><CircleHelp size={16}/> 句子分析工作台</span></header>
    <main className="workspace">
      <div className="page-heading"><div><div className="eyebrow"><span/> YOUR GRAMMAR WORKSPACE</div><h1>让每个句子，都清晰可见<span>。</span></h1><p>从句式到成分，读懂英语的内在结构。</p></div><span className="mode-tag"><Layers3 size={15}/> 本地规则 · 五种句型</span></div>
      <div className="work-grid">
        <aside className="input-column">
          <section className="input-card">
            <div className="section-heading"><span className="small-icon"><Feather size={18}/></span><h2>输入英文句子</h2><span className="step-label">01</span></div>
            <label htmlFor="sentence" className="sr-only">需要分析的英文句子</label>
            <textarea id="sentence" value={input} onChange={e => editInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) { e.preventDefault(); analyze(); } }} spellCheck={false} placeholder="试着输入一个英文句子…" aria-describedby="scope-hint input-count"/>
            <div className="input-meta"><span>限定词汇 · 五种句型 · 四种用途</span><span id="input-count">{input.length}/1000</span></div>
            <button className="analyze-button" onClick={() => analyze()} disabled={busy} aria-keyshortcuts="Control+Enter Meta+Enter"><ScanText size={18}/>{busy ? "正在分析…" : "分析句子"}</button>
            <div className="input-hint" id="scope-hint">Ctrl / ⌘ + Enter 分析 · 一般现在时与过去时</div>
          </section>
          <section className="examples-card"><div className="section-heading"><BookOpen size={17}/><h2>从一个例句开始</h2></div><p>选择例句后，点击分析。</p>{examples.map((e, i) => <button className="example" key={e.title} onClick={() => editInput(e.text)}><span className="example-number">{String(i + 1).padStart(2, "0")}</span><span><strong>{e.title}</strong><span className="example-text">{e.text}</span></span><ChevronRight size={14}/></button>)}</section>
          <div className="privacy-note"><Braces size={14}/><span>基于本地规则分析，句子无需上传；刷新后不保留输入。</span></div>
        </aside>
        <section className="result-card" aria-busy={busy}>
          <div className="result-header"><div className="section-heading"><span className="small-icon blue"><Layers3 size={18}/></span><h2>分析结果</h2></div><span className="result-status" role="status">{busy ? "正在分析" : failure ? "分析失败" : result ? statusLabels[result.status] : "等待分析"}</span></div>
          <div className="result-tabs" role="tablist" aria-label="分析视图">
            <button id="parts-tab" role="tab" aria-selected={tab === "parts"} aria-controls="result-panel" className={tab === "parts" ? "active" : ""} onClick={() => setTab("parts")}>成分解析</button>
            <button id="checks-tab" role="tab" aria-selected={tab === "checks"} aria-controls="result-panel" className={tab === "checks" ? "active" : ""} onClick={() => setTab("checks")}>语法检查 {result && result.corrections.length > 0 && <b>{result.corrections.length}</b>}</button>
          </div>
          <div className="result-body" id="result-panel" role="tabpanel" aria-labelledby={tab === "parts" ? "parts-tab" : "checks-tab"}>
            {failure && <p className="analysis-message" role="alert">{failure}</p>}
            {!result && !failure && <div className="empty-result"><ScanText size={28}/><h3>{busy ? "正在运行本地规则…" : "准备好，拆解下一个句子"}</h3><p>{busy ? "分析结果只对应本次输入。" : "输入或选择一个例句，再点击“分析句子”。修改输入会立即清除旧标注。"}</p></div>}
            {result && <>
              <div className="analysis-message" role="status">{result.messages.map(message => <p key={message}>{message}</p>)}</div>
              {tab === "checks" ? <div className="grammar-checks"><p className="check-scope">仅检查受支持结构中的主谓一致、do/does/did 后原形和 can 后原形。未命中规则不代表句子完全正确。</p>{result.corrections.length === 0 ? <p>当前未命中可应用的纠错建议。</p> : result.corrections.map(c => <article className="correction-card" key={c.id}><h3>{c.ruleId === "AGREEMENT-001" ? "主谓一致" : c.ruleId === "DO-BASE-001" ? "助动词后的动词原形" : "情态动词后的动词原形"}</h3><p>{c.reason}</p>{c.edits.map(e => <p className="correction-edit" key={e.range.start}><del>{e.expected}</del><span aria-hidden="true"> → </span><strong>{e.replacement}</strong></p>)}<p className="rule-reference">{c.context} 规则：{c.ruleId}</p><button className="apply-correction" onClick={() => apply(c.id)} disabled={busy}>应用此建议并重新分析</button></article>)}</div> : result.status === "complete" && <>
                <div className="result-overview"><div><span className="mini-label">句式结构</span><h3>{patternDetail?.title}</h3><p>{result.purpose ? purposeLabels[result.purpose] : "用途待确定"} <span>·</span> 简单句</p></div><div className="tense-badge">{result.tense === null ? (result.purpose === "imperative" ? "动词原形 · 祈使" : "can + 动词原形") : result.tense === "past" ? "一般过去时" : "一般现在时"}<span>主动语态</span></div></div>
                <div className="sentence-board"><div className="board-caption"><span>点击成分，查看解析</span><span>SENTENCE BREAKDOWN</span></div><div className="sentence-parts">{spans.map(({ node, range }, index) => {
                  const gap = result.input.slice(index === 0 ? 0 : spans[index - 1].range.end, range.start);
                  const label = labelFor(node.role);
                  return <span className="annotated-span" key={`${node.id}-${range.start}`}><span className="sentence-gap">{gap}</span><button className={`sentence-part ${label.color} ${selectedId === node.id ? "selected" : ""}`} onClick={() => setSelectedId(node.id)} aria-pressed={selectedId === node.id}><span className="part-label">{label.role}</span><span className="part-text">{result.input.slice(range.start, range.end)}</span><span className="part-code">{label.code}</span></button></span>;
                })}<span className="sentence-gap">{result.input.slice(spans.at(-1)?.range.end ?? 0)}</span></div></div>
                {roots.some(n => n.implicit) && <div className="nested-parts"><p>隐含成分（没有原文位置）</p>{roots.filter(n => n.implicit).map(node => <button className="nested-part" key={node.id} onClick={() => setSelectedId(node.id)} aria-pressed={selectedId === node.id}>{labels[node.role].role} · 隐含 you</button>)}</div>}
                <div className="role-legend">{[...new Set(roots.map(n => n.role))].map(role => { const label = labelFor(role); return <span key={role}><i className={label.color}/>{label.role}</span>; })}</div>
                {selected && selectedLabel && <div className={`detail-callout ${selectedLabel.color}`}><div className="detail-symbol">{selectedLabel.code}</div><div><h4>{selectedLabel.role} <span>{nodeText(result, selected)}</span></h4><p>{selected.explanation}</p><p className="rule-reference">规则：{selected.ruleId}</p>
                  {selected.parentId && <button className="nested-part" onClick={() => setSelectedId(selected.parentId)}>返回上层短语</button>}
                  {children.length > 0 && <div className="nested-parts"><p>短语内部成分</p>{children.map(child => <button className="nested-part attribute" key={child.id} onClick={() => setSelectedId(child.id)}>{labels[child.role].role} · {nodeText(result, child)}</button>)}</div>}
                </div></div>}
                <div className="structure-heading"><h3>句子骨架</h3><span>THE BIG PICTURE</span></div><div className="structure-strip">{roots.filter(n => n.role !== "adverbial").map((node, i) => { const label = labelFor(node.role); return <div className="structure-item" key={node.id}>{i > 0 && <span className="structure-plus">+</span>}<span className={`structure-pill ${label.color}`}>{label.code}</span><span>{label.role}</span></div>; })}</div>
                <div className="learning-note"><span className="note-icon"><Sparkles size={18}/></span><div><h4>一个值得记住的结构</h4><p>{result.purpose === "imperative" ? "祈使句用动词原形表达要求，主语 you 通常省略。" : result.purpose === "exclamatory" ? "What/How 将强调的表语提前，后面保留主语与系动词。" : result.purpose === "interrogative" ? "一般疑问句将助动词或系动词提前。do/does/did 与实义动词共同组成动词成分，可跨越主语。" : patternDetail?.note}</p></div></div>
              </>}
            </>}
          </div>
        </section>
      </div><footer><span>clause. <span>把英语拆开，就更容易理解。</span></span><span>分析是学习的起点，语境让理解更完整。</span></footer>
    </main>
  </div>;
}
