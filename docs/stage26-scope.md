# 阶段 26：常用实义动词扩容

2026-10-03。状态：✅ 已完成。实现、工程检查、开发/构建浏览器验收与文档均完成。实义动词由 27 个扩充到 100 个，新增 73 个；固定范围与答案后生成草稿、审核发布并执行行为检查。

## 固定范围

`data/lexicon/stage26-scope.json` 是人工选择的教学范围，逐词固定五种词形、一个主动搭配、进行/完成/被动开关、祈使用途和样例宾语。本轮不声称是语料频率前 100 名。优先日常动作、人物交往和可用现有名词表达的搭配。

新增 SV 17 个、SVO 51 个、SVOO 5 个；既有 SVOC 不新增。总量为 SV 26、SVO 59、SVOO 12、SVOC 3（be 系表单独处理）。每个新词只支持范围文件指定的一种搭配，不能从词性推断任意宾语/补语；例如 eat 本轮只开放名词/宾格宾语，不开放独立 SV；stay 只开放 SV，不开放 stay happy。

exist、need、want、love、hate、know、understand、remember、believe、hear 的本轮状态/感知义不开放进行及完成进行；词形仍入库供识别与范围拒绝。happen、exist 不开放祈使。其余新增词允许现有进行、完成进行；全部允许完成。SVO/SVOO 允许现有审核被动转换；SV 不开放被动。SVOO 新增 hand/feed/pass/promise/serve，接受者限定人物，直接宾语为现有名词短语。

词形选择统一使用范围文件中的拼写，例如 traveled/traveling；travelling 等未选择变体仍未收录。get/got/gotten 的词形变体与 have got 交叉范围暂不纳入本轮；put 必需的位置补语、短语动词、to 不定式/动名词/从句宾语、通用地点介词、将来/新情态/新系动词均另行排期。既有 read 与新增 cut/hit 的同形时态必须按明确线索区分，否则保留歧义。

## 开源数据与发布

