# 本地谓语分析 0.14.3

日期：2026-10-02。阶段 13–18 ✅ 已完成。实施顺序、逐阶段证据和项目规则见 [执行计划](predicate-expansion-plan.md) 与根目录 AGENTS.md。

## 当前支持

仍使用随应用打包的人工词典与本地规则，不下载词典、不使用模型服务。原有五种句型、四种用途、限定否定/can 与 and/but/because/if 均保留。新增结构支持肯定陈述、一个 not 的否定陈述、肯定一般疑问；如有句末标点，陈述要求句号、疑问要求问号。

| 能力 | 谓语形式 | 示例 |
|---|---|---|
| 现在/过去进行 | am/is/are/was/were + V-ing | She is sleeping. |
| 现在/过去完成 | have/has/had + V-en；been + 原表语 | She has seen it. / They had been kind. |
| 一般时被动 | am/is/are/was/were + V-en | The book was liked by her. |
| 完成进行 | have/has/had been + V-ing | She has been sleeping. |
| 完成被动 | have/has/had been + V-en | A book has been given to her. |
| 进行被动 | am/is/are/was/were being + V-en | She is being given a book. |

14 个实义动词的词形由人工固定，不按后缀猜测：

| 原形 | 过去分词 | 现在分词 | 主动搭配 |
|---|---|---|---|
| give | given | giving | SVOO |
| send | sent | sending | SVOO |
| show | shown | showing | SVOO |
| lend | lent | lending | SVOO |
| offer | offered | offering | SVOO |
| go | gone | going | SV |
| sleep | slept | sleeping | SV |
| smile | smiled | smiling | SV |
| run | run | running | SV |
| like | liked | liking | SVO |
| enjoy | enjoyed | enjoying | SVO |
| see | seen | seeing | SVO |
| make | made | making | SVOC |
| find | found | finding | SVOC |

助动词链先识别限定助动词、体/语态及实义动词，再按该动词搭配解析短语。前置助动词与后续谓语分别保留原文区间，主语不属于谓语；not 保留在谓语中。大小写、空格、重复词、短语定语均使用原始 UTF-16 位置。

进行时及完成进行时复用 14 个实义动词的原有搭配，不支持进行时系动词 be。完成时支持这 14 个动词及 been + 原有单形容词/名词短语表语；不支持实义动词 have。go 保留固定目的地 to school，新结构可在末尾使用已收录时间状语 today/yesterday。

## 被动转换

- like/enjoy/see：原宾语成为主语，表层句型 SV，可在末尾用 by + 人物名词短语/宾格代词（含 it）说明施事。
- give/send/show/lend/offer：接受者成为主语时保留一个名词短语直接宾语，表层 SVO；接受者主语限定为人物名词短语或除 it 外的主语代词；不带限定词的复数名词也必须检查人物属性，books/gifts 等不能作为接受者。
- 上述 SVOO 动词的直接宾语成为主语时，表层 SV，可使用 to + 人物名词短语/宾格代词说明接受者，再可用 by 说明施事。直接宾语提升允许省略 to 接受者。
- to/by 均标为状语，定语归属其所在短语；主语解释保留原动词搭配和提升关系。to 必须位于 by 之前，不支持通用介词短语。
- SV、系动词 be 和 make/find 的 SVOC 不支持被动。已收录分词与形容词用法重叠且无法唯一判断时返回 ambiguous；不猜测语境含义。

## 协议、错误与边界

顶层和 clause 分类的 tense、aspect、voice 均为必填且允许 null；reasons 为必填列表，不兼容缺失字段的旧协议。完整简单句的 aspect/voice 非空，can/祈使句仍不推断 tense；完整多分句顶层三项均为 null，按分句填写分类。公开同步 analyzeSentence/applyCorrection 入口保留。

完整搭配中的动词形式错误返回 partial，保留实际错误区间，分类与成分不确定时为空。候选依次优先采用完全有效的链、仅限定助动词一致错误的链、实义动词形式正确的链。所有候选均存在形式错误时返回 partial，并合并保留候选的错误区间；只有多个有效解析才返回 ambiguous。未知词/范围外结构返回 unsupported，不把未覆盖当作语法错误。新结构无自动修改建议，原有主谓一致、do 原形、can 原形纠错和过期建议拒绝保留。

