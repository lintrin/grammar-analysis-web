# 阶段 32：独立复核与本轮交付

日期：2026-10-04。状态：✅ 已完成实现、检查、开发/构建浏览器验收与文档。

归档日期：2026-10-04。当前本轮计划见 [结构扩展开发计划](../structure-development-plan.md)。

## 第一次独立行为执行前的冻结（初稿）

冻结起点为 Git `4a2a242a8e7835e18a958d483454cb33f2186c68`，规则 0.22.3 / 词典 1.7.0。当前基线 5271 项测试、TypeScript、lint、词典 verify 和构建通过。

`tests/baselines/stage32-development.json` 绑定 331 个文件和 13067 个规范化字符串。覆盖全部历史快照/迁移/测试/文档/教学 JSON、TypeScript AST 字面量及模板文本、Markdown 代码与英语例句。另用仅测试进程的 Node import hook 捕获原有 5271 项测试的实际分析输入，包括阶段 31 动态载体和应用后的控制句；捕获文件与工具均保留并冻结。应用从未加载该 hook，用户输入不会被收集。旧 Git 来源从固定提交重读，不因交付文档更新而重算哈希。规范化采用 lowercase + 合并空白 + trim。

人工固定 180 个输入：will 30、地点 20、特殊疑问 30、多搭配 20 个正确句；安全纠错、不可自动修改、范围边界各 20 个；安全纠错另有 20 个完整控制句。100 个正确句中 31 个跨两个以上本轮能力，按一个主类别计数。完整答案包含分类、原文区间、角色、父节点、分句、规则 ID、原因和精确编辑。生成工具只根据人工角色片段换算区间，不读取分析器。所有 180 个输入均不重复历史/开发/教学来源。

另有 20 个新词形 + 动词筛选查询流程，人工预期只依据审核发布。词典查询的独立单位是查询词与筛选组合（不能把词典中已存在的裸词字符串当作已测试查询）；不复用阶段 31 查询组合。例句插入只能使用已有教学内容，其重分析是 UI 行为回归，不能计入独立语法句子。

基线、答案和查询均绑定代码内固定 SHA-256，缺失、修改、自行重算、历史重用与内部重复必须拒绝。初次行为执行的发现另记，人工答案不随失败输出修改。

## 首次检查与修订

第一次执行 203 项断言，196 通过、7 失败，详见 [首次行为记录](../verification/stage32-first-run.json)。其中 5 个初稿答案误把单数主语后的 read/cut/hit 当成现在/过去歧义或三单错误。阶段 21 已明确 `She read` 只能是过去，阶段 30 也保留过相同 read 初稿错误；这些词在当前单数教学范围的现在式必须是 reads/cuts/hits。保留原始 JSON/哈希、全部原句与 ID，依据这些既有人工约定补上完整过去时答案，另增一组 do + reads 原形纠错和 4 个复数同形歧义输入。另纠正地点短语里第二个 quiet 的区间算术，不改变角色或父节点。

最终 186 个输入仍含全部原始 180 个输入：100 个正确句、60 个互斥对照、21 个额外控制句及 5 个初稿复核回归。答案修订见 `tests/fixtures/stage32-answer-review.json`。初稿和修订稿均绑定固定哈希，不删除样例，也未重算开发基线。独立语料只用于验收，不加入网页教学例句。

20 个新独立词典流程另保留 1 个开发素材回归。given 已出现在网页查询 placeholder 中，因此保留其原查询 ID/流程却不计为独立输入，新增 fed。初稿查询字节和哈希同样保留。第一次浏览器检查还纠正了测试工具的假设：give 来自项目维护词表，不应要求它显示仅 LemmInflect 来源才有的许可链接；页面行为正确。所有词条分别按真实审核来源检查。

唯一生产修复是规则 0.22.4：`What + 名词短语 + can/will` 错序问句不再因第二项为限定词而转入 what 感叹解析分支。原独立答案保留 unsupported / unsupported-structure / 无节点 / 无建议；完整 what 感叹及全部历史行为保持回归。联合清单、查询能力元数据和当前版本断言同步到 0.22.4；词典仍为原审核 1.7.0，内容哈希不变。

## 最终交付证据

