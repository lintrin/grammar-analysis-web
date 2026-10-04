# Clause · 阶段 20 数据库与发布协议设计

阶段 19 固定设计；阶段 20A ✅ 已完成建库与草稿维护及验收，20B/C ✅ 已完成，见 [验收记录](archive/stage20bc-scope.md)。本文件定义直接升级的唯一协议，不要求兼容旧库、结果或快照。当前生产分析使用已审核发布的生成快照。

## 数据实体与约束

采用本地 SQLite、现有 Drizzle SQLite schema 与版本化 SQL migration；维护命令使用 Node 内置 `node:sqlite` 的 DatabaseSync（阶段 20A 已验证 Node 24.14.1 / SQLite 3.51.2；最低要求 Node 22.13，已写入启动说明）。数据库放入 `.lexicon/` 忽略目录。仓库保留 schema、迁移、人工导入及固定发布文件。D1 绑定和远程维护不在此交付。

标识均为非空稳定字符串；关系使用外键，外键检查在每次连接启用。所有枚举同时由 SQL CHECK 与应用校验限定，引用列 NOT NULL，禁止悄悄级联删除审核/发布内容。

| 表 | 主要字段 | 唯一性/引用约束 |
|---|---|---|
| lexicon_entries | id, created_at | PK(id)；稳定身份，非用户输入 |
| lexicon_revisions | id, entry_id, revision_number, lemma, part_of_speech, sense, status, person, initial_sound, adjective_uses_json, marker_kind, attributes_json, content_hash | PK(id)、UNIQUE(entry_id, revision_number)；entry FK；status=draft/approved/rejected；属性按 POS 校验 |
| lexicon_forms | revision_id, form_kind, surface, initial_sound | PK(revision_id, form_kind)；revision FK；**surface 非唯一**；noun 必须 singular/plural，verb 必须 base/third/past/participle/progressive，adjective 必须 positive |
| lexicon_frames | id, revision_id, pattern, recipient, complement, allow_progressive, allow_perfect, passive_promotion, allowed_purposes_json, allowed_polarities_json, fixed_tail, location_json | PK(revision_id,id)；revision FK；pattern 属于五种句型，限定组合校验 |
| lexicon_sources | id, version, title, license, attribution, frozen_hash | PK(id)；已被审核引用的来源不可修改，来源更新用新 id/version |
| lexicon_revision_sources | revision_id, source_id | 复合 PK；两个 FK，审核必须至少有一项来源 |
| lexicon_reviews | id, revision_id, content_hash, decision, reviewer, reviewed_at | PK(id)；revision FK；decision=approve/reject；绑定完整修订；不可修改或删除 |
| lexicon_releases | lexicon_version, format_version, lexicon_hash, published_at | PK(lexicon_version)；不可修改/删除；同版本不能重新发布不同内容 |
| lexicon_release_items | lexicon_version, entry_id, revision_id, review_id, frozen_content_json, content_hash | PK(lexicon_version,entry_id)；release、entry、revision、review FK；冻结完整内容，而非查询当前草稿 |

草稿内容哈希由词元、POS、义项、必要属性、全部词形、全部搭配及来源内容联合生成，不包含工作时间戳。ID/引用及词形/搭配排序规则也参与规范化；词元/表面形式限定小写 ASCII 单词（现有固定 `school` 等词汇按 grammar marker 类别保留，不强行变成新名词）。输入句子、结果、历史、遥测没有对应表或写入入口。

初次阶段 20 需把 **全部现有词汇** 纳入单一发布数据：14 动词、14 名词组、9 形容词、限定词/代词/助动词/副词/连接词/标记。不能只迁移实义词而让现有 knownWords 来源漂移。保留 function-word POS 类别和 markerKind（determiner/subject-pronoun/object-pronoun/auxiliary/adverb/connector/marker），许可来源为项目人工维护，记录项目 MIT 许可和来源文件版本。冠词首音按人工表，不按拼写猜测。noun 的单复数人物属性共同审核；verb 五种形式允许同形，同形不得导致 form_kind 记录被合并。

be 的 SVC、go 的固定 to school、SVOO 人物接受者、SVO/SVOC 的宾格代词与当前被动 to/by 约束须在搭配或审核 marker 数据中明示。新数据库校验必须能表达所有旧行为，不能为方便模型删去旧词或放宽旧约束。新实义 have 有独立 sense=possession 修订，只允许简单体、do 否定及肯定 do 疑问；auxiliary-have 仍是独立功能词条，不能竞争后把错误建议合并。

