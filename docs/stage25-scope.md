# 阶段 25：独立复核与本地交付

2026-10-03 实施。状态：✅ 已完成。独立人工答案、实现复核、工程检查、浏览器验收及文档均完成。本轮阶段 19–25 的本地交付结束；生产规则保持 **0.18.0**，词典保持 **1.2.0**、149 个审核词条，哈希 `1ca918e6aece84056d8548cf3b6ac9f0cad3945acdc1bf861bc9cba13645bbce`。没有新增语法范围。

## 先冻结，再固定独立答案

工作树开始时干净。首次运行独立行为复核前，从固定提交 `5c527e892e2adf8341655f2242896c4106d9c020` 冻结 135 个来源文件及 5611 个规范化字符串，包括当前测试、fixtures、历史基线、迁移、教学内容、范围文档和检查器。`tests/baselines/stage25-development.json` 保存来源路径、UTF-8 SHA-256 和字符串的全部来源；payload 的 JSON.stringify SHA-256 为 `7a0ff0a5349c0d8eb6cf92ee071ef7e795b166c653e31a4c675fd00c476b7541`，在 helper 中固定。字符串数包含元信息和非句子字面量，不等同于句子数。

提取沿用 recursive JSON strings / quoted source literals v1，规范化沿用 lowercase + 合并空白 + trim。历史基线和旧原始 fixture 一并进入来源；不扫描未来工作树来重写基线。独立来源 checker 从固定 Git 对象重提取并逐项核对文件哈希、集合和来源；常规测试直接验证已冻结内容，不依赖 Git 历史。

`tests/fixtures/lexicon-acceptance.json` 为人工声明的静态答案：

| 类别 | 数量 | 范围 |
|---|---:|---|
| 词汇扩容 | 30 | 新名词/形容词/动词、五种句型、疑问及审核被动 |
| 拥有义 have | 15 | 现在/过去、do 否定及疑问、明确名词短语宾语 |
| 否定缩写 | 15 | 全部 11 种白名单、直/弯撇号及现有谓语链 |
| 既有组合与分句混合 | 20 | 10 个谓语组合、10 个 and/but/because/if 两分句 |
| 可安全修改错误 | 15 | 有限助动词一致、唯一分词、拥有义基础纠错及缩写一致 |
| 禁止自动修改/范围外 | 25 | 多候选、桥接与依赖错误、分句、时间冲突、未开放链/疑问、未知词和 Unicode 边界 |

80 个正确输入与 40 个对照内部去重，且均未命中冻结的历史/开发/迁移清单。15 个错误的控制句来自这 80 个独立正确句，控制句不另计数量。每个答案包含完整状态、分类、角色、原文 UTF-16 区间、属性父节点、分句归属/连接关系、原因、建议规则和精确编辑。每个错误另固定完整控制句和应用步骤。

人工先声明角色、片段、修饰词、形态和编辑；仅机械换算位置，没有导入分析器或读取其输出。首次行为复核前，词汇核对去掉尚未审核的 story/bag 草案；协议校验发现 `is` 被机械定位到 `artist` 内部，按独立单词边界修正位置。这些均发生在首次 analyzeSentence 复核前。最终答案文件 UTF-8 SHA-256 固定为 `dc787a182e700c3e9459a51db774f2110e45569f9f8d2af3e5bff65425974a76`。

**首次行为复核 120 个答案全部通过，生产实现无需修复，固定答案没有因分析结果改变。** 独立测试及 checker 比较全部字段，15 个编辑应用后与完整人工控制答案比较；同时核对输入版本、原文、规则版本、词典版本/哈希及建议 ID 过期拒绝。反向检查覆盖历史开发/验收/迁移混入、规范化重复、缺失/篡改/自行重算基线，以及错改分类、角色、父节点、区间、原因和编辑。

## 重建、工程与浏览器

