# Clause · 英语语法分析工作台

面向中文学习者的英语语法分析网页应用，输入在浏览器内通过本地词典与规则分析。

阶段 1–12 ✅ 已完成，历史开发与验收见 [开发计划](docs/development-plan.md)、[后续开发计划](docs/follow-up-development-plan.md) 和 [阶段 12 验收](docs/stage12-scope.md)。本轮阶段 13–18 ✅ 已完成；实施记录见 [谓语扩展执行计划](docs/predicate-expansion-plan.md)。

下一轮按阶段 19–25 规划本地 SQLite 数据库词典、审核快照与词汇扩容、实义 have、限定否定缩写及谓语纠错；范围、依赖和验收门槛见 [后续计划](docs/next-development-plan.md)。数据库维护词典，分析仍在浏览器内使用打包快照，输入句子不入库。计划已补充历史验收语料基线、词条修改后重新审核，以及规则与词典版本联合校验。阶段 19 ✅ 已完成：固定范围、数据库设计、416 个未来开发答案、历史开发基线和 65 项迁移；阶段交付的工程、开发/构建浏览器复核通过；测试去重及审查完整性修复后 1422 项全部通过，见 [阶段 19 验收与测试清理](docs/stage19-scope.md)。阶段 20A ✅ 已完成本地建库、旧词入库与维护命令，见 [20A 记录](docs/stage20a-scope.md)；当前支持范围仍以 0.14.3 为准。

## 当前进度

当前规则 **0.14.3**。保留五种基本句型、四种简单句用途、限定 do/be/can 否定与一般疑问，以及两个完整陈述分句的 and/but、后置 because、前置 if。新增现在/过去进行时、完成时、限定被动语态，以及完成进行、完成被动、进行被动。完整谓语、时态、体和语态按原文标注，多分句分别展示各自分类。

完整词形、被动转换、错误状态与限制见 [当前本地分析范围](docs/predicate-expansion-scope.md)。仍使用人工小词典，不代表支持任意英文。实义动词 have、SV/SVOC 被动、将来时、缩写、否定疑问、特殊疑问、通用介词短语、新 can 链及完成进行被动不在本轮范围内。

新谓语组合暂不提供自动修改建议。原有主谓一致、do/does/did 后原形、can 后原形三类纠错保留；每次应用一条并重新分析，编辑输入立即使旧结果和建议失效。未知词可键盘定位，范围外与语境歧义明确提示；未命中纠错不代表句子完全正确。

## 运行与隐私

安装依赖和构建可能需要联网；启动本地服务后分析可断网运行。句子不上传、不写日志、不持久保存，刷新后恢复默认例句。分析按钮和 Ctrl / ⌘ + Enter 已启用，手机和键盘可查看成分、短语定语及分句。

项目尚未上线，不做旧数据或旧结果协议兼容，规则见 [AGENTS.md](AGENTS.md)。协议字段与固定测试答案直接升级，已有行为断言继续回归；已验收阶段使用 ✅ 标注。

## 本地开发

要求 Node.js >= 22.13.0。阶段 19 已在 macOS / Node.js v24.14.1 完成工程与浏览器验证；阶段 20A 审查修复后 1446 项测试、类型检查、全仓 ESLint、构建及开发/构建两种服务浏览器回归通过；独立 60 个正确句和 30 个对照均符合人工固定答案。两种本地启动方式、1000 UTF-16 上限、计算预算、390px 手机、断网与隐私在阶段 18 复核；结果仅证明当前声明范围。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5188
```

访问终端显示的本地地址。

```sh
npm test
npx tsc --noEmit
npm run build
```

构建产物也已在准备好的本地环境验证启动（Wrangler 本地模式）：

```sh
npm run build
npm run start -- --port 5188
```

访问 `http://127.0.0.1:5188`。本轮交付是本地网页运行；完整离线安装包、双击启动、PWA 和公开部署仍是独立事项。构建保留环境代理与 Vinext 路由分类提示，具体证据见 [本轮范围与验收](docs/predicate-expansion-scope.md)。

独立样例与性能复核：

```sh
node --experimental-strip-types scripts/check-stage12-fixtures.mjs
node --experimental-strip-types scripts/check-stage12-performance.mjs
node --experimental-strip-types scripts/check-predicate-fixtures.mjs
node --experimental-strip-types scripts/check-predicate-performance.mjs
```

常规 `npm test` 可在源码导出或缺少历史提交的浅克隆中运行。以下独立命令核验历史来源，需要 Git 可执行文件及包含固定基线提交 `9708002c8606afaebfc5bd9b7b80537e20149cfe` 的仓库历史：

```sh
node scripts/check-historical-baselines.mjs
```

## 本地词典维护

Node 内置 `node:sqlite` 在 Node >=22.13 可用，本次验证版本为 24.14.1；目前仍会显示 experimental 提示。工作库放在忽略目录 `.lexicon/`，不需要 D1 绑定或网页服务。