## 修订、审核、发布的状态转换

1. 导入/新增得到 draft。普通导入拒绝审核、发布等保留字段，不能由上传字段设置 approved。相同 ID + 完全相同种子内容再次导入明确无操作；相同 ID 异内容整批拒绝，修改须显式新建修订。
2. 校验 draft 的全部子记录、来源、首音和搭配。review 命令接受修订 ID、预览哈希、审核者标识与显式结论。工具呈现完整待审核内容，结论只绑定该内容哈希。维护工具的用户即人工审核者，本轮不做多人账号。
3. 通过审核后，修订、子词形/搭配、来源引用和审核记录冻结。数据库触发器及命令校验均拒绝原地 UPDATE/DELETE；修改创建新 draft 修订 B，复制 A 的完整内容后应用变化。B 不能继承 A 的审核；未审核 B 不替换已发布 A。
4. 发布接受显式修订 manifest（每 entry 一项）。在事务中重新计算完整修订哈希、检查匹配 approve review、全部引用与约束，然后冻结 release_items、生成发布数据和快照。出现错误回滚整次 DB 写入，临时输出不得被应用使用。
5. 发布数据先写临时文件、校验、原子重命名；若数据库事务或文件完成失败，未最终验证的文件不能成为构建入口。数据库已完整提交但输出失败时允许从相同固定发布重导出，不重新发布。构建只读取指定的完整发布文件，永不读取草稿/运行中的工作库。

固定发布重建使用专用 rebuild 命令，不借普通 import 绕过审核。重建只接受仓库固定、manifest 哈希已核验的数据和审核引用，额外或修改条目拒绝或作为另行普通导入的 draft。版本/内容哈希保证完整性与可重建性，不充当未经认证外部文件的作者签名；不信任任意第三方自带 approve 字段。

## 唯一发布格式与客户端快照

固定格式版本 `1`。固定发布文件路径 `data/lexicon/releases/<lexiconVersion>.json`，客户端生成文件 `lib/grammar/generated/lexicon.json`，应用组合清单 `data/analysis-manifest.json`。阶段 20 初次发布只含旧词，不含阶段 19 的扩容计划数据。

发布文件顶层为 `{ formatVersion, lexiconVersion, lexiconHash, sources, entries, reviews }`。每个 entry 为 `{ id, revisionId, lemma, partOfSpeech, sense, attributes, forms, frames, sourceIds, contentHash, reviewId }`。各 POS attributes 完全校验，禁止意外字段。每个 form 为 `{ kind, surface, initialSound }`，无首音需求时 initialSound=null。每个 frame 为 `{ id, pattern, recipient, complement, allowProgressive, allowPerfect, passivePromotion, allowedPurposes, allowedPolarities, fixedTail, location }`。review 为 `{ id, revisionId, contentHash, decision, reviewer }`；发布/审核时间戳只保存在工作库，不进入可重建快照的内容哈希。

词形 kind 和 frame 字段按当前词典准确迁移。recipient 只为 null/person；complement 为 null/single-adjective/noun-or-single-adjective；passivePromotion 为 null/direct-object/direct-object-or-recipient。固定搭配枚举仅开放代码已实现的组合；不能通过添加任意 frame JSON 启用语法。have 的 possession frame 不允许进行、完成或被动。

序列化规定：UTF-8、字段名按 ASCII 顺序递归排序、对象无额外空白；数组按稳定 id 排序，forms 按 kind 排序，sourceIds/adjective uses 等集合按 ASCII 排序；所有字符串不做隐式词义或来源修正；文件末尾换行不参与摘要。`lexiconHash` 是去掉顶层 lexiconHash 后规范化完整发布文件的 SHA-256 小写 64 hex。修订 contentHash 同样计算去掉其 contentHash/reviewId 后完整修订及展开的版本化来源内容。审核 reviewer/reviewId 属于发布内容，但不参与被审核词条的修订哈希，避免循环引用。

