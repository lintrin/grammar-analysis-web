# 阶段 33：范围冻结与实施入口

2026-10-04 推进到 **33A 范围与人工答案冻结**。此处保留 33A 当时规则 `0.22.4`、词典 `1.7.0` 的冻结证据；当前 33C 已实现新解析，版本为 `0.23.1` / `1.8.1`；33D–33F 待实施，阶段 33 未交付。实施证据见 [33C 记录](stage33c-location-parser.md)。

## 本次范围与人工答案

遵循 [阶段 33 计划](stage33-development-plan.md) 与 [33–37 总计划](stage33-37-development-plan.md)。[能力矩阵](../data/grammar/stage33-capabilities.json) 固定 am/is/are/was/were 的肯定、否定陈述、肯定一般疑问与 where 提问；只允许单简单句、简单体、主动、无情态、无时间尾部。地点许可只有 [地点模型](../data/lexicon/stage33-location-policy-design.json) 中 `basic-object-location` 的十组配对，不进行物理可行性判断。

教学约定为 SVC：整个介词短语作 complement，内部前置形容词为其 attribute 子节点；where 是原文显式 complement，questionType 为 `wh-complement`。疑问谓语不包含主语，无虚构表语节点。原六个 SV 的地点状语与旧 where 动作提问必须保持回归。

[人工开发答案](../tests/fixtures/stage33-development.json) 在新行为第一次执行前写定：

| 类别 | 数量 | 内容 |
|---|---:|---|
| 正确句 | 48 | 四类结构各 12；全部地点配对、现在／过去、I/you、名词单复数、定语、无标点、大小写、多空格 |
| 纠错句 | 16 | 每类 4；同一时态限定 be 一致、精确原文编辑及完整控制答案 |
| 附加完整控制句 | 15 | 另 1 组引用正确集中现有完整答案；不重复计数 |
| 无建议边界 | 46 | 未知词、错误短语、介词／中心词许可、组合范围、用途、标点、多分句、多错误 |
| 历史迁移 | 3 | 保留来源身份、旧完整答案、文件哈希、新完整答案和理由 |

每个答案固定 status、诊断及区间、全部分类、显式节点、UTF-16 区间、父子关系、规则 ID、精确编辑。新节点使用 `SVC-LOCATION-001`、`NEGATIVE-BE-LOCATION-001`、`QUESTION-BE-LOCATION-001` 与 `WH-COMPLEMENT-001`，一致纠错继续使用 `AGREEMENT-001`。普通限定 be 的 form-mismatch 诊断沿用空 ranges，缩写诊断及编辑覆盖整个缩写。

作者脚本只使用人工角色槽和原文位置运算，没有导入分析器或 tokenizer。初稿与 [源代码审查记录](../tests/fixtures/stage33-answer-review.json) 保留：先修正 he 与 Where、we 与 were 的子串定位，再固定无法表示 amn't 的错误为 partial、整缩写诊断且无建议；以上均在第一次新行为执行之前完成。初稿不作为行为通过标准，不删除或覆写。

三条 [待应用迁移](../tests/fixtures/stage33-migrations.json) 分别来自阶段 28 `28-69`、阶段 29 `29-111`、阶段 32 `boundary-13`。原 fixture 和哈希未改；33B/C 接入现行回归迁移时必须保留全部原断言与新完整答案，不降低要求。新增开发句可使用历史材料，但不能计入之后的独立验收。

## 已冻结的数据设计

[地点模型](../data/lexicon/stage33-location-policy-design.json) 是 **未发布设计**，当前 verify 和应用不加载它：

- 每个 frame 新增必填 nullable `location`；非 null 为 `{policyId, attachment, presence}`。必需地点表语为 complement/required；旧动作地点为 adverbial/optional。非地点 frame 明确为 null，go 的 to school 保留。
- 审核介词词条的 `locationHeadPolicies` 是唯一生产许可来源；数组引用稳定名词 entryId，其审核单复数均可匹配。null 只表示旧六个 SV 已有的完整名词短语范围，缺键则禁止该介词。新范围的十组配对只维护于设计文件，阶段矩阵引用策略身份，不抄第二张白名单。
- 33B 把设计映射迁移进介词新修订，parser、客户端 verify 和查询共同只读已审核快照。导入数据、发布与快照是确定性生成产物，不能各自手工修改白名单。
- 每个 finite-be 词条保留原 `primary` frame，另加 `location` frame；两者分别匹配。location frame 关闭进行／完成／被动；frame 许可还必须与用途、肯否、体、情态、时间尾部和单句载体相交。
- where 增加 `wh-complement` 用途，保留 `wh-adverbial`。结果校验定向授权 where + 限定 be 的简单主动 SVC，旧三种特殊疑问分类与分句校验不放宽。
- 词典现行格式直接升级为 2，100 个动词词条、5 个有限 be、4 个地点介词和 where 共 110 个词条的内容变化需要新修订及重新审核。原审核哈希不能用于批准新增字段。
- `location_json` 列及 SQL 0003 的 frame 约束、冻结/集合触发器同步更新；跨词条引用由 import/review/publish/rebuild/verify 检查。初始化独立的新格式工作库，从新固定发布重建；保留旧工作库和格式 1 的不可变发布为历史证据，不原地改批准记录，不做旧格式运行时兼容。

