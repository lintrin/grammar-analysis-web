# Clause · 英语语法分析工作台

面向中文学习者的英语语法分析网页应用，输入在浏览器内通过本地词典与规则分析。

阶段 1–31 ✅ 已完成。阶段 31 新增本地词汇与搭配查询，按词元/完整词形及词性查看词形、限定用法、来源与教学例句；不访问维护数据库或在线词典。当前词典 1.7.0、规则 0.22.3；5271 项测试、类型/ESLint/词典检查、构建与开发/构建浏览器验收通过，证据见 [阶段 31 交付记录](docs/archive/stage31-scope.md) 和 [被动纠错回归修复](docs/verification/stage31-review-fix.md)。已完成阶段统一收录在 [历史归档](docs/archive/README.md)。

阶段 32 **待实施**：先冻结全部开发来源，再固定新独立答案并复核本轮交付。门槛见 [结构扩展开发计划](docs/structure-development-plan.md)；阶段 31 的查询、教学句子和初稿均属于开发来源，不计为独立验收。

当前维护文档、开发规则与历史记录的入口见 [文档导航](docs/README.md)。

## 当前进度

当前规则 **0.22.3**。保留五种基本句型、四种简单句用途、限定 do/be/can 否定与一般疑问，以及两个完整陈述分句的 and/but、后置 because、前置 if。支持现在/过去进行时、完成时、限定被动语态，以及完成进行、完成被动、进行被动。完整谓语、时态、体和语态按原文标注，多分句分别展示各自分类。

完整词形、被动转换、错误状态与限制见 [谓语范围](docs/archive/predicate-expansion-scope.md) 与 [新增词汇范围](docs/archive/lexicon-expansion-scope.md)。现有 44 组可数名词、24 个形容词、100 个实义动词词元；read 同形须依据明确形式线索区分时态，否则保留歧义。使用人工维护并经审核发布的词典快照（1.7.0），不代表支持任意英文。新增词形来自固定版本 LemmInflect，完整 MIT 许可随网页提供；阶段 26 每个新词先开放一个审核搭配，know/need/want 等限定状态义不支持进行体，traveled/traveling 等只接受已选择的拼写。拥有义 have 支持一般现在/过去时的名词短语宾语、do 否定和 do 一般疑问；陈述可进入现有两分句框架，完成时 have 仍是助动词。否定陈述开放 12 种 do/be/can/have/will 白名单缩写，接受直/弯撇号；have 缩写仅作助动词，原文区间不展开。拥有义的其它体/语态、can、祈使、无需 do 的拥有疑问，以及 SV/SVOC 被动、其它 will 链、肯定缩写、所有格、否定疑问、范围外特殊疑问、通用介词短语、新 can 链及完成进行被动仍不支持。

阶段 27 的 will 简单主动结构覆盖五种句型与 will be 系表，否定支持 will not/won’t；可进入既有陈述分句，但 if 条件从句内暂不开放 will。顶层和分句均有必填 modal 分类。阶段 28 仅 sleep/work/walk/run/dance/wait 的单简单句 SV 开放审核的 in/on/under/near 地点尾部，允许简单体、进行体和 can/will 简单体；完整地点短语标为状语，内部前置形容词保留定语层级。

阶段 29 仅肯定、简单主动、单句：where/when/why 状语提问及 who/what 主语或直接宾语提问，结果明确 questionType；where 限六个地点动词，特殊疑问不附加地点尾部。主语和直接宾语提问可带句末 today/yesterday（will 不带 yesterday）；完成、进行、被动结构及其错误形式统一提示超出范围，不显示词形纠错。阶段 30 新增 eat/read/write 的人物主语 SV 和 open/close 的 door/window/it（含 what 主语提问）SV，保留原 SVO。新搭配只在单处词形错误时提供建议，多处错误仅诊断；逐项限制用途、体、情态和主语；不自动继承完成、被动、祈使、分句或地点权限。完整范围见 [阶段 27](docs/archive/stage27-scope.md)、[28](docs/archive/stage28-scope.md)、[29](docs/archive/stage29-scope.md)、[30](docs/archive/stage30-scope.md) 及 data/grammar 能力矩阵。

