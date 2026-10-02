"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Braces, ChevronRight, CircleHelp, Feather, Layers3, ScanText, Sparkles } from "lucide-react";
import { analyzeSentence, applyCorrection, type AnalysisResult, type ComponentNode, type Role, type Range } from "@/lib/grammar";

import { exampleGroups, sample } from "@/lib/grammar/learning";
import { reasonLabels } from "@/lib/grammar/feedback";

const labels: Record<Role, { role: string; code: string; color: string }> = {
  subject: { role: "主语", code: "S", color: "subject" },
  verb: { role: "谓语", code: "V", color: "verb" },
  indirectObject: { role: "间接宾语", code: "IO", color: "object" },
  object: { role: "直接宾语", code: "DO", color: "complement" },
  complement: { role: "补语", code: "C", color: "complement" },
  adverbial: { role: "状语", code: "A", color: "adverbial" },
  attribute: { role: "定语", code: "ATTR", color: "attribute" },
  clause: { role: "分句", code: "CL", color: "clause" },
  connector: { role: "连接关系", code: "LINK", color: "clause" },
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
  const sentenceInput = useRef<HTMLTextAreaElement>(null);
  const [locatedWord, setLocatedWord] = useState<string | null>(null);
  const [input, setInput] = useState(sample);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [tab, setTab] = useState<"parts" | "checks">("parts");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const version = useRef(0);
  const request = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const previousClauseId = useRef<string | null>(null);
  useEffect(() => () => { if (pending.current !== null) clearTimeout(pending.current); }, []);
  useEffect(() => {
    if (activeClauseId) backButton.current?.focus();
    else if (previousClauseId.current) board.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    previousClauseId.current = activeClauseId;
  }, [activeClauseId]);

  function editInput(text: string) {
    version.current++; request.current++;
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
    setLocatedWord(null); setInput(text); setResult(null); setSelectedId(null); setActiveClauseId(null); setBusy(false); setFailure(null);
  }
  function analyze(text = input) {
    if (pending.current !== null) return;
    const inputVersion = version.current;
    const requestId = ++request.current;
    setLocatedWord(null); setBusy(true); setResult(null); setSelectedId(null); setActiveClauseId(null); setFailure(null);
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
  function locateWord(range: Range) {
    sentenceInput.current?.focus();
    sentenceInput.current?.setSelectionRange(range.start, range.end);
    setLocatedWord(`已选中原文“${input.slice(range.start, range.end)}”，位置 ${range.start + 1}–${range.end}。仅定位，输入未修改。`);
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
  const activeClause = result?.nodes.find(n => n.id === activeClauseId);
  const roots = result?.nodes.filter(n => n.parentId === activeClauseId) ?? [];
  if ((result?.complexity === "compound" || result?.complexity === "complex") && activeClauseId === null) roots.sort((a, b) => a.ranges[0].start - b.ranges[0].start);
  const selected = result?.nodes.find(n => n.id === selectedId);
  const children = result?.nodes.filter(n => n.parentId === selectedId) ?? [];
  const pattern = activeClause?.clause?.pattern ?? result?.pattern;
  const purpose = activeClause?.clause?.purpose ?? result?.purpose;
  const tense = activeClause?.clause?.tense ?? (activeClause ? null : result?.tense);
  const complex = result?.complexity === "complex";
  const conditional = complex && result?.nodes.some(n => n.role === "connector" && n.relation === "condition");
  const subordinateLabel = conditional ? "条件从句" : "原因从句";
  const labelFor = (role: Role, node?: ComponentNode) => {
    let owner = node;
    while (owner?.parentId) owner = result?.nodes.find(n => n.id === owner?.parentId);
    if (role === "clause" && node?.clause?.kind === "main") return { ...labels.clause, role: "主句", code: "MC" };
    if (role === "clause" && node?.clause?.kind === "subordinate") return { ...labels.clause, role: subordinateLabel, code: "SC" };
    return role === "complement" ? { ...labels[role], role: (owner?.clause?.pattern ?? pattern) === "SVC" ? "表语" : "宾语补足语" } : labels[role];
  };
  const selectedLabel = selected ? labelFor(selected.role, selected) : null;
  const patternDetail = pattern ? patternDetails[pattern] : null;
  const multiClauseOverview = (result?.complexity === "compound" || complex) && !activeClause;
  const viewStart = activeClause?.ranges[0].start ?? 0;
  const viewEnd = activeClause?.ranges[0].end ?? result?.input.length ?? 0;
  function selectNode(node: ComponentNode) {
    if (node.role === "clause") {
      setActiveClauseId(node.id);
      setSelectedId(result?.nodes.find(n => n.parentId === node.id)?.id ?? node.id);
    } else setSelectedId(node.id);
  }
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
            <textarea ref={sentenceInput} id="sentence" value={input} onChange={e => editInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) { e.preventDefault(); analyze(); } }} spellCheck={false} placeholder="试着输入一个英文句子…" aria-describedby="scope-hint input-count"/>
            <div className="input-meta"><span>限定词汇 · 简单句、并列句与 because / if 从句</span><span id="input-count">{input.length}/1000</span></div>
            <button className="analyze-button" onClick={() => analyze()} disabled={busy} aria-keyshortcuts="Control+Enter Meta+Enter"><ScanText size={18}/>{busy ? "正在分析…" : "分析句子"}</button>
            <div className="input-hint" id="scope-hint">Ctrl / ⌘ + Enter 分析 · 一般现在时与过去时</div>
            <details className="support-help"><summary>当前范围与键盘操作</summary><p>使用随应用提供的小词典。仅支持五种句型、四种简单句用途、两个完整陈述分句的 and/but、后置无逗号 because，以及前置带英文逗号的 if。两侧必须完整匹配；will/would、其他从句、缩写和多句尚未支持。can 不推断现在或过去时。</p><p>Tab 定位按钮，Enter 或空格查看成分、进入分句；返回整句后焦点回到原分句。未知词可用“查看原文”按钮定位；仅选中，不改写。修改输入立即清除旧结果。</p><p>检测顺序：输入限制 → 句末/多句 → 连接结构与标点 → 词典覆盖 → 分句顺序及规则。只展示实际检测到的原因。未命中纠错不代表完全正确；并列句与主从句暂无纠错。</p></details>
          </section>
          <section className="examples-card"><div className="section-heading"><BookOpen size={17}/><h2>从一个例句开始</h2></div><p>选择例句后，点击分析。</p>{exampleGroups.map(group => <section className="example-group" key={group.title}><h3>{group.title}</h3><p>{group.scope}</p>{group.examples.map((e, i) => <button className="example" key={e.title} onClick={() => editInput(e.text)}><span className="example-number">{String(i + 1).padStart(2, "0")}</span><span><strong>{e.title}</strong><span className="example-text">{e.text}</span></span><ChevronRight size={14}/></button>)}</section>)}</section>
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
              {!!result.reasons?.length && <section className="analysis-feedback" aria-label="分析原因"><p role="status">{result.reasons.map((reason, i) => <span key={i}>{i > 0 ? "；" : ""}{reason.clauseIndex ? `第 ${reason.clauseIndex} 分句：` : ""}{reasonLabels[reason.code]}</span>)}</p><p>只展示按检测顺序发现的原因，范围限制不等于语法错误。可展开“当前范围与键盘操作”查看说明。</p>{result.reasons.flatMap((reason, i) => reason.code === "unknown-word" ? reason.ranges.map(range => <button className="nested-part" key={`${i}-${range.start}`} onClick={() => locateWord(range)}>查看原文：{result.input.slice(range.start, range.end)}{reason.clauseIndex ? `（第 ${reason.clauseIndex} 分句）` : ""}</button>) : [])}</section>}
              {locatedWord && <p className="word-location" role="status">{locatedWord}</p>}
              {tab === "checks" ? <div className="grammar-checks"><p className="check-scope">{complex ? "主从句暂不提供可应用纠错建议；分句完整匹配不代表所有语法检查已通过。" : result.complexity === "compound" ? "并列句暂不提供可应用纠错建议；分句完整匹配不代表所有语法检查已通过。" : "仅检查受支持简单句中的主谓一致、do/does/did 后原形和 can 后原形。并列句与主从句暂不提供纠错；未命中规则不代表句子完全正确。"}</p>{result.corrections.length === 0 ? <p>当前未命中可应用的纠错建议。</p> : result.corrections.map(c => <article className="correction-card" key={c.id}><h3>{c.ruleId === "AGREEMENT-001" ? "主谓一致" : c.ruleId === "DO-BASE-001" ? "助动词后的动词原形" : "情态动词后的动词原形"}</h3><p>{c.reason}</p>{c.edits.map(e => <p className="correction-edit" key={e.range.start}><del>{e.expected}</del><span aria-hidden="true"> → </span><strong>{e.replacement}</strong></p>)}<p className="rule-reference">{c.context} 规则：{c.ruleId}</p><button className="apply-correction" onClick={() => apply(c.id)} disabled={busy}>应用此建议并重新分析</button></article>)}</div> : result.status === "complete" && <>
                {activeClause && <div className="clause-navigation"><button ref={backButton} className="nested-part" onClick={() => { setActiveClauseId(null); setSelectedId(activeClause.id); }}>返回整句</button><span role="status">{complex ? `正在查看${activeClause.clause?.kind === "main" ? "主句" : subordinateLabel}` : `正在查看第 ${result.nodes.filter(n => n.role === "clause").findIndex(n => n.id === activeClause.id) + 1} 分句`}</span></div>}
                <div className="result-overview"><div><span className="mini-label">句式结构</span><h3>{multiClauseOverview ? (complex ? (conditional ? "条件从句 + 主句" : "主句 + 原因从句") : "两个完整分句") : patternDetail?.title}</h3><p>{purpose ? purposeLabels[purpose] : "用途待确定"} <span>·</span> {multiClauseOverview ? (complex ? "主从复合句" : "并列句") : activeClause ? (complex ? (activeClause.clause?.kind === "main" ? "主句" : subordinateLabel) : "独立分句") : "简单句"}</p></div><div className="tense-badge">{multiClauseOverview ? "时态按分句查看" : tense === null ? (purpose === "imperative" ? "动词原形 · 祈使" : "can + 动词原形") : tense === "past" ? "一般过去时" : "一般现在时"}<span>{multiClauseOverview ? (complex ? (conditional ? "if 表示条件" : "because 表示原因") : "and / but 连接") : "主动语态"}</span></div></div>
                <div className="sentence-board" ref={board}><div className="board-caption"><span>{multiClauseOverview ? "选择分句进入，或查看连接关系" : "点击成分，查看解析"}</span><span>SENTENCE BREAKDOWN</span></div><div className="sentence-parts">{spans.map(({ node, range }, index) => {
                  const gap = result.input.slice(index === 0 ? viewStart : spans[index - 1].range.end, range.start);
                  const label = labelFor(node.role, node);
                  return <span className="annotated-span" key={`${node.id}-${range.start}`}><span className="sentence-gap">{gap}</span><button className={`sentence-part ${label.color} ${selectedId === node.id ? "selected" : ""}`} onClick={() => selectNode(node)} aria-pressed={selectedId === node.id}><span className="part-label">{label.role}</span><span className="part-text">{result.input.slice(range.start, range.end)}</span><span className="part-code">{label.code}</span></button></span>;
                })}<span className="sentence-gap">{result.input.slice(spans.at(-1)?.range.end ?? viewStart, viewEnd)}</span></div></div>
                {roots.some(n => n.implicit) && <div className="nested-parts"><p>隐含成分（没有原文位置）</p>{roots.filter(n => n.implicit).map(node => <button className="nested-part" key={node.id} onClick={() => setSelectedId(node.id)} aria-pressed={selectedId === node.id}>{labels[node.role].role} · 隐含 you</button>)}</div>}
                <div className="role-legend">{[...new Set(roots.map(n => n.role))].map(role => { const label = labelFor(role); return <span key={role}><i className={label.color}/>{label.role}</span>; })}</div>
                {selected && selectedLabel && <div className={`detail-callout ${selectedLabel.color}`}><div className="detail-symbol">{selectedLabel.code}</div><div><h4>{selectedLabel.role} <span>{nodeText(result, selected)}</span></h4><p>{selected.explanation}</p><p className="rule-reference">规则：{selected.ruleId}</p>
                  {selected.parentId && selected.parentId !== activeClauseId && <button className="nested-part" onClick={() => setSelectedId(selected.parentId)}>返回上层短语</button>}
                  {selected.role === "clause" && !activeClause && <button className="nested-part" onClick={() => selectNode(selected)}>查看此分句成分</button>}
                  {children.length > 0 && selected.role !== "clause" && <div className="nested-parts"><p>短语内部成分</p>{children.map(child => <button className="nested-part attribute" key={child.id} onClick={() => setSelectedId(child.id)}>{labelFor(child.role, child).role} · {nodeText(result, child)}</button>)}</div>}
                </div></div>}
                <div className="structure-heading"><h3>句子骨架</h3><span>THE BIG PICTURE</span></div><div className="structure-strip">{roots.filter(n => n.role !== "adverbial").map((node, i) => { const label = labelFor(node.role, node); return <div className="structure-item" key={node.id}>{i > 0 && <span className="structure-plus">+</span>}<span className={`structure-pill ${label.color}`}>{label.code}</span><span>{label.role}</span></div>; })}</div>
                <div className="learning-note"><span className="note-icon"><Sparkles size={18}/></span><div><h4>一个值得记住的结构</h4><p>{multiClauseOverview ? (complex ? (conditional ? "if 引导前置条件从句，提出主句成立的条件；逗号分隔条件从句与主句。两侧分别保留自己的句型与时态，不推断条件的语义或时态搭配。" : "because 引导原因从句，说明主句发生的原因。主句与原因从句保留自己的主语、谓语、句型和时态；选择分句查看内部结构。") : "and 表示并列添加，but 表示转折。每个分句保留自己的主语、谓语、句型和时态；选择分句查看内部结构。") : purpose === "imperative" ? "祈使句用动词原形表达要求，主语 you 通常省略。" : purpose === "exclamatory" ? "What/How 将强调的表语提前，后面保留主语与系动词。" : purpose === "interrogative" ? "一般疑问句将助动词、can 或系动词提前。do/does/did 和 can 与后面的原形动词共同组成动词成分，可跨越主语。" : roots.some(n => n.ruleId.startsWith("NEGATIVE-")) ? "not 是否定谓语的一部分。do/does/did 后使用动词原形；be 保留人称和时态；can 后同样接原形。" : patternDetail?.note}</p></div></div>
              </>}
            </>}
          </div>
        </section>
      </div><footer><span>clause. <span>把英语拆开，就更容易理解。</span></span><span>分析是学习的起点，语境让理解更完整。</span></footer>
    </main>
  </div>;
}
