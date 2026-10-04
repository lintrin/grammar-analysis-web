# Clause · 文档导航

## 当前维护文档

| 文档 | 用途 |
|---|---|
| [项目说明](../README.md) | 当前能力、限制、启动方式、词典维护与验证命令 |
| [当前功能清单与开发规划基线](current-features.md) | 按用户能力整理已支持功能、组合限制、运行维护能力及后续候选 |
| [阶段 33–37 总开发计划](stage33-37-development-plan.md) | 阶段 33 ✅；后续限定 SVO 地点、will 进行／完成与联合复核待实施 |
| [阶段 33 开发计划](stage33-development-plan.md) | 阶段 33 ✅：33A–33F 全部完成；下一步为阶段 34 范围冻结 |
| [阶段 33 范围与实施记录](stage33-scope.md) | 人工答案、历史迁移、地点数据设计、首跑差异与继续实施命令 |
| [阶段 27–32 开发计划](structure-development-plan.md) | 27–32 已交付；保留原门槛与后续候选 |
| [词典数据库与发布协议](lexicon-database-design.md) | 现行 SQLite 维护、审核修订、不可变发布、快照与联合版本约束 |
| [单 tab 分析流程](analysis-flow.md) | 先检查语法，通过后自动解析成分；人工预期与浏览器验收 |
| [项目开发规则](../AGENTS.md) | 协议升级、行为回归、人工预期、完成标记和输入隐私要求 |

当前规则 `0.23.1`、词典 `1.8.1`。阶段 1–32 ✅ 已完成，历史记录见 [归档索引](archive/README.md)，当前查询范围、发现与证据见 [阶段 31](archive/stage31-scope.md) 及 [联合验收数据](verification/stage31-delivery.json)，最新复核见 [被动纠错回归修复](verification/stage31-review-fix.md)。此前 27–30 的审查记录保留在 [范围约束审查修复](verification/scope-review-fixes.md)。阶段 32 独立复核、首次发现、人工修订和最终交付见 [交付记录](archive/stage32-scope.md) 与 [联合证据](verification/stage32-delivery.json)。

## 归档约定

已完成阶段的计划、当时范围与验收文档归入 `archive/`，保留原文件名及历史内容，只增加归档说明并修正链接。仍在使用的协议和当前计划留在本目录。

新阶段的范围与验收记录在实施时创建；完整交付后再归档，并同步本索引、归档索引及引用。冻结 fixture、历史基线、来源哈希和 Git 提交中的路径保留原样；它们记录原始来源，不随当前文档移动重写。

[33B 协议与词典实施记录](stage33b-protocol-lexicon.md)：格式 2 数据、审核、空库重建及旧功能浏览器回归。

[33C 地点解析与安全纠错](stage33c-location-parser.md)：冻结完整答案、词条补充审核、历史迁移和浏览器闭环。

[33D 界面与查询](stage33d-ui-query.md)：有限 be 的两类搭配、where 对照、介词数据许可与桌面／手机闭环。

[33E 独立复核](stage33e-independent-acceptance.md)：开发来源归档、88 条独立输入、8 项新查询流程、首次报告与来源审计补充。

[33F 联合交付](stage33f-joint-delivery.md)：5797 项测试、77 项浏览器验收、数据库／隐私／离线／HMR／性能证据；阶段 33 ✅。