客户端快照由此发布数据生成，包含 formatVersion、lexiconVersion、lexiconHash、来源归属和纯词条数据，不携带维护时间戳/审核者。按规范化 surface 建索引到候选数组（entryId、revisionId、formKind、frameId），排序只决定确定性遍历顺序，不决定语言解释优先级。发布文件与客户端快照不同：客户端 lexiconHash 引用完整发布哈希；构建重新验证发布文件、重生成客户端字节并比对仓库产物，禁止篡改客户端索引后沿用原哈希。

阶段 20A 已交付 init/migrate、import、query、revise、validate 和完整修订 show；20B/C 已交付审核、发布、重建及客户端命令。完整维护 CLI 交付命令：init/migrate、import、query（lemma/surface/POS）、revise、validate、review、publish、export-release、rebuild、generate-client、verify。无环境数据库时 build 仍使用固定发布和生成客户端，缺失/非法则明确失败，不回退旧手写词典。构建不得悄悄生成或审核新内容；生成是显式开发命令，verify 检查确定性。

当前联合清单为规则 `0.23.1` + 词典 `1.8.1`（formatVersion=2），232 个完整词条、100 个实义词元与 105 个实义搭配；1.0.0–1.7.0 的历史发布仍冻结保存。阶段 26 从开源固定词形子集新增 73 个审核动词，见 [阶段 26](archive/stage26-scope.md)。新增 57 条草稿来源、逐词范围和发布重现见 [阶段 21](archive/stage21-scope.md)。`rebuild` 使用当前清单锁定的版本，不默认回到旧种子。

## 分析版本与失效

应用清单固定 `{ ruleVersion, lexiconVersion, lexiconHash, lexiconFormatVersion }`。构建同时验证：代码 RULE_VERSION、支持的格式版本、固定发布版本和重算哈希、生成快照字节及代码支持的词形/搭配枚举。联合清单不匹配即失败。规则单独升级可继续引用同一个不可变词典发布，但必须更新清单组合。

`AnalysisResult` 新增必填非空 lexiconVersion 和符合 64 hex 的 lexiconHash。所有状态均带元信息；validateAnalysisResult 拒绝缺失/格式错误；applyCorrection 除原有校验外核对当前打包组合，词典版本或哈希变动均拒绝。类型、所有构造入口、受控预算测试和固定结果字面量直接迁移，不保留旧协议兼容。

界面监听整个组合；变化时清除结果/建议、保留输入，分析开始捕获组合，结束再核对，旧组合的延迟结果不得显示。热更新同样验证此行为。分析只读已打包快照，不进行在线词典刷新、不上传句子。

统一 candidate 查询覆盖简单句、所有用途、谓语链和两分句。枚举候选与完整搭配使用同一次共享计算预算；耗尽返回 budget-exceeded，无节点/建议。同形/多搭配能产生多个完整有效解释时返回 ambiguous，不以 first/find 偷选。初始化体积、时间及候选数需在 20C 实测。

## 阶段 27–30 历史数据约束（格式 1）

frame 的 fixedTail 仍为必填字段，有限域为 null、"to school"、"location:in,on,near"、"location:in,on,under,near"。null 不提供额外尾部；to school 保留 go 的固定尾部；location 只为六个审核 SV 提供可省略的单地点短语许可。schema、SQL 0002、CLI 与客户端共同校验，不增加可选字段或旧格式默认值。迁移逐列保留既有行并重建全部 frame 冻结及集合触发器。

阶段 27–30 import/selection 与不可变发布 1.4.0–1.7.0 可在空库逐阶段重建。will、地点介词、疑问功能词均经词典审核接入；eat/read/write/open/close 的原 SVO 不变，新 SV 使用独立稳定 frameId。data/grammar 能力矩阵限制每个新 frame 的用途与结构组合，候选必须保留 entryId/frameId 身份，不能跨搭配合并。

结果协议新增必填 modal 与 questionType，顶层和各分句均显式给值；旧缺字段结果拒绝。当前规则版本、词典版本和哈希共同绑定分析与建议。完整实现及验收见 [阶段 30](archive/stage30-scope.md)。

## 阶段 20 验收门槛

20A：空库迁移、完整旧词幂等导入、查询、修订、非法子记录/引用/ID 拒绝、批量事务回滚。20B：完整修订审核、A→B 修改须重新审核、伪造审核/过期哈希/同版本异内容拒绝、A 发布不可变、失败无可用半成品、重建与重复导出字节/哈希一致。20C：联合清单、格式/篡改拒绝、候选/歧义/预算、全部旧语法与纠错回归、词典版本/哈希旧建议拒绝、界面旧结果和延迟结果失效。