macOS / Node.js v24.14.1，5494 项测试通过、无失败或跳过，包括原有 5271 项以及阶段 32 的 223 项。TypeScript、全仓 ESLint、词典 verify、构建、暂存/未暂存 diff 检查通过。331 个冻结来源从原 Git 提交重读核验，内容、输入集合和固定基线哈希完全相同；原 12/18/25 独立性与来源检查保留。构建仅有既有环境代理和 Vinext 路由分类提示。

空磁盘工作库初始化后重建当前固定发布，验证 231 词条、确定性导出和客户端快照逐字一致；新进程在独立源码/数据目录重放全部 186 个答案。过期审核哈希、未审核发布和篡改发布拒绝；修订并重新审核的新发布不改变原 1.7.0。

开发 5188 与隔离构建 5189，Chromium 147.0.7727.15：

- 两个地址各在 1280px 与 390px 核对全部 186 个输入、分类、原文展示、成分/定语/分句归属、分句进入/返回焦点；20 条建议逐个应用并重新分析，完整控制答案一致。
- 两个宽度各完成 20 个独立词典流程加 given 回归：键盘搜索、筛选、词形/搭配、真实来源、教学插入、旧建议失效、焦点与显式重新分析。两种服务的 fed 查询另通过真实内置浏览器 Tab/Space/Down/Return 原生筛选，观察到动词选中、feed 单结果和 past/participle 两个身份。
- Ctrl/⌘+Enter、连续点击、真实延迟 500ms 的分析中编辑与教学插入取消通过；注入可恢复的 tokenizer 异常后，输入保留且重试成功；未知词定位选中原文，未改写输入。
- 真实开发文件监听器分别改变规则、词典版本、哈希，无页面 reload，旧结果/建议立即失效且输入保留；版本恢复后的滞留回调不能恢复旧结果。最终所有文件逐字恢复，见 [HMR 记录](../verification/stage32-dev-hmr.json)。
- 1000/1001 UTF-16、长短语、read/her/carried 同形、多搭配与高候选压力通过；共享预算上限 4000，限额 0/1/10 直接耗尽时清空分类/节点/建议。8 个压力案例在每种服务/每个宽度各采样 5 次。
- 静态资源加载后断网运行，请求 0；浏览器 console、服务日志没有测试输入或私密查询哨兵，localStorage/sessionStorage/IndexedDB/cookie 为空，刷新恢复默认句子、空查询和全部词性。隔离目录仅复制 dist，无词典维护源码、数据或数据库；Wrangler 自身 cache metadata.sqlite 属于运行时缓存，未作为词典维护库。

本机性能证据：冷词汇模块导入（含依赖）30.3ms，580 个表面索引；快照 213658 bytes / gzip 16194 bytes。8 个压力案例各 100 次同步分析，P95 最高约 15.9ms；每种浏览器服务各 80 个点击到渲染样本，开发最大约 48.0ms、构建最大约 10.2ms，观测阶段无 longtask。并行本机负载、浏览器布局和开发模块加载影响这些数字，它们不是其它设备的性能保证。

证据：[联合交付](../verification/stage32-delivery.json)、[开发浏览器](../verification/stage32-dev-browser.json)、[构建浏览器](../verification/stage32-built-browser.json)、[性能](../verification/stage32-performance.json)、[隐私与隔离](../verification/stage32-privacy.json)、[原生键盘](../verification/stage32-native-keyboard.json)。

复核命令（已准备 Playwright/Chromium，并设置 PLAYWRIGHT_MODULE / PLAYWRIGHT_CHROMIUM_EXECUTABLE）：

```sh
node scripts/stage32/freeze-development.mjs
node --experimental-strip-types scripts/stage32/check-performance.mjs
CLAUSE_BASE_URL=http://127.0.0.1:5188 node tests/ui-stage32.mjs
CLAUSE_BASE_URL=http://127.0.0.1:5189 node tests/ui-stage32.mjs
CLAUSE_BASE_URL=http://127.0.0.1:5188 node tests/ui-stage32-hmr.mjs
```

主浏览器脚本支持 CLAUSE_STAGE32_REPORT / CLAUSE_STAGE32_SCREENSHOT，HMR 脚本支持 CLAUSE_STAGE32_HMR_REPORT。测试工具仅使用固定开发/验收语料，应用不加载录制 hook 或任何验收输入。

本轮阶段 27–32 完成交付，仍为准备依赖后的本地网页。PWA/安装包、范围外语法、在线维护、源码同步与公开部署按后续独立范围排期，当前未执行提交、推送或公开部署。
