# 阶段 10B：前置 if 条件从句

规则版本 `0.8.0`；状态 **✅ 已完成**（2026-10-02）。以下范围与人工答案先于规则实现固定。

- 仅接受 `If + 条件从句, + 主句`，if 位于句首，条件从句后必有且仅有一个英文逗号；句末可有一个句号。两侧均为显式主语、完整匹配既有规则的陈述结构。
- 沿用五种句型、否定、can、受支持现在/过去时；保留大小写、多空格与 UTF-16 原文位置。不加入 will/would、虚拟条件、时态搭配纠正，也不推断语义或反事实含义。
- 顶层 complex / declarative，pattern 与 tense 为空。按原文顺序两个 clause 标记 subordinate / main，分别保留句型、时态和内部定语归属。connector 为 condition，两个区间分别覆盖 if 与逗号；两段可单独选中同一连接节点，条件从句不被包含在连接区间内。
- 不支持后置 if、缺失/多余逗号、嵌套与混合连接、其他用途、关系/宾语从句、省略主语和其他标点。任一分句未完整匹配时整句降级，无成分和纠错建议；保持共享 4000 次边界预算和 1000 UTF-16 输入上限。
- 人工预期见 `tests/fixtures/stage10b.json`：16 个正确句、39 个边界/错误句；正确句均固定完整位置和层级。阶段 10A 的 `If she sleeps, he smiles.` 保留历史拒绝答案，通过显式迁移记录引用阶段 10B 答案，其他旧样例保持原行为。

## 实际验收记录

- 实现前 55 项固定测试：34 通过、21 失败；实现后 55 项均符合人工答案，未依据分析器输出改写预期。16 个正确句、39 个边界/错误句覆盖五种句型、否定、can、时态、定语、多空格、大写、重复词、逗号和无句末标点。
- `npm test`：**592 项通过，0 失败**。新增 55 个固定输入和 24 项协议、安全与迁移测试，涵盖 if/逗号遗漏、错误区间、主从交换、跨层归属、隐含成分、顶层分类及复杂句纠错拒绝；注入预算验证第一分句完成后第二分句耗尽，全句不泄露节点与建议。1000 UTF-16 上限、结果独立性和历史迁移验证通过。
- `node --experimental-strip-types scripts/check-stage10b-fixtures.mjs` 和 `--implemented`：55 项答案完整性与实际比对通过。阶段 10A 的 45 个输入、阶段 9 的 42 个输入、阶段 8 的 75 个输入与 25 个对照继续通过对应 checker 的 `--implemented` 检查。答案完整性检查不替代语法验证。
- 10A 的唯一 if 边界按显式迁移引用 `if-01`，历史 0.7.0 拒绝答案保留；单独验证 0.7.0、0.8.0、0.9.0 和 0.10.0 的迁移选择。其他 because/and/but 行为及旧纠错流程保持通过。
- macOS / Node.js v24.14.1；`npx tsc --noEmit`、相关变更文件 ESLint、`npm run build`、未暂存和暂存 `git diff --check` 全部通过。构建保留既有代理环境与 Vinext 路由分类提示。
- `tests/ui-smoke.mjs`：复用主从句导航回归，新增条件身份、LINK/SC/MC 骨架、if 与逗号选择同一关系、完整原文、不同句型的表语/宾补、can 与混合时态、定语、键盘进入/返回与焦点恢复、编辑失效、错误句无建议；保留已有全部流程，全部通过。
- 390px 手机断网完成条件句分析与两分句切换，无横向溢出、零输入 HTTP 请求、无句子日志或持久存储，刷新不恢复输入。整句与条件从句截图已核对，测试服务已停止。

工程日志：`/tmp/clause-stage10b-tests.log`、`/tmp/clause-stage10b-types.log`、`/tmp/clause-stage10b-lint.log`、`/tmp/clause-stage10b-build.log`、`/tmp/clause-stage10b-browser.log`。浏览器通过 webapp-testing 的 `with_server.py --server 'npm run dev -- --port 5188' --port 5188 -- node tests/ui-smoke.mjs` 管理服务，配置现有 `PLAYWRIGHT_MODULE` 与 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 后可复核。

阶段 10B 交付时的下一阶段为 11，后续完成情况见下方说明。

后续 [阶段 11](stage11-scope.md) 已完成结构化原因、未知词定位和学习反馈，当前规则为 0.9.0；本页继续保留历史交付记录。[阶段 12 独立验收](stage12-scope.md) ✅ 已完成，当前全量为 710 项测试。
