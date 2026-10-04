# 同一 tab 的语法检查与成分解析

## 实施前固定的范围与预期

- 结果区只有一个「语法检查与成分解析」tab，先展示「01 语法检查」，检查通过后自动展示「02 成分解析」，无需切换或再次点击。
- 通过仅表示输入完整匹配当前本地规则（`status=complete`），不表示覆盖任意英文的全部语法。复用既有规则匹配和原文成分，不重复运行分析器。
- `She sleeps.`：通过检查，展示主语、谓语；`She sleep.`：展示主谓一致建议，不展示成分；应用建议后输入成为 `She sleeps.`，重新检查通过并展示成分。
- `They read the book.`：保留时态歧义，不进入成分解析；`She likes music.`：词典未覆盖，可定位原文，不进入成分解析；空白输入：提示输入无效，不进入成分解析。
- `She sleeps and he smiles.`：通过当前规则后保留分句进入、返回和焦点行为；保留简单句短语内部定语。
- 从旧 `ui-stage20.mjs` 保留离线回归：`Our young teacher give the girls an old picture today.` 有一条一致性建议，应用后为 `Our young teacher gives the girls an old picture today.`；`She has sent him a book.` 检查通过并展示四个顶层成分。两种屏幕尺寸均验证快捷键、无横向溢出及输入不进入请求、日志或存储。版本／哈希失效及旧回调拒绝由 `scripts/stage33/check-hmr.mjs` 继续覆盖。
- 无建议但未完整匹配不能视为检查通过。错误、范围限制和歧义分别保留现有说明。
- 修改输入、选择教学例句或分析中编辑立即清除旧检查、建议和成分；旧回调不能覆盖新输入。键盘快捷键、手机布局、失败重试与版本失效继续回归。
- 输入仍仅在浏览器内处理，不上传、不写日志或持久保存；刷新恢复默认输入。全部历史人工语法答案保持不变，仅迁移浏览器的 tab 定位。

人工预期复核：时态歧义例句使用 `They read the book.`。原草稿中的 `She read the book.` 不能作为歧义控制：she 的一般现在时需用 reads，read 在此只能作过去式。按人称一致规则修正例句，既有分析答案不变。

## 验收

✅ 已完成实现、工程检查、开发/构建浏览器验收与文档（2026-10-04）。

- `npm test`：5497 项通过，无失败；TypeScript、全仓 ESLint、词典校验、构建与暂存/未暂存 diff 检查通过。
- 开发服务和最终构建服务运行 `tests/ui-analysis-flow.mjs`，覆盖 1280px/390px、单 tab 顺序、自动解析、应用建议后的重新检查、无建议的拒绝状态、原文定位、定语/分句焦点、Ctrl/⌘+Enter、待处理分析取消、断网及刷新复位；检查范围说明可键盘展开/收起。桌面和手机截图已人工查看。
- 两种服务均运行 `tests/ui-stage32.mjs`：每种尺寸保留 186 个完整人工答案、20 个纠错应用流程、20 个独立查询流程及额外查询回归；80 个压力样本、连续点击、失败重试与隐私检查通过。旧浏览器脚本迁移到同一 tab，原有语法断言与 fixture 未改动。
- 断网分析、建议应用和导航均无请求，输入未进入控制台或浏览器持久存储；页面错误为零。构建仍有既有代理环境及 Vinext 路由分类提示。
- 语法匹配算法、词典、结果协议和版本均未变化。检查通过仅指当前支持范围，范围外输入不承诺正确性。

联合证据见 [验收记录](verification/analysis-flow.json)。复核命令（使用项目现有 Playwright 环境）：

```sh
CLAUSE_BASE_URL=http://127.0.0.1:5188 node tests/ui-analysis-flow.mjs
CLAUSE_BASE_URL=http://127.0.0.1:5189 node tests/ui-analysis-flow.mjs
CLAUSE_BASE_URL=http://127.0.0.1:5188 node tests/ui-stage32.mjs
CLAUSE_BASE_URL=http://127.0.0.1:5189 node tests/ui-stage32.mjs
```

`PLAYWRIGHT_MODULE` 与 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 的设置方式沿用 README。`CLAUSE_FLOW_REPORT` 可指定单 tab 验收报告路径；报告不包含输入句子。

2026-10-04 测试清理复核：移除重复的阶段 20 浏览器入口及写死旧版本的阶段 32 HMR 入口，固定离线用例合入现有单 tab 回归。清理前后均为 5803 项测试通过；类型、ESLint、差异检查通过。开发服务的 1280px/390px 浏览器回归与阶段 33 的 7 项真实 HMR／回调／失败重试检查通过，源文件逐字节恢复，手机截图已查看。此次只调整测试与文档。