33B 实施文件：`lib/grammar/protocol.ts`、`vocabulary.ts`、`classification.ts`，`scripts/lexicon/data.mjs`、`store.mjs`、`release.mjs`、`client.mjs`，`db/schema.ts`、`drizzle/0003*`、新 import/selection、固定发布、快照及联合清单。33C 涉及 `purposes.ts`、`questions.ts`、`location.ts`、`simple.ts`、`predicate.ts`、候选和预算；33D 涉及 `learning.ts`、`dictionary.ts`、工作台、查询组件和教学数据。

## 基线与首次执行

基线 HEAD 为 `0c5dbfb4940efd87ba87c7530f747168bcc1f003`。运行环境 Node `v24.14.1`。5,497 项原测试、TypeScript、ESLint、词典 verify、构建与两种 diff 检查通过；新增范围／冻结检查后的结果见 [本次检查记录](verification/stage33a-checks.json)。构建既有环境代理及 Vinext 路由分类提示仍存在，没有新增生产改动。

[33A 来源冻结](../tests/baselines/stage33-scope.json) 记录 26 个来源文件哈希。原计划、版本清单和旧快照绑定不可变 Git revision，允许之后更新活文档及新生产版本而不覆写旧来源；人工答案、设计和迁移保持冻结。包括历史开发归档和历史实际生成输入。此文件 **不是 33E 的完整开发排除语料**；独立验收前仍须冻结本阶段全部实际调用、控制句、教学示例和浏览器输入，另写不重叠的独立答案。

冻结后才执行公共 API，保留 [第一次行为差异](verification/stage33-first-run.json)：128 个完整对照中 44 项符合、84 项不符合。48 个正确句、16 个纠错句、15 个附加控制与 3 个历史迁移全部等待实现；另外两个边界要求 33C 修正诊断：

- `33-boundary-37`：陈述使用问号，目标是 punctuation；旧地点入口提前返回 unsupported-structure。
- `33-boundary-41`：I 的否定缩写一致错误，目标是 partial/form-mismatch 且无建议；旧地点入口尚未识别完整上下文。

首次执行没有改写人工答案。这些是待实现差异，不能当作功能验收通过。`npm test` 中新增检查仅证明人工材料完整与冻结保护，实际新行为检查命令独立返回非零，避免把范围校验误报成解析器已支持。

## 浏览器预期与本次基线

[浏览器人工预期](../data/grammar/stage33-browser-expectations.json) 固定未来开发／隔离构建两种服务、1280px／390px 的八个开发流程、八个查询流程及全阶段门槛；目前 **未执行新能力验收**，这些输入属于开发来源。

本次通过 Codex 浏览器在既有开发服务核对旧默认 SVOO、桌面地点状语的内部定语、旧 where 动作提问、手机旧系表缩写纠错应用闭环、编辑失效、词典过滤及例句插入、快捷键和刷新复位；390px 无横向溢出，截图人工查看。详情见 [浏览器基线](verification/stage33a-browser.json)。本次没有执行新功能构建浏览器、断网／日志／持久存储审计、真实 HMR 或新版本性能对比；这些仍属于 33D–33F，不能用基线代替。

## 继续实施

```sh
# 校验已冻结范围，不重新生成答案
node scripts/stage33/freeze-scope.mjs
python3 scripts/stage33/author-answers.py
node --experimental-strip-types --test tests/stage33.test.mjs tests/stage33-scope.test.mjs

# 在当前规则下预期返回 1；33B/C 后需逐字段全部通过
node --experimental-strip-types scripts/stage33/check-development.mjs
# 可传未存在的报告路径，禁止覆盖首次执行证据
```

接下来进入 33B：升级生产协议与格式、修订审核发布、空库重建与拒绝路径；之后才实现 33C 解析纠错。33A 的范围材料和当前基线已就绪；阶段 33 保持实施中，只有 33B–33F 实现、检查、浏览器验收和文档全部达标后才能标注 ✅。