完整且唯一的谓语组合支持有限 be/have 一致和实义动词唯一分词替换；保持时态、体、语态，多个依赖错误、桥接错误或候选不唯一时不提供建议。原有主谓一致、do/does/did 后原形、can/will 后原形三类纠错保留，并复用于基础否定缩写；每次应用一条并重新分析，编辑输入立即使旧结果和建议失效。未知词可键盘定位，范围外与语境歧义明确提示；未命中纠错不代表句子完全正确。

词汇与搭配查询默认收起，按完整词元或表面词形精确搜索，忽略大小写与首尾空白；可以按名词、形容词、动词或功能词筛选。保留同形词的全部身份，逐搭配说明进行/完成/被动、情态、特殊疑问、地点与分句限制，拥有义 have 与完成时助动词分别展示。词条详情提供来源与许可；教学例句按钮把原文放入输入框、清除旧分析并聚焦输入，用户再触发分析。仅支持已收录拼写，未收录不表示拼写错误。主语符合五个新 SV 限制时，完成进行结构保持范围拒绝，不再误给被动分词替换；其它主语保留原 SVO 的唯一被动分词纠错；go 简单体的 to school 与时间词同用保留历史范围边界。

## 运行与隐私

安装依赖和构建可能需要联网；启动本地服务后分析可断网运行。句子、搜索和筛选不上传、不写日志、不持久保存，刷新后恢复默认例句、空搜索和全部词性。左侧例句以分类目录展示，默认收起；点击分类标题或用键盘展开、收起，展开后选择例句填入输入框，各分类可独立展开。分析按钮和 Ctrl / ⌘ + Enter 已启用，手机和键盘可查看成分、短语定语及分句。

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
npm run lint
npm run lexicon -- verify
npm run build
```

构建产物也已在准备好的本地环境验证启动（Wrangler 本地模式）：

```sh
npm run build
npm run start -- --port 5188
```

访问 `http://127.0.0.1:5188`。本轮交付是本地网页运行；完整离线安装包、双击启动、PWA 和公开部署仍是独立事项。构建保留环境代理与 Vinext 路由分类提示，具体证据见 [本轮范围与验收](docs/archive/predicate-expansion-scope.md)。

阶段 27–30 浏览器回归共用 tests/ui-structure.mjs。安装 Playwright/Chromium 后，设置 PLAYWRIGHT_MODULE 为模块绝对路径、PLAYWRIGHT_CHROMIUM_EXECUTABLE 为浏览器可执行文件；本机已有工具可直接复用。启动对应服务，分别针对开发地址和构建地址运行：

```sh
CLAUSE_STAGE=30 CLAUSE_BASE_URL=http://127.0.0.1:5188 node tests/ui-structure.mjs
```

CLAUSE_STAGE 可选 27、28、29、30；CLAUSE_STRUCTURE_REPORT 可指定报告路径。真实 HMR 另在开发服务运行 CLAUSE_HMR=1 的 tests/ui-stage20.mjs（同样设置 CLAUSE_BASE_URL）。这些是开发范围回归，阶段 32 的独立验收尚未实施。阶段 31 查询使用同一 Playwright 环境，对开发与构建地址分别运行：

```sh
CLAUSE_BASE_URL=http://127.0.0.1:5188 node tests/ui-stage31.mjs
```

覆盖 27 个桌面/手机固定查询、236 个教学例句、焦点、旧结果与待处理分析取消、离线/隐私/刷新复位。macOS headless-shell 的原生 select 弹出菜单键盘选择在真实内置浏览器补充检查，证据见阶段 31 交付记录。

独立样例与性能复核：

```sh
node --experimental-strip-types scripts/check-stage12-fixtures.mjs
node --experimental-strip-types scripts/check-stage12-performance.mjs
node --experimental-strip-types scripts/check-predicate-fixtures.mjs
node --experimental-strip-types scripts/check-predicate-performance.mjs
node --experimental-strip-types scripts/check-stage25-fixtures.mjs
node --experimental-strip-types scripts/check-stage25-performance.mjs
```

常规 `npm test` 可在源码导出或缺少历史提交的浅克隆中运行。以下独立命令核验历史来源，需要 Git 可执行文件及包含阶段 12/18 固定提交 `9708002c8606afaebfc5bd9b7b80537e20149cfe`、阶段 25 固定提交 `5c527e892e2adf8341655f2242896c4106d9c020` 的仓库历史：

