# 阶段 33B：协议与词典升级

2026-10-04，33B ✅ 完成。当前规则 `0.23.0`、词典 `1.8.0`、格式 2；阶段 33 整体尚未交付，下一步为 33C 解析与安全纠错。

生产词库的 frame.location 必填，可为 null；非空对象严格为 policyId、attachment、presence。五个 finite-be 词条保留原 primary 搭配，增加独立 location 搭配：SVC / location-phrase / basic-object-location / complement / required。六个旧 SV 迁移为两种 legacy 政策、adverbial / optional。fixedTail 当前仅允许 null / to school。

介词 attributes.locationHeadPolicies 是地点许可的唯一审核数据来源。basic 政策显式列出名词词条 ID，覆盖冻结的十组配对；legacy 的 null 表示完整审核名词短语，缺键表示禁止。数据集验证政策引用和已选择名词，不添加第二份运行时白名单。where 保留 wh-adverbial 并增加 wh-complement；结果校验限定简单 SVC、simple、active、无情态及原文 where + finite-be 的角色位置和时态。

110 条修改记录采用新修订 ID 和新哈希审核，121 条未改记录保留原内容与审核身份。全部词形和旧搭配字段逐项比对，原格式 1 发布及 SQL 0000–0002 保留原字节。生产工具只接受格式 2；测试专用历史工具从固定提交 0c5dbfb4940efd87ba87c7530f747168bcc1f003 重放原发布，旧句子断言仍验证当前分析器。

默认维护库改为 `.lexicon/working-v2.sqlite`。迁移 0003 只升级空结构库，非空旧库原子拒绝，不改写冻结数据；SQL 与应用共同拒绝错误政策、缺字段、额外字段、错误搭配及审核后的修改。空库重建、确定性导出、过期审核哈希拒绝及旧库回滚均有测试。

复现命令：

```sh
node scripts/stage33/prepare-lexicon.mjs
node scripts/stage33/publish-lexicon.mjs
npm run lexicon -- generate-client
npm run lexicon -- verify
npm run lexicon -- init
npm run lexicon -- rebuild
```

最小维护样例为 `data/lexicon/current-seed.json`。完整发布采用 stage33-import.json、stage33-selection.json 和 releases/1.8.0.json。审核明细见 [数据记录](verification/stage33b-data-audit.json)，工程及浏览器证据见 [检查记录](verification/stage33b-checks.json) 和 [浏览器记录](verification/stage33b-browser.json)。

5520 项测试全部通过，TypeScript、ESLint、词库 verify、构建及 diff 检查通过。开发服务与最终构建服务核对旧地点状语、旧 where 动作提问、纠错应用、查询及当前联合版本；桌面与手机布局复核完成。构建保留现有代理及 Vinext 路由分类提示。

be 地点表语与 where + be 尚未实现解析，也不提前进入教学查询。三条历史行为迁移、全部冻结开发答案在 33C 接入；原 fixture、初稿、首次差异与来源哈希保持冻结。33D 界面、33E 独立验收和 33F 性能、隐私及联合交付仍待实施。
