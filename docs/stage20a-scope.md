# Clause · 阶段 20A

实施前固定范围：仅建立维护工作库，不改分析器、结果协议或浏览器词汇范围。20B 的审核/发布/重建和 20C 的客户端接入仍待实施。

人工种子逐项迁移现有 vocabulary.ts：14 组名词、9 个形容词、14 个实义动词及全部功能词。名词人物属性和冠词首音、形容词用途、动词五种词形及原有搭配必须保留；sent/run 等同形保留独立 form kind，her/you 等跨类别同形保留独立词条。来源固定为项目 MIT 人工词表 0.14.3，不使用分析器生成内容。

先固定验收：空库迁移两次结果一致；种子重复导入无操作、同 ID 异内容整批拒绝；lemma/surface/POS 查询保留同形候选；修改只能创建下一版草稿；缺失词形、错误首音/搭配、未知字段、伪造审核字段、重复 ID、悬空来源均拒绝；任一批量失败整体回滚。SQL 外键、CHECK 与冻结触发器另行验证，不能只依赖 CLI。普通导入只产生 draft，不交付任何发布数据。

Node 内置 SQLite 需 >=22.13；本次环境 Node 24.14.1、SQLite 3.51.2 已验证。工作库默认 .lexicon/working.sqlite，纳入忽略。维护命令不接受输入句子或分析结果，网页不连接此库。

状态：20A ✅ 已完成（2026-10-03）。阶段 20 整体未完成；20B/C 待开始。

## 实际交付

- `db/schema.ts` 定义 9 张词典维护表，Drizzle schema migration 和 custom guards migration 各一份；含外键、枚举、唯一键、冻结触发器，迁移执行与摘要登记在同一事务内。
- `data/lexicon/seed.json` 为人工旧词表：14 名词组、9 形容词、14 实义动词、54 功能词，共 91 个词条和 161 条词形。包含全部原 knownWords；词形、人物/首音、功能词归属与用途、限定搭配均保留。当前分析器未连接维护库。
- `npm run lexicon --` 提供 init/migrate、import、query、show、revise、validate。导入严格拒绝额外字段，冲突或悬空引用整批回滚；重复导入不重写修订。revise 接受完整新修订并创建下一编号草稿，不复制审核记录。
- 每次连接启用外键。子词形/搭配纳入内容 SHA-256，来源与集合规范化；完整校验检测缺失词形、非法搭配、来源/内容摘要过期及辅助属性列不一致。来源以新 ID/version 更新，原记录冻结。
- 审核与发布表只预置存储模型及基础冻结约束，尚无审核/发布命令或发布产物。SQL 冻结测试使用测试审核记录验证底层保护，不表示 20B 发布流程已完成。

## 工程与浏览器验收

环境：macOS、Node 24.14.1、SQLite 3.51.2、Chromium 147.0.7727.15。

| 检查 | 结果 |
|---|---|
| `npm test` | 审查修复后 1446 项通过，失败/跳过均为 0；20A 行为回归共 24 项 |
| `npx tsc --noEmit` / `npm run lint` | 通过 |
| `npm run build` | 通过；保留既有代理环境和 Vinext 路由静态分类提示 |
| `npm run db:generate` | 再次执行无 schema 差异、无额外迁移 |
| 历史基线来源核验 | 阶段 12/18 基线与 9 份固定快照均通过 |
| 暂存、未暂存及新增文件差异检查 | 通过 |
| 内存库与独立磁盘库 | 空库建库、重复迁移/导入、查询、下一版草稿及完整校验通过 |
| 拒绝路径 | 伪造审核/未知字段、缺失词形、非法首音/搭配、重复 ID、悬空引用、冲突 ID、过期摘要、SQL 非法枚举/引用、审核后原地修改均拒绝；批量失败全部回滚 |
| 开发与构建服务 | `ui-smoke.mjs`、`ui-stage12.mjs`、`ui-predicate.mjs` 各执行一次，共六组通过 |

开发服务 127.0.0.1:5189、Wrangler 构建服务 127.0.0.1:5188。浏览器验证完整分析/成分导航/纠错/重新分析，分析中编辑及旧建议失效、失败重试、键盘、390px、断网、隐私和刷新；阶段 12 的 40 个独立句/20 个对照与谓语的 176 个正确句/145 个边界全部通过。静态资源加载后断网仍能完成分析与纠错；维护数据库连接已关闭，网页未读取该库。手机长输入截图已检查，无横向溢出。谓语 1000 UTF-16 页面完成耗时每种服务各 70 次：开发 3.6–29.0ms、构建 1.3–5.8ms；两套报告均无长任务。这是本机包含 React 渲染的测量，不作为普遍性能保证。

测试框架检查网络、控制台、localStorage/sessionStorage/IndexedDB/cookie 中没有测试输入；本轮新增维护模块没有被网页引用，没有输入句子或结果表，SQLite 只写人工词条及维护元信息。浏览器服务完成后均停止。

实际日志：`/tmp/clause-20a-tests.log`、`/tmp/clause-20a-types.log`、`/tmp/clause-20a-lint.log`、`/tmp/clause-20a-build.log`、`/tmp/clause-20a-browser.log`。浏览器报告分别为 `/tmp/clause-20a-{dev,production}-{stage12,predicate}.json`，手机截图 `/tmp/clause-20a-{dev,production}-mobile.png`；这些为本机验证产物，不纳入仓库。

下一步：20B 实现完整修订审核、不可变发布、固定发布数据导出与重建；重点验证审核哈希过期、A→B 重新审核、同版本异内容、失败无可用半成品及重复导出一致。20C 再迁移生产词典和分析协议。

## 审查修复：REPLACE 绕过冻结约束

首次 20A 交付为 1443 项测试。本次复现：SQLite 的 `recursive_triggers=OFF` 时，`INSERT OR REPLACE` 的隐式删除不调用 DELETE 触发器；同 ID 的草稿可替换 approved/rejected 修订，冻结来源也可覆盖。仅有 UPDATE/DELETE 保护不足。

直接更新尚未发布的 `0001_lexicon_guards.sql`，增加 BEFORE INSERT 冲突检查。冻结修订检查主键、(entry_id, revision_number) 唯一键及显式 rowid；来源、审核、发布和发布内容检查各自主键及显式 rowid。冲突在隐式删除前拒绝，保护不依赖连接是否启用递归触发器。现有新草稿、新来源及幂等导入继续通过。

新增 3 项回归在修复前均明确失败（原 21 项通过），修复后 24 项通过；覆盖 approved/rejected 替换、不同 ID 冲突、隐藏 rowid 冲突、所有冻结表，并逐次比较拒绝后的原记录。测试中的审核/发布记录仅验证预置存储保护，20B 工作流仍待实施。

最终全量 1446 项通过，类型、ESLint、构建、历史来源与差异检查通过；重新生成 Drizzle 无 schema 差异。日志 `/tmp/clause-replace-before.log`、`/tmp/clause-replace-targeted.log`、`/tmp/clause-replace-tests.log`、`/tmp/clause-replace-types.log`、`/tmp/clause-replace-lint.log`、`/tmp/clause-replace-build.log`。本次仅调整维护 SQL 与测试，浏览器运行代码无变更，沿用上文六组浏览器验收。

本修复没有改写任何本地工作库。项目未上线，直接修订初始迁移；若曾运行旧版迁移，摘要核验会拒绝继续迁移旧库，可使用 `--db` 指定新路径从种子建库，旧库及其草稿保留。默认 `.lexicon/working.sqlite` 本次检查不存在。
