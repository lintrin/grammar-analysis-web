"use client";

import { useState } from "react";
import { BookOpen, Braces, Check, ChevronRight, CircleHelp, Command, CornerDownLeft, Feather, Layers3, ScanText, Sparkles } from "lucide-react";

const sample = "The teacher gave the students a useful book yesterday.";
const parts = [
  { text: "The teacher", role: "主语", code: "S", color: "subject", note: "动作的发出者。The teacher 是一个名词短语，teacher 是中心词。" },
  { text: "gave", role: "谓语", code: "V", color: "verb", note: "表示给予的动作。gave 是 give 的过去式。" },
  { text: "the students", role: "间接宾语", code: "IO", color: "object", note: "动作的接受者，即“给谁”。" },
  { text: "a useful book", role: "直接宾语", code: "DO", color: "complement", note: "动作涉及的事物，即“给什么”。useful 修饰 book。" },
  { text: "yesterday", role: "时间状语", code: "A", color: "adverbial", note: "说明动作发生的时间，修饰谓语 gave。" },
];

export default function Home() {
  const [input, setInput] = useState(sample);
  const [selected, setSelected] = useState(0);
  return <div className="app-shell">
    <header className="topbar"><a href="/" className="brand"><span className="brand-mark"><Braces size={23}/></span><span>clause<span className="brand-period">.</span></span></a><span className="topbar-caption">ENGLISH, IN STRUCTURE</span><span className="header-help"><CircleHelp size={16}/> 句子分析工作台</span></header>
    <main className="workspace">
      <div className="page-heading"><div><div className="eyebrow"><span/> YOUR GRAMMAR WORKSPACE</div><h1>让每个句子，都清晰可见<span>。</span></h1><p>从句式到成分，读懂英语的内在结构。</p></div><span className="mode-tag"><Layers3 size={15}/> 基础分析</span></div>
      <div className="work-grid">
        <aside className="input-column"><section className="input-card"><div className="section-heading"><span className="small-icon"><Feather size={18}/></span><h2>输入英文句子</h2><span className="step-label">01</span></div><label htmlFor="sentence" className="sr-only">需要分析的英文句子</label><textarea id="sentence" maxLength={1000} value={input} onChange={e=>setInput(e.target.value)} spellCheck={false} placeholder="试着输入一个英文句子…"/><div className="input-meta"><span>支持陈述句、疑问句与复合句</span><span>{input.length}/1000</span></div><button className="analyze-button" disabled><ScanText size={18}/> 分析句子 <span><Command size={12}/><CornerDownLeft size={13}/></span></button><div className="input-hint">基础分析正在准备，先查看右侧示例。</div></section><section className="examples-card"><div className="section-heading"><BookOpen size={17}/><h2>从一个例句开始</h2></div><p>不同结构，同样清楚。</p>{[{title:"双宾语句",text:sample},{title:"主系表句",text:"The weather is beautiful today."},{title:"一般疑问句",text:"Does she like reading books?"},{title:"试试纠错",text:"She go to school every day."}].map((e,i)=><button className="example" key={e.title} onClick={()=>setInput(e.text)}><span className="example-number">0{i+1}</span><span><strong>{e.title}{i===3&&<span className="example-error">纠错</span>}</strong><span className="example-text">{e.text}</span></span><ChevronRight size={14}/></button>)}</section><div className="privacy-note"><Braces size={14}/><span>基础分析在本地完成，句子无需上传。</span></div></aside>
        <section className="result-card"><div className="result-header"><div className="section-heading"><span className="small-icon blue"><Layers3 size={18}/></span><h2>分析结果</h2></div><span className="result-status"><Check size={14}/> 示例分析</span></div><div className="result-tabs"><span className="active">成分解析</span><span>语法检查 <b>0</b></span></div><div className="result-body"><div className="result-overview"><div><span className="mini-label">句式结构</span><h3>主语 + 谓语 + 双宾语</h3><p>陈述句 <span>·</span> 简单句</p></div><div className="tense-badge">一般过去时<span>主动语态</span></div></div><div className="sentence-board"><div className="board-caption"><span>点击成分，查看解析</span><span>SENTENCE BREAKDOWN</span></div><div className="sentence-parts">{parts.map((p,i)=><button className={`sentence-part ${p.color} ${selected===i?"selected":""}`} key={p.text} onClick={()=>setSelected(i)}><span className="part-label">{p.role}</span><span className="part-text">{p.text}</span><span className="part-code">{p.code}</span></button>)}<span className="sentence-period">.</span></div></div><div className="role-legend">{[{label:"主语",color:"subject"},{label:"谓语",color:"verb"},{label:"宾语",color:"object"},{label:"表语 / 补语",color:"complement"},{label:"状语",color:"adverbial"}].map(r=><span key={r.label}><i className={r.color}/>{r.label}</span>)}</div><div className={`detail-callout ${parts[selected].color}`}><div className="detail-symbol">{parts[selected].code}</div><div><h4>{parts[selected].role} <span>{parts[selected].text}</span></h4><p>{parts[selected].note}</p></div></div><div className="structure-heading"><h3>句子骨架</h3><span>THE BIG PICTURE</span></div><div className="structure-strip">{parts.slice(0,4).map((p,i)=><div className="structure-item" key={p.code}>{i>0&&<span className="structure-plus">+</span>}<span className={`structure-pill ${p.color}`}>{p.code}</span><span>{p.role}</span></div>)}</div><div className="learning-note"><span className="note-icon"><Sparkles size={18}/></span><div><h4>一个值得记住的结构</h4><p>give 可以接两个宾语：give someone something。也可以写成 give something to someone。</p></div></div></div></section>
      </div><footer><span>clause. <span>把英语拆开，就更容易理解。</span></span><span>分析是学习的起点，语境让理解更完整。</span></footer>
    </main>
  </div>;
}