```sh
node scripts/check-historical-baselines.mjs
node --experimental-strip-types scripts/check-stage25-baseline.mjs
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

当前词典可在空工作库执行 `init` 后用 `rebuild` 重建全部 231 个已审核词条；旧 `seed.json` 仅为阶段 20 初次迁移的 91 词条。`stage21-import.json` 保存阶段 21 新增 57 个完整草稿，`stage22-import.json` 保存拥有义 have 草稿，`stage22-selection.json` 显式选择 1.2.0 的全部修订。`stage26-scope.json` 固定新增 73 个词的教学范围；`sources/lemminflect/` 保留原始子集、上游修正、哈希和许可。`node scripts/prepare-stage26-lexicon.mjs` 离线重现 `stage26-import.json` 草稿，`stage26-selection.json` 显式选择 1.3.0 的全部修订。阶段 27–30 各自的 import/selection 清单固定词条与修订选择，1.4.0–1.7.0 发布逐个保留；当前含 100 个实义动词词元、105 个实义搭配。阶段 28 复用必填 fixedTail 的有限域记录地点许可，数据库迁移 0002 同步校验并保留冻结触发器。继续扩容须先 query/show 审查、以当前哈希 review，再选择全部修订 publish 新版本、更新联合清单并 generate-client/verify，不能直接改客户端 JSON。

`init` / `migrate` 按 Drizzle journal 执行 SQL 并核对已应用迁移的 SHA-256；重复执行无操作。种子完整迁移旧人工词典，共 91 个词条、161 条词形；同 ID 同内容重复导入无操作，冲突整批回滚。数据库插入触发器同时阻止 REPLACE 覆盖冻结记录，保护不依赖 recursive_triggers 设置。普通导入只能创建草稿，拒绝审核及发布字段。

修改词条时，先从 `show` 输出提取完整 `entry` 对象保存为 JSON，保留 `id`，将 `revisionId` 改为新 ID，人工修改属性、词形或搭配；然后执行：

```sh
npm run lexicon -- revise --from verb:lexical:give:r1 --file /path/to/replacement-entry.json
npm run lexicon -- validate
```

`revise` 创建下一版草稿，旧修订保留；不接受局部补丁或继承审核。新增词条使用 `{ sources, entries }` 导入格式，可参考种子。`--db <path>` 可指定独立工作库；导入、查询、修订和校验要求库已初始化。删除 `.lexicon/` 后可由迁移及种子重建初始草稿库。

20B/C 已完成：网页只读取随应用打包的生成快照；构建验证固定发布、客户端产物及规则/词典联合清单，不读取 SQLite。数据库没有输入句子、分析结果或历史记录表，完整验收见 [20B/C](docs/archive/stage20bc-scope.md)。

从当前固定发布重建工作库（使用一个已初始化的空库）：

```sh
npm run lexicon -- init --db .lexicon/rebuilt.sqlite
npm run lexicon -- rebuild --db .lexicon/rebuilt.sqlite
npm run lexicon -- validate --db .lexicon/rebuilt.sqlite
npm run lexicon -- verify
```

审核前用 `show` 查看完整修订及其 `contentHash`，人工核对词形、搭配、用途、首音和来源后，显式绑定该预览哈希：

```sh
npm run lexicon -- review --revision <修订ID> --hash <预览contentHash> --reviewer <审核者> --decision approve
npm run lexicon -- publish --file <发布选择清单.json> --out data/lexicon/releases/<新版本>.json
npm run lexicon -- export-release --version <已发布版本> --out <导出路径.json>
```

发布选择清单为 `{ "lexiconVersion": "新版本", "revisionIds": ["明确选择的已审核修订ID"] }`，每词条仅选一个修订。旧发布版本不可覆盖；修改须 `revise` 建新草稿并重新审核。发布成功但输出失败时用 `export-release` 恢复完整文件。普通 `import` 不接受审核字段。

采用新发布时，人工更新 `data/analysis-manifest.json` 的 `ruleVersion`、`lexiconVersion`、`lexiconHash`、`lexiconFormatVersion`，然后显式生成并验证客户端产物：

```sh
npm run lexicon -- generate-client
npm run lexicon -- verify
npm run build
```

构建不会自动生成或审核数据，缺失/非法发布、错误联合版本或被篡改的快照都会明确失败。`rebuild` 只接受仓库清单锁定的发布，不把任意外部文件的哈希当作作者签名。结果协议必填词典版本与哈希；词典组合变化会保留输入并清除旧结果，旧建议拒绝应用。

本次 20B/C 验收：1476 项测试及类型、ESLint、构建通过；开发和构建浏览器均通过键盘、手机、固定答案、断网及隐私回归，真实开发热更新失效已验证。

## 技术栈

- React 19、TypeScript、Vinext / Vite
- Tailwind CSS、Lucide 图标
- Cloudflare Workers / Sites 部署结构

## 项目结构

- `db/schema.ts`、`drizzle/`：SQLite 词典模型、生成迁移与冻结触发器
- `data/lexicon/seed.json`：完整旧人工词典的入库种子
- `scripts/lexicon.mjs`、`scripts/lexicon/`：本地维护 CLI、严格校验与事务
- `tests/stage20a.test.mjs`：建库、种子覆盖、维护和拒绝路径回归
- `components/dictionary-query.tsx`、`lib/grammar/dictionary.ts`：本地查询、词形/同形与逐搭配教学说明
- `data/grammar/query-capabilities.json`、`query-examples.json`：规则/词典绑定的只读能力元数据及已审核教学例句
- `tests/stage31.test.mjs`、`tests/ui-stage31.mjs`：固定查询、全部词条/搭配、构建版本保护及开发/构建浏览器验收
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
- `tests/stage25.test.mjs`、`stage25-delivery.test.mjs`、`ui-stage25.mjs`：120 个新独立人工答案、固定来源与哈希、完整纠错闭环、磁盘空库重建与重新审核、高候选词形及交付浏览器复核
- `tests/baselines/stage25-development.json`、`tests/fixtures/lexicon-acceptance.json`：阶段 25 的冻结开发/历史清单和独立答案
- `tests/stage24.test.mjs`、`tests/ui-stage24.mjs`：82 个固定答案、50 项历史迁移、三类纠错门槛、精确编辑与应用后的完整结果、过期拒绝及浏览器验收
- `tests/stage23.test.mjs`、`tests/ui-stage23.mjs`：57 个缩写人工答案、11 项历史迁移、完整 token 编辑与原文区间、基础纠错及浏览器验收
- `tests/stage22.test.mjs`、`tests/ui-stage22.mjs`：拥有义/助动词区分、53 个人工答案、10 对基础纠错、4 项历史迁移、发布重现及浏览器验收
- `tests/stage21.test.mjs`、`tests/ui-stage21.mjs`：新词固定答案、审核发布重现、同形预算、用途/基础纠错及浏览器验收
- `tests/stage29-30-review-fixes.test.mjs`、`tests/fixtures/stage29-30-review-fixes.json`：特殊疑问地点尾部拒绝、新 SV 单处纠错门槛及原 SVO 的 89 条固定预期
- `tests/stage29-review-fixes.test.mjs`、`tests/fixtures/stage29-review-fixes.json`：宾语提问时间尾部、单处纠错与主语提问谓语范围的 40 条固定预期
- `tests/stage19.test.mjs`、`tests/fixtures/lexicon-development.json`：未来人工答案完整性、范围和数量（不表示未来能力已实现）
- `tests/fixtures/lexicon-migrations.json`：历史样例审查、原 fixture 与逐阶段迁移答案
- `tests/baselines/`、`tests/helpers/historical-independence.mjs`：固定历史开发语料和独立性保护
- `tests/baselines/original-fixtures/`、`tests/helpers/original-fixtures.mjs`：原始样例快照与冻结来源哈希校验；常规测试不依赖 Git 历史
- `docs/README.md`、`docs/structure-development-plan.md`：文档导航与当前阶段 27–32 开发计划（下一阶段 32）
- `docs/lexicon-database-design.md`：现行 SQLite/审核/快照协议
- `docs/archive/`：阶段 1–31 的历史计划、范围与验收记录
- `tests/ui-smoke.mjs`、`tests/ui-stage12.mjs`、`tests/ui-predicate.mjs`：可选整体验收与浏览器性能回归
- `app/layout.tsx`：应用元信息
- `components/ui/`：基础界面组件
- `build/`、`scripts/`：开发与部署支持
- `.openai/hosting.json`：Sites 项目标识，不包含访问凭据

依赖、构建产物、本地运行状态和环境配置不会提交。请勿将 API 密钥或其他凭据写入源码。

## 许可证

项目沿用仓库的 MIT 许可证；第三方组件及部署支持代码的授权信息见对应目录。
