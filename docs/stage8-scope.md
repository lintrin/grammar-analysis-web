# 阶段 8 · 固定范围与人工预期

固定日期：2026-10-02。规则版本 `0.5.0`，状态 **✅ 已完成**。固定预期已通过语法比对与浏览器验收；完整性检查仍只验证预期数据自身，实际证据见 [阶段 8 验证](local-analysis-scope.md)。

## 词汇、搭配与语序

复用 [当前范围](local-analysis-scope.md) 中全部词汇与动词变化。新增结构词仅为 `not`，新增宾语用法仅为已有词条 `it`；不扩充开放词典。

| 结构 | 限定语序与搭配 | 时态与用途 | 不支持 |
|---|---|---|---|
| do 否定 | 显式主语 + do/does/did + not + 原形 + 原有搭配 | 陈述；do/does 现在、did 过去 | do + be，否定疑问、否定祈使、缩写 |
| be 否定 | 显式主语 + am/is/are/was/were + not + 单个形容词或名词短语 | 陈述；保留 be 原有时态 | be + 实义动词、进行/被动 |
| can 否定 | 显式主语 + can + not + 原形 + 原有搭配（含 be） | 陈述；时态为空 | cannot、can't、其他情态、can 重复 |
| can 疑问 | Can + 显式主语 + 原形 + 原有搭配（含 be） | 一般疑问；时态为空 | Can + 主语 + not、特殊疑问、缩写 |
| a/an | 限定词 + 零个或多个词典形容词 + 一个名词 | 复用于已有用途、主语、宾语和表语 | 错误冠词搭配、冠词自动修改 |
| 宾语代词 | SVO/SVOC 可用 me/you/him/her/it/us/them | 复用于已有用途及上述新结构 | 主格作宾语、代词作 SVC 表语、放宽 SVOO |

原有动词搭配：go/sleep/smile/run → SV；like/enjoy/see → SVO；be → SVC；give/send/show/lend/offer → SVOO；make/find → SVOC。不能仅凭动词词性接受其他搭配。

SVOO 接受者继续仅为原有宾格代词（不含 it）或人物名词短语；直接宾语继续要求名词短语，不接受代词。SVO/SVOC 的事物名词短语与宾语代词单独判断，不借用人物接受者限制。

句末可有一个 today/yesterday；现在时与 yesterday 冲突时不推断过去时，也不提供时态修改。can 保留现有 yesterday 限制。go 可用句末固定 `to school`，不接通用目的地或额外时间状语。所有输入仍受 1000 UTF-16 上限与边界枚举预算约束。

标点可以省略；若出现，陈述句只允许句号、can 疑问只允许问号。已有祈使和感叹句沿用原标点约定。逗号、多个句末标点、多句、撇号缩写不进入新增规则；不得先移除 not、标点或未知词再解析。

## 人工首音表

人工按读音核对，不能按字母是否为元音判断。表中所有名词均为可数名词；a/an 只用于单数。冠词由其后第一个形容词（没有形容词时为名词）的首音决定。

| 类别 | 元音首音（an） | 辅音首音（a） |
|---|---|---|
| 形容词 | old | useful（/j/）、young（/j/）、new、good、small、big、beautiful、kind |
| 名词 | 无 | teacher、student、girl、boy、friend、mother、father、child、book、gift、letter、picture、pen、toy 及对应复数（复数不使用 a/an） |

例如 `an old useful book`、`a useful old book` 的冠词取决于第一个修饰词；`an useful book`、`a old book` 不匹配。What 感叹句仍只接受不定冠词加单数短语或无冠词的复数短语；扩展 an 不放宽 the/my/this 等限制。

## 结果和纠错约定

