# 阶段 27 范围冻结与验收

状态：✅ 已完成。2026-10-03 基线：2973 项全量测试、TypeScript、lint、build、lexicon verify、暂存/未暂存 diff 检查通过。

27A 冻结：顶层和分句必填 modal=can/will/null；普通结构为 null；can/will 简单主动为 tense=null, aspect=simple, voice=active。多分句顶层 modal=null，失败清空分类。旧协议缺 modal 拒绝。历史冻结文件不改写，以显式分类迁移函数为当前答案补字段。

能力矩阵见 data/grammar/stage27-capabilities.json。开放五种现有主动简单搭配和 will be 系表、肯否陈述及肯定一般疑问。拥有 have、新链、否定疑问不开放。will 可出现在 and/but/because 两侧和 if 主句；if 条件从句 will 不开放。today 可用，yesterday 不提供时态猜测或建议。27C 仅否定陈述 won’t/won't；完整 token 不拆区间。

人工答案在首次新行为检查前冻结于 tests/fixtures/stage27-development.json，哈希相邻文件。40 个正确句、15 组错误/完整控制句、25 个边界；后续补充两分句固定答案单独记录。词形纠错保留 MODAL-BASE-001，须完整搭配、唯一候选、单处错误。

语法依据：[British Council 情态词](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/modal-verbs)。形式分类不推断意愿、预测或请求。

验收：3070 项全量测试通过，TypeScript、全仓 lint、词典 verify、build 通过；Chromium 147.0.7727.15 开发 80 / 构建 92 个固定答案、全部 15 组纠错在 1280px/390px 应用后重新分析、分句层级、键盘焦点、1000/1001 上限、60 次压力样本、断网无请求/输入日志/存储及刷新复位通过。构建服务需在重建静态资源后重新启动；已重启复验。规则 0.19.0 / 词典 1.4.0，新增1个审核功能词。历史语句的显式旧/新迁移见 structure-migrations.json，历史源和基线哈希保持不变。

人工规则 ID 补全：初版机械定位器的默认 ID 没有区分句型与进行体核心。按既有核心解析器的显式 ID 定义固定所有非谓语节点；WH/LOCATION 保留专属 ID，语法范围、角色、分类、诊断与编辑均不变。原字节与哈希保存在 stage27-development-before-rule-ids.json，修订清单记录每项变化；当前测试逐节点核对全部 ID。

最终组合复验（规则 0.22.0 / 词典 1.7.0）：全量 3429 项通过；两种浏览器各核对 92 条人工答案、每个节点规则 ID 及全部修改后控制答案，详见 [联合验收数据](../verification/structure-delivery.json)。