```sh
npm run lexicon -- init
npm run lexicon -- import --file data/lexicon/seed.json
npm run lexicon -- validate
npm run lexicon -- query --surface her
npm run lexicon -- query --lemma give --pos verb
npm run lexicon -- show --revision verb:lexical:give:r1
```

`init` / `migrate` 按 Drizzle journal 执行 SQL 并核对已应用迁移的 SHA-256；重复执行无操作。种子完整迁移旧人工词典，共 91 个词条、161 条词形；同 ID 同内容重复导入无操作，冲突整批回滚。数据库插入触发器同时阻止 REPLACE 覆盖冻结记录，保护不依赖 recursive_triggers 设置。普通导入只能创建草稿，拒绝审核及发布字段。

修改词条时，先从 `show` 输出提取完整 `entry` 对象保存为 JSON，保留 `id`，将 `revisionId` 改为新 ID，人工修改属性、词形或搭配；然后执行：

```sh
npm run lexicon -- revise --from verb:lexical:give:r1 --file /path/to/replacement-entry.json
npm run lexicon -- validate
```

`revise` 创建下一版草稿，旧修订保留；不接受局部补丁或继承审核。新增词条使用 `{ sources, entries }` 导入格式，可参考种子。`--db <path>` 可指定独立工作库；导入、查询、修订和校验要求库已初始化。删除 `.lexicon/` 后可由迁移及种子重建初始草稿库。

本阶段仅提供维护工作库。审核、不可变发布和发布重建在 20B 实施，客户端生成及分析器接入在 20C 实施。当前网页仍读取人工 TypeScript 词典，构建与分析不读取 SQLite；数据库没有输入句子、分析结果或历史记录表。完整验收见 [阶段 20A](docs/stage20a-scope.md)。

## 技术栈

- React 19、TypeScript、Vinext / Vite
- Tailwind CSS、Lucide 图标
- Cloudflare Workers / Sites 部署结构

## 项目结构

- `db/schema.ts`、`drizzle/`：SQLite 词典模型、生成迁移与冻结触发器
- `data/lexicon/seed.json`：完整旧人工词典的入库种子
- `scripts/lexicon.mjs`、`scripts/lexicon/`：本地维护 CLI、严格校验与事务
- `tests/stage20a.test.mjs`：建库、种子覆盖、维护和拒绝路径回归
- `app/page.tsx`：工作台界面与交互
- `app/globals.css`：视觉样式与响应式布局
- `lib/grammar.ts`：同步分析与安全纠错公共入口
- `lib/grammar/predicate.ts`、`composed.ts`：助动词链、体/语态及主动/被动搭配
- `lib/grammar/protocol.ts`：结果类型与运行时校验；`classification.ts`：界面分类标签
- `tests/grammar.test.mjs`：双宾语固定样例和协议回归
- `tests/patterns.test.mjs`：其余四种基本句型与范围边界
- `tests/purposes.test.mjs`：疑问、祈使、感叹规则与原文位置
- `tests/corrections.test.mjs`：三类纠错、正确对照、安全修改及过期拒绝
- `tests/acceptance.test.mjs`：规则完成后新增的 20 个范围内验收句
- `tests/stage9.test.mjs`：两分句固定答案、归属与协议、共享预算回归
- `tests/fixtures/stage9.json`：13 个正确句和 29 个边界/错误句的人工答案
- `tests/stage12.test.mjs`：40 个新独立答案及 20 个范围边界
- `tests/stage12-performance.test.mjs`：1000 字符边界、共享预算及耗尽降级
- `tests/stage13.test.mjs` 至 `tests/stage18.test.mjs`：谓语扩展、协议、独立答案与预算回归
- `tests/fixtures/predicate-development.json`、`predicate-acceptance.json`：人工固定开发与独立答案
- `tests/stage19.test.mjs`、`tests/fixtures/lexicon-development.json`：未来人工答案完整性、范围和数量（不表示未来能力已实现）
- `tests/fixtures/lexicon-migrations.json`：历史样例审查、原 fixture 与逐阶段迁移答案
- `tests/baselines/`、`tests/helpers/historical-independence.mjs`：固定历史开发语料和独立性保护
- `tests/baselines/original-fixtures/`、`tests/helpers/original-fixtures.mjs`：原始样例快照与冻结来源哈希校验；常规测试不依赖 Git 历史
- `docs/lexicon-expansion-scope.md`、`docs/lexicon-database-design.md`：词汇与语法范围、SQLite/审核/快照协议
- `tests/ui-smoke.mjs`、`tests/ui-stage12.mjs`、`tests/ui-predicate.mjs`：可选整体验收与浏览器性能回归
- `app/layout.tsx`：应用元信息
- `components/ui/`：基础界面组件
- `build/`、`scripts/`：开发与部署支持
- `.openai/hosting.json`：Sites 项目标识，不包含访问凭据

依赖、构建产物、本地运行状态和环境配置不会提交。请勿将 API 密钥或其他凭据写入源码。

## 许可证

项目沿用仓库的 MIT 许可证；第三方组件及部署支持代码的授权信息见对应目录。