使用 [LemmInflect](https://github.com/bjascob/LemmInflect/tree/b7699808106a4ce843fc7f0e8e5d87fcb84cc636) 固定提交 `b7699808106a4ce843fc7f0e8e5d87fcb84cc636` 的词形表及上游修正表。保留 73 个 verb CSV 原始行、对应修正行、完整 MIT 许可、完整上游文件与子集 SHA-256；来源记录位于 `data/lexicon/sources/lemminflect/`。stay 的过去分词采用上游 override 的 stayed，不能按原表首个候选 staid 导入。travel 多拼写由人工范围明确选择。公开网页同时提供完整许可文本。

`scripts/prepare-stage26-lexicon.mjs` 离线比对选择词形与来源候选（先应用上游 override），只生成 draft 导入文件；不生成规则、预期答案或审核结论。通过既有 SQLite 草稿→校验→当前哈希审核→显式选择修订→发布 1.3.0→更新联合清单→generate-client/verify。规则更新为 0.18.1（仅优化已确定定语的候选筛选，不新增语法范围）；旧审核词条逐字段保留，历史发布作为可重建历史证据保留。词典总审核条目 222。

## 人工答案与验收门槛

`tests/fixtures/stage26-verbs.json` 在首次新词行为检查前固定 812 个答案。声明每个词的疑问原形、第三人称、明确过去、完成分词、进行/状态义拒绝、否定缩写、do 原形错误、唯一分词替换、允许的被动/祈使以及错误搭配。另覆盖新旧词性同形、cut/hit 时态歧义、三种组合谓语、疑问不连续区间和四种连接结构。

答案由手工选择的句子模板、角色片段、分类及编辑机械换算原文位置，不导入分析器，不读取其输出。全部状态、分类、角色/父节点、原文区间、分句归属、原因和精确纠错编辑均比较；每条建议应用后检查完整控制答案。原有 2154 项测试在本轮生产词典更新前全部通过。

完成门槛：全量测试、类型、lint、构建、词典重现与 verify、历史来源/固定答案检查器；开发及构建浏览器检查新增答案、桌面/手机纠错、旧流程、未知词定位、离线网络/日志/存储隐私、原文展示和字数上限；性能与词典体积记录；文档同步后才标记完成。输入句子仍只在浏览器内分析，不上传、记录或持久保存。

## 实现与首次检查记录

第一次新增行为检查 811/812 通过。`no-clausal-object` 的人工原因错误标为 unknown-word，但 1.2.0 已收录 that 为限定词；依据旧词条修正为 unsupported-structure，继续保持拒绝、空节点和无建议，未削弱断言。最终固定答案 SHA-256 为 `45a39ee3e0b14dec5727028859d5342df597c417b35e5a28cb3a9e4f1038bb0e`。其余 811 个答案不变；已有所有语法行为答案无需迁移。当前发布哈希为 `186cc285dde606b71eea12526a65aa0a0290f585987b99e1bc9a530b480abf1c`。

新词 clean 与形容词同形，长定语序列原先产生指数级枚举，在 4000 共享预算耗尽前耗时明显。0.18.1 仅在“限定词 + 不兼作名词的形容词序列 + 名词”中排除不能作为有限动词的定语候选；不裁剪名词/动词同形、不裁剪没有限定词锚点的候选，多形容词义项仍枚举。每个来源候选照常消耗预算；不改变 4000 次和 1000 UTF-16 上限。新增完整角色/定语、有限 clean 纠错及 145 个 clean 定语的 1000 字符回归，明确这类句子应完整分析。

## 交付与验收

- 全量 **2973 项测试通过**，失败/跳过/取消为 0；新增 819 项，包括 812 个固定答案与 7 项范围、来源、审核重现和预算验证。原有语法答案继续全量回归，未删除样例或削弱断言。当前数量/版本断言直接更新；阶段 22 发布重现显式读取其不可变 1.2.0 历史发布，当前发布检查继续验证 1.3.0。
- TypeScript、全仓 ESLint、构建、词典 verify、阶段 12/18/25 不可变 Git 来源核验、stage12/predicate/stage25 固定答案检查器、暂存与未暂存 diff 检查通过。只有既有 SQLite 实验提示和 Vinext 路由静态分类提示。
- 临时磁盘空库使用既有 CLI init/rebuild/validate/export-release 重建 222 个完整审核词条。导出 1.3.0 与固定发布逐字节一致；客户端 verify 同时核对固定发布哈希、联合清单与生成快照。新增草稿未经审核、过期哈希审核、篡改来源字节及未审核词形均由测试拒绝。旧 149 个词条逐字段保留。
- macOS / Node v24.14.1 / Chromium 147.0.7727.15：开发与构建服务都通过 `ui-stage26` 的 570 个正确、146 个错误、96 个边界，比较完整原文、角色、隐含主语、定语父节点、分句层级和分类。146 条建议各在桌面与 390px 手机应用后比较完整控制答案；错误输入编辑立即清除旧结果。1000/1001 字符、键盘、焦点、许可资源、刷新复位均通过。
- 两种服务也通过 `ui-stage25` 的 120 个独立历史答案、`ui-stage22` 的 53 个拥有义答案、`ui-smoke` 原有成分/嵌套/失败重试/未知词定位、`ui-predicate` 的 176 个正确与 145 个边界、`ui-stage24` 的 82 个纠错对照以及 `ui-stage23` 的 57 个缩写答案。例句组从 13 增至 14 的计数断言同步迁移，其余断言保留。开发端真实词典版本/哈希 HMR 清除旧结果且保留输入，延迟旧任务不能重新显示；测试恢复原快照并重新 verify。
- 静态加载后断网，新增分析/纠错流程零网络请求、零页面错误、零输入控制台日志；localStorage/sessionStorage/IndexedDB/cookie 为空，刷新恢复默认例句。390px 新增 eat 进行时成分截图已查看，完整展示 She / is eating / the apple，无横向溢出；SV/SVO 教学说明同步覆盖新增词。输入仍仅在浏览器内分析。

## 体积与性能

| 本机记录 | 结果 |
|---|---|
| 审核动词 | 100 个词元，412 个不同拼写词形 |
| 客户端词典 | 203319 字节，gzip 15205 字节；全部词性索引 571 个表面词形 |
| Node 冷模块初始化 | 38.46ms，含依赖加载，单个独立进程样本 |
| 新 1000 字符 tall / clean 定语压力 | 各 100 次，中位数 7.47ms / 5.83ms；150 / 295 次共享预算消耗 |
| 开发点击至结果 | 60 次、桌面与手机，5.6–39.9ms，无长任务 |
| 构建点击至结果 | 60 次、桌面与手机，1.5–9.6ms，无长任务 |

浏览器压力包含四种旧同形候选/分句输入与两种新增 145 定语的 1000 字符输入。所有时间仅说明本机和这些受限输入。Node 测量发生在工程/浏览器并行验收期间，不与历史记录作公平性能排名；旧压力原始报告也保留，没有隐藏最高耗时或用放宽上限换取通过。

复核命令：

```sh
node scripts/prepare-stage26-lexicon.mjs
npm run lexicon -- verify
npm test
npx tsc --noEmit
npm run lint
npm run build
node scripts/check-historical-baselines.mjs
node --experimental-strip-types scripts/check-stage25-baseline.mjs
node --experimental-strip-types scripts/check-stage25-fixtures.mjs
node --experimental-strip-types scripts/check-predicate-fixtures.mjs
node --experimental-strip-types scripts/check-stage12-fixtures.mjs
git diff --check
git diff --cached --check
```

`ui-stage26.mjs` 使用项目已有 JavaScript Playwright；本机 Python 没有 Playwright 模块，因此使用 webapp-testing 的 with_server.py 管理服务、复用已提供的 JavaScript 浏览器运行时，没有新增依赖。可指定 `CLAUSE_BASE_URL`、`PLAYWRIGHT_MODULE`、`PLAYWRIGHT_CHROMIUM_EXECUTABLE`、`CLAUSE_STAGE26_REPORT` 和 `CLAUSE_STAGE26_SCREENSHOT`。

本机证据：`/tmp/grammar-26-{tests,types,lint,build}.log`、`/tmp/grammar-26-{dev,production}-ui.log`、`/tmp/grammar-26-{dev,production}-regression.log`、`/tmp/grammar-26-{dev,production}-browser.json`、`/tmp/grammar-26-{performance,new-pressure}.json`、`/tmp/grammar-26-hmr-mobile.log`、`/tmp/grammar-26-final-mobile.png`。临时浏览器和服务已关闭。本次为本地交付，未提交、推送或部署。