- 正确句 complete，五种句型、四种用途、simple 复杂程度与原有时态约定保持不变。所有成分位置引用原始输入，不重建文本。
- 否定句的 not 属于动词成分；连续的 `does not like`、`is not`、`can not go` 用完整原文区间。can 疑问的助动词与实义动词使用两个区间，主语排除在外。解释必须明确否定或疑问含义。
- 嵌套形容词属于相应名词短语；What 强调成分仍属于表语；祈使隐含 you 保持空区间。节点 ID 在整个结果内唯一。
- 仅完整匹配的错误上下文返回 partial、空成分及精确编辑：否定 do/does 一致（AGREEMENT-001）、否定 do/does/did 后原形（DO-BASE-001）、否定 be 一致（AGREEMENT-001）、否定 can 与 can 疑问后原形（MODAL-BASE-001）。未知词、缺成分、非法标点、时间冲突时不提供推测修改。
- 一次应用一条建议，再分析新版本；保留大小写和空格。多错误仍按原有协议逐条处理，过期结果或建议不能再次应用。a/an 错误仅降级，不生成自动修改。

## 可执行的预期清单

[tests/fixtures/stage8.json](../tests/fixtures/stage8.json) 是人工选择句子、成分和编辑内容的固定答案，包含 **75 个输入**：6 组结构各 5 个正确句（30）、5 个新增纠错上下文各 5 个错误句（25）、20 个范围边界；25 个错误句各附一个正确对照和应用后预期。对照另含用途、句型、时态、成分、原文区间和层级。

其中包含大小写、多空格、名词形容词嵌套、隐含主语、不连续动词、不同人称和数、时间冲突、缩写、标点及过期修改。原有重复词和双错误回归继续保留，`tests/stage8-boundaries.test.mjs` 已补充新上下文的重复词、多错误组合、大小写保留和原文位置回归。

样例中的 `[start,end)` 为原始 UTF-16 区间，`key/parentKey` 表示预期层级，不要求实现采用相同 ID。固定 JSON 不由分析器生成；完整性命令仅检查位置、层级、编辑及覆盖数量。纠错语法与中文解释已按固定范围独立核对，范围外的语言正确性仍不作保证。

```sh
# 阶段 7：仅检查预期数据自身，不调用分析器验证未来支持
node --experimental-strip-types scripts/check-stage8-fixtures.mjs
# 阶段 8：逐项比对分析和修改、重新分析及过期保护
node --experimental-strip-types scripts/check-stage8-fixtures.mjs --implemented
```

## 旧边界迁移清单

阶段 7 保持了旧测试行为；阶段 8 现已保留原句并迁移以下预期，同时复用固定清单中的完整断言。

| 旧样例位置与原句 | 0.4.0 原预期 | 0.5.0 目标 | 固定样例与原因 |
|---|---|---|---|
| corrections.test.mjs：`Can she go to school?` | 非 complete、无建议 | complete / SV / interrogative / 时态空 / 无建议 | question-can-01，新增 can 疑问 |
| grammar.test.mjs：`She gave him an old book.` | unsupported | complete / SVOO / declarative / past / 无建议 | article-02，old 元音首音允许 an |
| purposes.test.mjs：`What an old book it is!` | unsupported | complete / SVC / exclamatory / present / 无建议 | article-03，复用新增冠词短语，不放宽 What 限定词 |

保留全部位置、非法协议、失效行为测试。`a old book`、`this books`、`What my book it is!`、未知词、schools、will 等边界保持原预期。上述 25 个错误句此前未承诺支持，本清单固定其未来 partial 与编辑预期；现已加入 `npm test` 的语法验收和独立正确对照。

## 模块边界与验收

`lib/grammar.ts` 保留 analyzeSentence、applyCorrection、tokenize、VOCABULARY、结果类型及校验的公开入口。内部按职责分为 protocol、tokens、vocabulary、phrases、simple、purposes、suggestions、extended 和 context；依赖单向流向基础模块，不从内部反向导入公开入口。

用途规则只重排原始 Token 引用，必要时仅调整 normalized 以复用句型；text/start/end 必须保留原文。context 隔离候选的成分和建议，每次用途解析共享 4000 次边界预算，新增结构枚举与 SVOO 候选解析共用同一计数器；同时保留输入长度和唯一匹配限制。新增支持仅按已固定范围改变旧边界预期。

阶段 8 已通过固定样例的语法比对、383 项全量回归、类型/ESLint/构建及键盘、手机、断网、纠错与失效交互；阶段 7 的完整性检查不代替这些门槛。