陈述结构可进入现有两完整分句 and/but、后置无逗号 because、前置带一个逗号 if；任一分句失败时整句清空成分和建议，原因保留分句序号。不推断因果/条件的语义或跨分句时态搭配。

不支持数据库词典、开放词汇、将来时、缩写、否定疑问、特殊疑问、完成进行被动、get 被动、通用介词短语或新 can 链。仍限制 1000 UTF-16 字符、共享 4000 次候选边界预算；预算耗尽停止并返回 unsupported，不暴露半成品。

## 固定答案与复核

开发样例固定 94 个正确句和 80 个错误/超范围句；六类能力分别达到至少 5 个肯定、3 个否定、3 个疑问，三类被动提升各至少 5 个正确句。独立验收另有六类各 10 个正确句（共 60）和 30 个错误/超范围对照；包含不同体/语态的并列与主从句，预期不由引擎生成。

独立首轮 60 个正确句均匹配，30 个对照中 1 个误诊：The girls is lending her books 被错误候选干扰判为 ambiguous。修复候选优先顺序并升级为 0.14.1，原定答案保持不变；复核 60/60 与 30/30 全部匹配。

复核命令（使用项目已准备依赖）：

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
node --experimental-strip-types scripts/check-predicate-fixtures.mjs
node --experimental-strip-types scripts/check-predicate-performance.mjs
```

另有代码审查后先固定的 57 个回归答案：22 个正确句、10 个形式错误句、25 个范围边界，含 by it、错误桥接助动词、否定/疑问、从句和接受者限制。0.14.3 新增 29 个固定答案，覆盖裸复数非人物名词在三类被动中的范围限制，并保留全部六个允许的主语代词、裸复数人物名词和直接宾语提升。见 tests/fixtures/predicate-review.json。原独立 60+30 答案保持不变，只更新规则版本元信息。

浏览器脚本 tests/ui-predicate.mjs 使用已有 Playwright/Chromium，对全部 176 个正确句、145 个错误/边界，以及键盘、390px 手机、断网、无请求/输入日志/存储、刷新与实质性 1000 字符性能进行复核。已有 ui-smoke 和 ui-stage12 继续覆盖纠错、旧建议失效、分析中编辑、连续点击、失败重试和分句焦点。可使用 PLAYWRIGHT_MODULE、PLAYWRIGHT_CHROMIUM_EXECUTABLE 指定已有运行时，CLAUSE_BASE_URL 指向本地服务。

性能样例含大量定语、双宾语、前置助动词、接受者/施事和不同分类的分句。自然 1000 字符输入不一定耗尽 4000 次预算，耗尽使用显式注入的 0 预算独立验证。Node 计时包含协议校验；浏览器计时包含 React 渲染，只代表本地环境，不是普遍延迟保证。

本轮交付仍为依赖准备后的本地网页；完整离线安装包、PWA、数据库词典和公开部署单独排期。

## 最终验收结果

规则 0.14.3：1065 项测试、TypeScript、全仓 ESLint、构建、全部历史 checker 和差异检查通过。开发服务与构建产物均完成全部 176 个正确句、145 个错误/边界和原有完整流程；手机截图已核对，服务已停止。完整环境、首轮发现与修复、独立答案 SHA-256 及审查修复记录见 [执行与验收记录](predicate-expansion-plan.md)。

| 本机性能 | 样本 | 测量结果 |
|---|---|---|
| Node 同步分析（含协议校验） | 7 个长输入，各 100 次 | 中位数 0.28–0.52ms，峰值 3.73ms |
| 构建产物点击至结果（含渲染） | 7 个长输入，1280/390px 各 5 次 | 峰值 5.00ms，无观察到的长任务 |
| 开发服务点击至结果（含渲染） | 同上 | 峰值 25.50ms，无观察到的长任务 |

环境为 Apple M3 Pro / arm64、Node v24.14.1、Chromium 147.0.7727.15。断网分析没有输入请求、控制台句子日志、浏览器持久存储或刷新恢复。完整离线安装包、PWA、数据库词典及公开部署未纳入本轮交付。
