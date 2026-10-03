# 特殊疑问代码审查修复

日期：2026-10-03。状态：✅ 实现、检查、浏览器验收与文档已完成。

当前规则 0.22.1，词典 1.7.0。原阶段 27–30 冻结答案、来源哈希和联合验收记录保持不变。

## 修复行为

- 直接宾语提问保留句末时间词：`What does she read today?`、`Who did she see yesterday?` 完整匹配 SVO，疑问词作宾语，时间词作状语。do/does/did/can/will 均有固定控制答案；will 与 yesterday 仍超出当前范围。疑问宾语在内部顺序中位于时间词之前，移动的仅为原 token 引用，节点与编辑位置仍指向原文。
- 带时间词的单处词形错误继续安全纠正：`What does she reads today?` 仅替换 reads → read，应用后与完整控制答案比较。
- 非情态主语提问直接走简单主动搭配，完成、进行、被动及其错误形式均返回 unsupported/unsupported-structure，不让组合谓语的 partial 候选暴露词形诊断。`Who has slept?`、`Who has sleep?`、`Who is read the book?` 均无节点、分类或修改建议。
- 拥有义 have 保留：`Who has a book today?`、`Who had a book yesterday?` 完整匹配；依赖语境的主语一致仍只诊断、不自动替换。

## 人工预期与回归

新增 [40 条固定答案](../../tests/fixtures/stage29-review-fixes.json) 与 [哈希](../../tests/fixtures/stage29-review-fixes.sha256)，包括 11 条正确句、4 组错误/完整控制、2 条语境一致诊断及 23 条范围拒绝。断言覆盖全部分类、角色、原文区间、规则 ID、原因和精确编辑；保留过期建议拒绝。原冻结样例和断言未删除或削弱。

初始注释曾为 `What will she read yesterday?` 多标一条时态诊断；既有人工固定答案 stage29-development.json 的 29-132 明确规定这种 WH 范围拒绝仅使用 unsupported-structure。按同一人工诊断策略修订，初始字节保存在 stage29-review-fixes-initial.json，修订说明与来源哈希随新答案保存。语法范围、状态、角色、编辑和控制答案不变。

## 验收

3470/3470 项测试通过，无跳过。TypeScript、全仓 ESLint（无警告）、词典 verify、构建及暂存/未暂存 diff 检查通过。

Chromium 147.0.7727.15 在开发服务和最新构建各核对阶段 29 的 183 条人工答案（原 143 条及新增 40 条）。检查全部节点、规则 ID、原文区间、分类、修改应用后的完整控制答案；1280px/390px、键盘、1000/1001 边界、断网分析、网络/日志/浏览器存储无输入以及刷新复位均通过。沿用项目 JavaScript Playwright 脚本；本机 Python 运行时没有 Playwright 包。

完整结果与本机性能样本见 [验证数据](wh-review-fixes.json)。这些样本仅证明本机测量；此前 0.22.0 联合报告仍是历史记录。未实现阶段 31、32，也不将本次开发预期作为独立验收语料。
