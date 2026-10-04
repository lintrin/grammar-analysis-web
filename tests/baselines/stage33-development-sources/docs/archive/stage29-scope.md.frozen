# 阶段 29 范围冻结与验收

状态：✅ 已完成。

三类特殊疑问分别开放：where/when/why 状语 + do/does/did/can/will + 显式主语 + SV/SVO；who/what 直接宾语 + 同样倒装 + 原审核 SVO；who/what 主语 + 现在/过去或 can/will 简单主动 SV/SVO。仅单个肯定疑问，不开放进行/完成/被动、否定疑问、分句载体、强调 do、嵌入、介词悬空或其它 wh 词。where 限六个地点动词且不同时带地点尾部；when 不同时带时间词；why 不同时带原因从句。

who/what 无复数线索采用单数教学范围；需语境的原形一致不自动改成三单，只诊断。明确倒装只有一处原形错误时才提供 DO-BASE-001/MODAL-BASE-001；助动词/词形两处错误不给建议。拥有 have 的主语提问和 do 宾语提问开放，can/will 拥有仍不开放。

必填 questionType=yes-no/wh-subject/wh-object/wh-adverbial/null，顶层与分句同步。历史一般疑问迁移 yes-no，陈述/其它用途/失败/多分句为 null；旧协议拒绝。who/what 原文节点直接作 subject/object，不生成虚构对象；重排仅原 token 引用，区间仍对应原文 UTF-16。what 感叹用途保留，经新修订加用途并重新审核。

人工答案：51 状语提问、21 宾语提问、21 主语提问正确；15 组纠错/完整控制、30 边界，冻结 JSON/sha256 相邻。标点沿用：可无句末标点，肯定问号接受，其它终止符限制。矩阵见 data/grammar/stage29-capabilities.json。

语法依据：[British Council 主语/宾语疑问结构](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/questions-negatives)。验收：3301 项全量测试、TypeScript、lint、verify、build 通过；新 questionType 缺失/错误角色/错误分句分类拒绝另有专项测试。Chromium147.0.7727.15 开发与构建各138个固定答案，三类提问、15组纠错在1280px/390px闭环、原文角色与区间、60次压力、断网/网络日志存储隐私和刷新复位通过。规则0.21.0/词典1.6.0，新增4个疑问功能词、what 新修订重新审核，当前231词条。新增 who 引起的旧未知词/关系从句边界迁移保留原来源。

人工规则 ID 补全：初版机械定位器的默认 ID 没有区分句型与进行体核心。按既有核心解析器的显式 ID 定义固定所有非谓语节点；WH/LOCATION 保留专属 ID，语法范围、角色、分类、诊断与编辑均不变。原字节与哈希保存在 stage29-development-before-rule-ids.json，修订清单记录每项变化；当前测试逐节点核对全部 ID。

最终组合复验（规则 0.22.0 / 词典 1.7.0）：全量 3429 项通过；两种浏览器各核对 143 条人工答案、每个节点规则 ID 及全部修改后控制答案，详见 [联合验收数据](../verification/structure-delivery.json)。

补充范围明确禁止 when/why 与地点尾部组合；即使核心和介词分别受支持，也不能越过本阶段矩阵。5 条补充人工答案保存在 stage29-supplement.json，先固定后执行。

2026-10-03 审查修复（规则 0.22.1）：补齐直接宾语提问的句末时间词与单处纠错；主语提问的完成/进行/被动链及其错误形式统一拒绝。原冻结样例不变，另增 40 条固定预期。3470 项测试及开发/构建各 183 条浏览器答案通过，详见 [修复与验收记录](../verification/wh-review-fixes.md)。

2026-10-03 范围审查修复（规则 0.22.2）：所有特殊疑问统一拒绝地点尾部；五个新增 SV 多处词形错误仅保留诊断，原 SVO 基础纠错保持回归。原冻结样例不变，另增 89 条固定预期；3560 项测试及开发/构建浏览器验收通过，见 [修复与验收记录](../verification/scope-review-fixes.md)。