每小阶段执行全量工程检查、相关浏览器回归并记录；20A/B/C 全部完成才将阶段 20 标注 ✅。开发服务和构建产物在静态资源加载、关闭维护数据库并断网后，仍完成分析与纠错。网络、控制台、local/session storage、IndexedDB、cookie 和 SQLite 中均无用户输入或结果。

### 20A 实施约定

`data/lexicon/seed.json` 保存人工完整旧词表。功能词每个类别/表面词独立修订，forms 使用 `marker` kind，attributes 包含 `markerKind` 和限定 `uses`；跨类别同形保留。finite-be 功能词关联 SVC 搭配，be/been/being 的桥接身份单独保存。`uses` 明确宾格接受者与直接宾语差异、to/by 限定用途等；用途集合不代表所有用途/体/极性的笛卡尔积都可解析，20C 仍须遵守人工句式范围。

SQL 的 person/initial_sound/adjective_uses_json/marker_kind 是 attributes 的约束辅助列，validate 检查与完整属性一致。词条内容哈希覆盖稳定 entry/revision ID、完整规范化词形/搭配及展开来源。来源记录以新 ID/version 更新，原记录均冻结；CLI 修改一律创建完整新修订。冻结表的 BEFORE INSERT 保护同时覆盖主键、修订编号唯一键与显式 rowid 冲突，拒绝 REPLACE 的隐式删除，不依赖 recursive_triggers。迁移使用生成 schema SQL 和独立 custom guard SQL，两者及 Drizzle snapshots/journal 均纳入仓库。维护迁移在单一事务中执行并检查文件摘要，不能悄悄改写已应用迁移。

审核/发布表与基础冻结约束在 20A 建库时预置，20A 交付时尚无审核/发布 CLI、发布产物或重建功能；后续 20B/C 已交付并验收。记录见 [20A](archive/stage20a-scope.md)。

阶段 31 本地查询复用该客户端快照，不读取 SQLite。能力说明与规则/发布版本和哈希绑定，教学例句逐词条/搭配固定；CLI `verify` 和构建检查元数据版本、例句覆盖和功能用途说明。详情与证据见 [阶段 31](archive/stage31-scope.md)。

## 阶段 33B 当前唯一格式 2

frame.location 必填，可为 null，非空时严格为 policyId、attachment、presence。新 finite-be 的独立 location 搭配为 SVC / location-phrase / basic-object-location / complement / required；primary 搭配不变。六个旧 SV 使用两种 legacy 政策 / adverbial / optional，保留原许可。fixedTail 当前仅 null / to school。地点介词必填 attributes.locationHeadPolicies，basic 政策列出已选择名词词条 ID，legacy 的 null 表示完整审核名词短语，缺键表示禁止。

`legacy-sv-location` 与 `legacy-sv-under-location` 的值只能为 null，不接受中心词数组；旧 SV 解析没有按中心词限制的权限。词条归一化与集合校验使用同一政策结构，导入、修订、数据库审核、发布及发布校验均拒绝此类数组，避免审核数据含有运行时不会执行的限制。`basic-object-location` 仍要求非空、无重复的已选择名词 ID 数组。固定发布及客户端快照无需变更。

where 新增 wh-complement，结果协议限定原文 where + finite-be 的简单 SVC、simple、active、无情态及角色位置和时态。词库收录不代表解析已开放，规则实现待 33C，界面及查询扩展待 33D。

默认库 `.lexicon/working-v2.sqlite`；0003 仅允许空旧结构库升级，非空格式 1 数据库原子拒绝，旧发布及 SQL 0000–0002 原样保留。生产工具只接受格式 2。`current-seed.json` 为最小维护样例；stage33-import / selection / 1.8.0 为完整发布。110 条新修订重新绑定审核，121 条未改内容与审核身份保留。历史格式测试使用固定提交的测试专用工具，所有旧句子行为仍验证当前分析器。详细证据见 [33B 实施记录](stage33b-protocol-lexicon.md)。

33C 在保留 1.8.0 全部词条和审核的基础上增加 bag/bags，以满足先前冻结的正确句，发布 1.8.1；地点政策不增加 bag。新解析已实现，范围见 [33C 实施记录](stage33c-location-parser.md)。
