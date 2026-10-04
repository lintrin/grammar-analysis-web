# 阶段 12：扩展版独立验收与本地交付

> 已归档（2026-10-03）：本页保留对应阶段的计划、范围与验收记录；文中“当前”和“下一步”属于当时版本。现行能力见 [项目说明](../../README.md#当前进度)，后续开发见 [阶段 27–32 计划](../structure-development-plan.md)，历史导航见 [归档索引](README.md)。

验收日期：2026-10-02。规则基线 `0.9.0`，状态 **✅ 已完成**。本轮增加验收资产及交付说明，解析规则和覆盖范围未变；完整离线安装包、双击启动、PWA 与公开部署不在本轮范围内。

## 先固定独立答案

[人工样例](../../tests/fixtures/stage12.json)在执行新输入前固定：简单句、and/but、because、if 各 10 个，共 40 个范围内输入；另有 20 个超范围/错误对照。人工指定句型、用途、时态、成分文本分区、分句归属、连接区间、定语及其父成分、状态与原因，不从分析器输出生成答案。

[辅助转换](../../tests/helpers/stage12-fixtures.mjs)仅按人工指定的文本顺序定位 UTF-16 区间，合并明确指定的不连续动词片段，并检查未归属文本；不调用分析器或推断语法。预期节点与实际节点逐项比较角色、区间、父级、分句元信息与关系，正确句不得出现纠错或失败原因。

复核覆盖五种句型、否定 do/be/can、can 疑问、现在/过去时及 can 空时态、大小写、多空格、重复词、定语、目的地、时间状语和连接标点。主从句只验证限定结构，不评估语义是否合理。运行前检查与既有测试/教学输入去除大小写和空白差异后不重复。

首次执行 40 个范围内答案全部匹配；20 个边界的状态全部符合预期，其中前置 because 带逗号、because 后接带句号的疑问结构这 2 个原因预期写成了 unsupported-structure。复核已有检测顺序（标点先于分句用途）和用途标点约定后，将这 2 项原因预期改为 punctuation；未改输入、成分答案或规则。首轮记录 `/tmp/clause-stage12-independent.log`，原始固定文件 SHA-256 为 `25d320a410ad7a672ac7caa16e49a5319e4ab5f3185c971481d7fc24118a6354`（亦见 `/tmp/clause-stage12-frozen.sha256`）。此修订是原因标签预期的校正，不计作范围内解析失败或规则修复。

## 完成清单

- ✅ 40 个独立答案及 20 个边界对照符合预期。
- ✅ 710 项全量测试、TypeScript、全仓 ESLint、构建及差异检查。
- ✅ 开发服务与构建产物均完成整体浏览器验收。
- ✅ 1000 UTF-16 长输入、重复连接词、大量边界及受控预算降级；性能已记录。
- ✅ 两种本地启动方式、核心流程及 README/阶段状态更新。

## 独立复核结果

| 范围 | 新输入 | 正确（含分类、区间、层级） | 误判 | 无法分析 |
|---|---:|---:|---:|---:|
| 简单句 | 10 | 10 | 0 | 0 |
| and/but 并列句 | 10 | 10 | 0 | 0 |
| because 原因从句 | 10 | 10 | 0 | 0 |
| if 条件从句 | 10 | 10 | 0 | 0 |
| 合计 | 40 | 40 | 0 | 0 |

20 个超范围/错误对照全部按固定状态与原因降级，**0 个错误 complete**，无成分或可应用建议。新样例不重复既有 JSON 答案、测试输入或教学例句（按大小写与空白归一化检查）。该结果只说明这些限定样例通过，不是任意英文的准确率。

## 性能与预算

环境：macOS Darwin `25.6.0`、Apple M3 Pro / arm64、Node.js `v24.14.1`；Chromium `147.0.7727.15`。每项恰好 1000 UTF-16 字符，使用实际词汇填充至接近上限，剩余补空格。Node 耗时包含结果协议验证，10 次预热后测 100 次；本机验收时也在执行工程检查。浏览器对每个输入分别在 1280px 与 390px 测 5 次，从点击至结果 DOM 显示，包含 React 渲染。

| 输入场景 | 消耗边界数 / 4000 | Node 中位 / P95 / 最大 ms | 开发浏览器最大 ms（桌面 / 手机） | 构建产物最大 ms（桌面 / 手机） |
|---|---:|---:|---:|---:|
| 160 个主语定语 | 0 | 0.64 / 8.01 / 34.86 | 28.10 / 27.70 | 4.40 / 5.30 |
| 双宾语边界、150 个定语 | 154 | 0.65 / 1.34 / 4.05 | 4.50 / 6.40 | 2.40 / 3.50 |
| can 疑问主语边界 | 161 | 0.53 / 0.92 / 1.50 | 6.40 / 5.60 | 3.20 / 4.10 |
| if 两分句共用预算 | 159 | 0.79 / 1.00 / 1.48 | 6.70 / 4.60 | 3.40 / 3.60 |
| 249 个重复连接词 | 0 | 0.02 / 0.03 / 0.13 | 4.80 / 3.10 | 1.30 / 1.10 |
| 190 个 give、拒绝错误边界 | 191 | 0.51 / 0.64 / 0.79 | 5.20 / 3.70 | 2.70 / 1.50 |

前四项 complete，后两项 unsupported；超过 1000 的变体均 invalid。数值四舍五入，本地测量不承诺其他设备的延迟。两种服务的性能/手机部分均启用 Long Tasks 观察，**0 次 ≥50ms 长任务**；本轮没有同步阻塞证据，保留当前实现，无需迁移 Worker。

自然长输入未耗尽 4000 次预算，不能将其宣称为生产预算耗尽样例。另以明确注入的 0 次预算，分别验证简单句及 and/but、because、if 的第二分句：第一次候选边界即停止，unsupported + budget-exceeded，分句序号正确，第一分句暂存节点及全部建议均不泄漏。既有共享预算回归继续通过；新增计数检查确认默认预算接受恰好 4000 次并持续拒绝后续调用。无半成品 complete。

原始计时记录：`/tmp/clause-stage12-performance.json`、`/tmp/clause-stage12-browser-performance.json`、`/tmp/clause-stage12-production-performance.json`；可用下列脚本重新测量。

## 浏览器与本地交付

采用 webapp-testing 的服务生命周期助手和环境中已有的 JS Playwright/Chromium（Python Playwright 未安装），两种服务各运行 `tests/ui-smoke.mjs` 与 `tests/ui-stage12.mjs`：

- `npm run dev -- --host 127.0.0.1 --port 5188`。
- `npm run build` 后 `npm run start -- --port 5188`，使用仓库现有 Wrangler **本地模式**运行构建产物。

两种服务均 PASS：五句型/四用途、原文/定语与不连续成分、三类纠错及双建议再分析、三类多分句的进入/返回和焦点恢复、编辑清空旧标注及建议、分析中编辑、连续点击、受控抛错后的失败重试、未知词定位、键盘操作。新脚本还在断网状态逐项运行全部 40 个新正确句与 20 个边界，进入所有多分句的两侧核对原文、句型和时态，复核长输入及 390px 手机流程。

断网分析/纠错/导航期间 **0 个 HTTP 请求**，浏览器日志无新输入；localStorage、sessionStorage、IndexedDB 数据库和 cookie 均为空。重新联网刷新后显示“等待分析”，不恢复独立私有标记输入。无 pageerror；手机无横向溢出。手机整句及分句截图 `/tmp/clause-stage12-mobile.png`、`/tmp/clause-stage12-clause-mobile.png` 已查看确认。两种服务与浏览器均已关闭。

本轮只验证已准备依赖的本地环境。没有重装依赖或验证离线安装，也没有公开部署。构建继续出现环境代理提示及 Vinext 路由静态分类 Unknown 提示；构建成功，本地运行与浏览器流程通过，保留这些既有提示。

## 复核命令与证据

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
node --experimental-strip-types scripts/check-stage12-fixtures.mjs
node --experimental-strip-types scripts/check-stage12-performance.mjs
git diff --check
git diff --cached --check
```

全量从 638 增至 **710（新增 72 项），0 失败**。旧 checker 的 75 个阶段 8 输入及 25 个对照、42 个阶段 9、45 个 10A、55 个 10B 仍全部通过；各用 `node --experimental-strip-types scripts/check-stage<阶段>-fixtures.mjs --implemented` 复核。

浏览器准备 Playwright/Chromium 后，通过 `PLAYWRIGHT_MODULE`、`PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定现有路径，再使用技能助手启动上述任一服务，并顺序执行：

```sh
node tests/ui-smoke.mjs
node --experimental-strip-types tests/ui-stage12.mjs
```

新脚本支持 `CLAUSE_BASE_URL`（默认 `http://127.0.0.1:5188`）及 `CLAUSE_BROWSER_REPORT`（默认 `/tmp/clause-stage12-browser-performance.json`）。两个浏览器脚本属于可选环境验收，不算入 `npm test` 数量。

日志：`/tmp/clause-stage12-tests.log`、`/tmp/clause-stage12-types.log`、`/tmp/clause-stage12-full-lint.log`、`/tmp/clause-stage12-build.log`、`/tmp/clause-stage12-fixtures.log`、`/tmp/clause-stage12-old-fixtures.log`、`/tmp/clause-stage12-browser.log`、`/tmp/clause-stage12-production-browser.log`。临时日志和截图用于本次核对，关键结果及环境已记录在本页。
