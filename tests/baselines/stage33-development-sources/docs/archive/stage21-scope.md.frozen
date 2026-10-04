# 阶段 21：首批常用词汇扩容

> 已归档（2026-10-03）：本页保留对应阶段的计划、范围与验收记录；文中“当前”和“下一步”属于当时版本。现行能力见 [项目说明](../../README.md#当前进度)，后续开发见 [阶段 27–32 计划](../structure-development-plan.md)，历史导航见 [归档索引](README.md)。

2026-10-03 开始实施。人工范围沿用 [阶段 19 固定清单](lexicon-expansion-scope.md)，240 个固定答案位于 `tests/fixtures/lexicon-development.json` 的 stage 21，逐项启用完整行为比较；不修改这些预期来适配实现。

新增 30 组可数名词、15 个形容词、12 个实义动词，保持各词条人物属性、首音和唯一搭配，复用现有用途、体/语态和两分句框架。`data/lexicon/stage21-import.json` 是据人工清单固定的完整草稿导入文件，不是客户端第二词典。审核校验每个字段与清单相符后，通过本地库的导入、哈希审核、冻结发布生成 1.1.0，旧 1.0.0 保持冻结。

`read` 同形保留形式线索：无助动词的 `They read books.` 有现在/过去两个完整解释，应返回 ambiguous，无节点和修改建议；do/did、进行/完成和祈使提供明确线索。不能按词形数组顺序选择过去时。实义 have、缩写和谓语纠错仍留待 22–24。

规则升级为 0.15.0，联合清单、客户端快照与结果元信息同步迁移。阶段 19 基线版本和历史答案保持冻结；旧发布的存储测试继续校验原始 91 词条，当前发布另校验 148 词条。

状态：✅ 已完成。实现、工程检查、开发/构建浏览器验收和文档均完成。

## 人工预期修订与补充

- `lexicon-outside-29` 中 and 左侧只有名词短语，没有谓语，按既有分句协议应诊断第 1 分句；`lexicon-outside-30` 右侧缺少显式主语，诊断第 2 分句。阶段 19 这两个未来答案遗漏了 `clauseIndex`，依据已有 `stage9.json` 分句拒绝约定补齐，保留 unsupported 和无节点/修改，不改变历史答案。
- SV 被动未收录：`is walked/danced/laughed/cried/waited` 属于范围外，不将审核的过去分词当作错误进行式候选。原形/过去分词同形的 `They are run.` 仍保留旧有进行式形式提示。
- 补充有限形式线索：`Read the book!` 祈使无时态；`They can read books.`、`Can they read books?`、`They can not read books.` 为 active/simple，无时态；`They do not read books.` present、`They did not read books.` past；`She read the book.` 只能匹配 past。
- 新词基础纠错：`The doctor walk.` → walks；`She does not carries the apple.` → carry；`Can she writes the letter?` → write。每条仅保留已有规则 ID、原文编辑区间；不加入新谓语自动纠错。
- 时间对照：`They read books yesterday.` 的 yesterday 排除一般现在时，应唯一匹配过去；`They read books today.` 仍无法排除今天较早发生的过去行为，保留歧义。`They read books and she walks.` 第 1 分句有歧义，整句无节点或建议。

## 实际交付与验证

- 新增 57 个审核词条：30 组名词、15 个形容词、12 个动词。总计 148 条，44 组名词、24 个形容词、26 个实义动词；功能词不变。规则 0.15.0，词典 1.1.0，发布摘要 `abcaa53eb2741dfcb8750191fc4ba751258eb630c43f3eb3e8a3d5a475044e7e`。旧 1.0.0 的条目、审核引用及哈希完整保留。
- 通过重建旧发布、导入新草稿、逐修订绑定完整内容哈希审核、显式选择全部修订发布生成新版本；专项测试从空 SQLite 独立重现完全相同的发布字节。未创建默认工作库；生产分析只读打包词典。
- `tests/stage21.test.mjs` 的 254 项全部通过：240 个原人工答案（206 正确、34 边界）、完整词条/旧条目保存、审核发布重现、read 形式候选与预算、7 个有限形式线索、3 个基础纠错及时间/分句歧义对照。两条分句答案补齐原因归属，依据和范围见上文；无样例删除、无历史预期修改。历史种子回归保留原词全部断言，并单独验证扩容后完整发布。
- 全量 `npm test`：1730 通过，失败/跳过均为 0；`npx tsc --noEmit`、全仓 ESLint、`npm run build`、词典 verify、暂存/未暂存 diff --check 均通过。构建保留原有 Vinext 路由静态分类提示与代理环境提示；没有新增错误。
- `node scripts/check-historical-baselines.mjs` 核验阶段 12 的 2224 字符串、阶段 18 的 2039 字符串及 9 份原始 fixture，全部匹配固定 Git 来源。
- macOS、Node 24.14.1、Chromium 147.0.7727.15：开发和构建均通过 ui-stage21（240 固定样例 + read 时间/分句对照、手机、基础纠错重分析、分句键盘焦点），ui-smoke、ui-stage12（40 独立输入/20 对照）和 ui-predicate（176 正确/145 边界）。最后一次构建后重新运行 ui-stage21/ui-stage20；开发 HMR 的版本/哈希失效、保留输入、延迟旧任务拒绝也通过。Python Playwright 未安装，沿用仓库 JavaScript Playwright。
- 静态资源加载后断网分析和纠错；页面无错误，输入不出现在网络请求/控制台/localStorage/sessionStorage/IndexedDB/cookie 中。查看 390px 截图，无横向溢出；新词范围与例句已更新，词典未覆盖说明不将范围外误写为语法错误。
- 快照 100293 字节，gzip 8114 字节，296 个词形/索引候选、271 个表面拼写、单拼写最多 3 候选。Node 首次词典模块加载约 22.7ms（含 TS/JSON 加载），后续隔离模块且依赖已缓存约 0.9–1.7ms。浏览器 1000 UTF-16 谓语样例每种服务各 70 次、桌面/390px：开发 3.1–20.3ms，构建 1.2–4.1ms，均无长任务。只记录本机值，未放宽 1000/4000 上限。

日志位于 `/tmp/grammar-21-tests.log`、`/tmp/grammar-21-{types,lint,build}.log`、`/tmp/grammar-21-{dev,production}-ui-*.log`；性能报告 `/tmp/grammar-21-{dev,production}-predicate.json`。截图 `/tmp/grammar-21-production-mobile.png`。临时浏览器关闭、验收服务器停止；未提交、推送或部署。下一步阶段 22 的实义 have。

## 代码审查修复的人工预期（2026-10-03）

在实现修复前固定如下预期，不修改已有 240 个阶段 21 答案：

- 当前进行式错误提示范围明确包括 go、sleep、smile、run、make、find 的审核分词形式。`She is slept.`、`She is gone.`、`She is smiled.`、`She is made it useful.`、`Is she slept?` 保留原有 partial/form-mismatch 与错误词的原文范围；`She sleeps and he is smiled.` 保留第 2 分句归属。均不给自动修改。
- 上述范围是当前诊断规则的词条白名单，不根据旧协议、发布版本或来源分支。被动分析仍须通过每条 frame 的 passivePromotion 校验。walk/dance/laugh/cry/wait 的分词不在该错误提示白名单内，阶段 21 的禁止被动答案保持 unsupported。
- 用途来自实际解析分支，并作为内部元信息独立于结果分类保留。partial 的公开 purpose 继续为 null，已确认的内部用途用于校验 frame.allowedPurposes。
- 将 give 的 frame 限定为 declarative 后，`Do she give him a book`、`Does she gives him a book`、`Can she gives him a book`（有无问号）均 unsupported、无节点和建议；陈述用途的错误仍保留原有建议。
- 将 give 限定为 interrogative 后，无问号的上述错误疑问句仍可给原有唯一基础纠错；正确或错误陈述均须拒绝。用于用途审核的词条变体仅在隔离单元测试和开发浏览器临时热更新测试中使用，不发布新词典。

### 审查修复交付 ✅

- 当前规则升级为 **0.15.1**，应用组合清单同步；词典仍引用已审核发布 1.1.0。修改当前进行式诊断范围，保留旧词的原文错误范围和第 2 分句归属，同时保持新词禁止被动的 240 个固定答案。
- do/be、can、祈使、感叹及组合谓语解析分支记录内部用途。审核检查使用该用途；不将无问号的 partial 误判为陈述，不改变 partial 的公开分类协议。组合谓语和 can 疑问也通过同一记录机制。
- 新增 7 个准确范围/分句归属回归，以及 2 组声明/疑问用途隔离测试；修复前 9 项均失败，修复后通过。用途测试覆盖有无问号、do/can/完成链、允许时的精确基础纠错编辑、拒绝时无节点/建议，以及 partial 的公开分类均为 null。全量 **1739 项通过**，失败/跳过 0；专项 293 项通过，类型、ESLint、构建、词典 verify 和差异检查通过。
- 两种服务均通过 ui-review-fixes、ui-stage21、ui-smoke、ui-stage12、ui-predicate。开发专项临时将 give 限定为陈述和疑问用途，验证有无问号的拒绝/纠错行为，并恢复原始快照。构建专项验证旧词错误提示、新词禁止被动和第 2 分句原因。390px、断网、无输入网络/日志/存储及页面无错误通过；截图已查看。
- 新浏览器脚本 `tests/ui-review-fixes.mjs`；工程日志 `/tmp/grammar-review-fix-{tests,types,lint,build,focused}.log`，浏览器日志 `/tmp/grammar-review-fix-{dev,production}-ui-*.log`，截图 `/tmp/grammar-review-fix-production-mobile.png`。浏览器关闭、验收服务停止。本次修复未执行提交、推送或部署。