- 全量 `npm test` **2154 项通过**，失败、取消、跳过均为 0；新增阶段 25 共 130 项。类型、全仓 ESLint、构建、词典 verify、历史及 stage25 来源 checker、stage12/predicate/stage25 固定答案 checker、暂存及未暂存差异检查均通过。既有 Node SQLite 实验提示、代理环境和 Vinext 路由分类提示保留。
- 在临时磁盘空库迁移并恢复当前固定发布，149 个审核词条及审核绑定完整重现。导出发布逐字段相同，生成客户端与仓库快照逐字节一致；在独立源码副本加载重建快照，全部 120 个答案和 15 个纠错控制再次通过。初次重建测试误把内存 null-prototype 索引与 JSON 对象原型比较，修正测试为确定性序列化的完整字节比较，未修改生产数据或行为预期。
- 临时库中的审核 A 修改为新草稿 B 后，B 沿用旧哈希审核及未经审核发布均拒绝；显式用 B 当前哈希审核后可发布新的测试版本。旧 1.2.0 发布和客户端字节保持不变。临时测试发布未进入生产，工作库与测试目录自动清理。
- macOS / Node v24.14.1 / Chromium 147.0.7727.15：开发及正常构建服务通过 `ui-stage25`，覆盖 120 个答案、精确原文/角色/属性、分句层级、分类、键盘与焦点；全部 15 条建议在桌面和 390px 手机分别应用并与完整控制比较。
- 两种服务也通过 `ui-smoke`、`ui-stage24` 和 `ui-predicate`（176 个正确/145 个历史对照）：成分与短语查看、进入/返回分句、连续点击、分析中编辑、失败重试、旧建议立即失效、未知词定位、1000/1001 限制及旧行为回归均通过。开发 `ui-stage20` 的真实版本/哈希 HMR 清除旧结果并保留输入，延迟旧任务不能重新显示；构建服务也通过其断网纠错流程。热更新后原快照已恢复并重新 verify。
- 另将仅有 dist 的构建产物复制到独立临时目录，目录中没有源码 lib、词典维护库或 SQLite 文件；启动 Wrangler 本地服务后，完整 `ui-stage25` 再次通过，证明已构建网页的分析不依赖维护数据库。
- 静态资源加载后断网，分析、纠错和重新分析产生零网络请求、页面错误或输入控制台日志；localStorage/sessionStorage/IndexedDB/cookie 均为空。服务器日志不含本轮固定输入；刷新恢复默认例句。390px 构建截图已查看，无横向溢出。输入仅在浏览器内分析，不上传、记录或持久保存。

## 性能与交付限制

新压力样例使用审核的 `read` 三候选、`her` 两候选和 `carried` 两候选，四个有实质结构的 1000 UTF-16 输入含长属性短语、疑问、双宾语、被动与分句歧义。Node 各 100 次，开发/构建浏览器各在桌面/390px 各 5 次。4000 共享预算保持；当前样例实际接受 78–306 次预算消耗，受控零预算全部降级并清除分类、节点和建议；1001 字符拒绝。没有放宽输入或计算上限。

| 本机记录 | 结果 |
|---|---|
| 客户端词典 | 101861 字节，gzip 8251 字节，272 个索引词形 |
| Node 冷词典模块初始化 | 18.81ms，含依赖加载，单次独立进程样本 |
| Node 同步分析 | 四类中位数 0.127–2.427ms，最大 4.757ms |
| 开发点击至结果 | 3.1–8.1ms，40 次；无长任务 |
| 正常构建点击至结果 | 0.9–5.0ms，40 次；无长任务 |
| 无数据库目录构建点击至结果 | 0.9–5.1ms，40 次；无长任务 |
| 页面 loadEventEnd | 开发 1007.7ms，构建 87.6ms，隔离构建 106.8ms |

页面加载值含整页资源与脚本，不等同于单独词典初始化。所有时间只证明本机和这些受限输入，没有普遍性能保证；已有 70 次谓语压力浏览器回归也通过。

本轮交付是准备依赖后的本地网页，`npm run dev` 与 `npm run build` 后 `npm run start` 均已验证。未来时态、新情态链、特殊疑问、通用介词短语和新从句、离线安装包/PWA、在线后台、源码同步或公开部署仍须单独排期。README、当前范围和阶段计划已同步。此次未提交、推送或部署；临时浏览器及服务已关闭。

可复核命令：

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run lexicon -- verify
node --experimental-strip-types scripts/check-stage25-fixtures.mjs
node --experimental-strip-types scripts/check-stage25-performance.mjs
node --experimental-strip-types scripts/check-stage25-baseline.mjs
node scripts/check-historical-baselines.mjs
git diff --check
git diff --cached --check
```

两个来源 checker 需要文中固定 Git 提交对象；常规测试不需要。可选浏览器检查 `node --experimental-strip-types tests/ui-stage25.mjs` 需要已准备的 JavaScript Playwright/Chromium 和本地服务；`CLAUSE_BASE_URL`、`PLAYWRIGHT_MODULE`、`PLAYWRIGHT_CHROMIUM_EXECUTABLE` 可指定环境。现有环境提供 JavaScript Playwright，未安装额外依赖。

工程日志 `/tmp/grammar-25-{tests,types,lint,build}.log`；首次行为日志 `/tmp/grammar-25-first.log`；Node 报告 `/tmp/grammar-25-performance.json`；浏览器日志 `/tmp/grammar-25-{dev,production,isolated}-ui-*.log`，独立报告及手机截图分别为 `/tmp/grammar-25-{dev,production,isolated}-browser.json` 和 `/tmp/grammar-25-{dev,production,isolated}-mobile.png`。这些是本机临时证据，不作为可分发文件提交。
