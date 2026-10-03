# Clause · 阶段 19 固定范围与人工答案

制定日期：2026-10-02。阶段 19 只交付范围、人工答案和历史独立性保护。阶段 20 ✅ 已完成词典基础；阶段 21 ✅ 已完成新词，阶段 22 ✅ 已完成拥有义 have，阶段 23 ✅ 已完成限定否定缩写，阶段 24 ✅ 已完成安全谓语纠错，生产规则为 `0.18.0`、词典 `1.2.0`。阶段 25 ✅ 已完成整轮独立复核与交付，实际验收见 [阶段 24 记录](stage24-scope.md) 和 [阶段 25 记录](stage25-scope.md)。

## 能力矩阵

词条存在不代表所有义项、用途、体或语态受支持。下表中的“复用”指现有结构范围，不扩大语序、介词、标点或分句数。

| 维度 | 已有复用 | 本轮新增 | 继续不支持 |
|---|---|---|---|
| SV | go（固定 to school）、sleep/smile/run 与已有谓语链 | walk/dance/laugh/cry/wait；不带通用地点或宾语 | 新 SV 被动、任意介词短语 |
| SVO | like/enjoy/see 与已有被动转换 | read/write/buy/carry；阶段 22 拥有义 have | 任意新义项；have 的完成/进行/被动、can have |
| SVC | be + 单形容词或当前名词短语；完成系表 | 新名词和形容词复用补语位置 | be 的进行体系表、比较级、任意表语 |
| SVOO | give/send/show/lend/offer；人物接受者 | teach/tell；人物接受者 + 名词短语直接宾语 | teach/tell 的单宾语、从句宾语、to 形式主动转换、it 接受者 |
| SVOC | make/find + 宾语 + 单形容词 | keep + 同样的限定形容词宾补 | 新旧 SVOC 被动、名词宾补、非谓语宾补 |
| 用途 | 现有陈述、肯定一般疑问；简单体限定祈使和 what/how 感叹 | 新词复用适用的已有用途；have 仅陈述和 do 一般疑问 | 特殊疑问、否定疑问、have 祈使/感叹、无需 do 的拥有疑问 |
| 体/语态 | 现在/过去的简单、进行、完成、完成进行及限定被动组合 | 新动词按词条搭配明确允许，详见清单 | 将来、完成进行被动、get 被动、新 can 链 |
| 肯否/疑问 | 分写 do/be/can/have 否定与肯定倒装 | 阶段 23 固定否定缩写，仅否定陈述 | 缩写否定疑问、肯定缩写、所有格 |
| 分句 | 两个显式主语陈述分句的 and/but、后置 because、前置 If …, … | 新词、have 陈述和缩写复用此框架 | 共享主语、三个分句、嵌套；跨分句修改建议 |
| 纠错 | AGREEMENT-001、DO-BASE-001、MODAL-BASE-001 | 阶段 22 复用 have 基础纠错；阶段 24 唯一谓语替换 | 时态猜测、结构改写、拼写、语义判断 |

这是受限能力矩阵，不是维度的任意笛卡尔积。例如 have 新义项不自动进入原有 can、完成或祈使框架。

## 阶段 21 词汇清单

机器可读的人工清单位于 `tests/fixtures/lexicon-development.json` 的 `vocabulary`。它是范围计划，阶段 21 须经阶段 20 的草稿、校验、人工审核、发布流程进入客户端，不能直接作为生产词典或第二份维护源。

名词均为可数名词。单复数共同继承人物属性和审核首音，暂不加入复合名词、专名或不可数规则。

| 单数 | 复数 | 人物 | 首音 |
|---|---|---|---|
| doctor | doctors | 是 | 辅音 |
| nurse | nurses | 是 | 辅音 |
| worker | workers | 是 | 辅音 |
| farmer | farmers | 是 | 辅音 |
| driver | drivers | 是 | 辅音 |
| singer | singers | 是 | 辅音 |
| dancer | dancers | 是 | 辅音 |
| artist | artists | 是 | 元音 |
| actor | actors | 是 | 元音 |
| uncle | uncles | 是 | 元音 |
| aunt | aunts | 是 | 元音 |
| cousin | cousins | 是 | 辅音 |
| neighbor | neighbors | 是 | 辅音 |
| man | men | 是 | 辅音 |
| woman | women | 是 | 辅音 |
| baby | babies | 是 | 辅音 |
| person | people | 是 | 辅音 |
| mouse | mice | 否 | 辅音 |
| foot | feet | 否 | 辅音 |
| tooth | teeth | 否 | 辅音 |
| apple | apples | 否 | 元音 |
| egg | eggs | 否 | 元音 |
| orange | oranges | 否 | 元音 |
| umbrella | umbrellas | 否 | 元音 |
| car | cars | 否 | 辅音 |
| bus | buses | 否 | 辅音 |
| chair | chairs | 否 | 辅音 |
| table | tables | 否 | 辅音 |
| door | doors | 否 | 辅音 |
| window | windows | 否 | 辅音 |

15 个形容词允许前置定语、be 表语、现有形容词宾补：happy、sad、tired、hungry、angry、calm、busy、tall、short、red、blue、green、clean、quiet、empty。angry、empty 首音为元音，其余为辅音。形容词是有限单词表，不新增比较、最高级或副词规则；多个前置定语继续按现有名词短语规则，不开放多个表语或宾补。

| 词元 | 三单 | 过去式 | 过去分词 | 现在分词 | 唯一主动搭配 | 进行/完成 | 被动转换 |
|---|---|---|---|---|---|---|---|
| walk | walks | walked | walked | walking | SV | 允许 | 不允许 |
| dance | dances | danced | danced | dancing | SV | 允许 | 不允许 |
| laugh | laughs | laughed | laughed | laughing | SV | 允许 | 不允许 |
| cry | cries | cried | cried | crying | SV | 允许 | 不允许 |
| wait | waits | waited | waited | waiting | SV | 允许 | 不允许 |
| read | reads | read | read | reading | SVO | 允许 | 直接宾语提升 |
| write | writes | wrote | written | writing | SVO | 允许 | 直接宾语提升 |
| buy | buys | bought | bought | buying | SVO | 允许 | 直接宾语提升 |
| carry | carries | carried | carried | carrying | SVO | 允许 | 直接宾语提升 |
| teach | teaches | taught | taught | teaching | SVOO | 允许 | 接受者或直接宾语提升 |
| tell | tells | told | told | telling | SVOO | 允许 | 接受者或直接宾语提升 |
| keep | keeps | kept | kept | keeping | SVOC | 允许 | 不允许 |

进行、完成进行只能使用上述允许进行的词条；被动、完成被动、进行被动只能使用审核的被动转换。仍沿用原有 to/by 尾部范围。tell 的内容只接受受支持名词短语；规则不判断 `tell him a book` 等限定结构的语义自然度。teach/tell 的其它义项与单宾语均未收录。

`read` 的原形/过去式/过去分词同形。`They read books.` 不能从拼写唯一选择现在或过去，应返回 ambiguous、原因 ambiguous、无节点或建议。`She reads the book.`、`Does she read the book?`、`Did she read the book?`、`She has read the book.`、`She is reading the book.` 有明确形式线索。查询必须保留同形候选及其形式标签，不得用数组顺序消除歧义。以后加入多搭配亦按完整结构匹配选择；首批每个新动词只审核一个主动搭配。

## 阶段 22–24 的限定范围

拥有义 have 只开放 have/has/had + 名词短语宾语的简单体、do 否定与 do 一般疑问。阶段 22 固定 18 个主正确例（含助动词身份对照和三种两分句）、10 对错误/正确、15 个边界。实义 have 的其它体、语态、can、have to/got、使役和用餐均不开放，否定拥有结构须用 do。

阶段 23 ✅ 已完成。白名单为 don't、doesn't、didn't、isn't、aren't、wasn't、weren't、can't、haven't、hasn't、hadn't；直撇号和 U+2019 弯撇号均接受。11 种各固定 3 个正确句，另有重复缩写与 compound/because/if、21 个未开放形式/标点对照。be/have 缩写只进入已有链；have 否定缩写不能充当拥有否定。

结果沿用唯一位置协议 `ranges: { start, end }[]`，全部为原文 UTF-16 半开区间。内部虚拟的助动词/not 可以共享完整缩写的原文范围，但不得成为两个重叠的显示节点。否定谓语显示原文完整片段；倒装谓语使用既有不连续 ranges；分句位置仍基于整句。缩写替换必须编辑完整缩写 token，保留撇号类型、否定和大小写；禁止展开后再用展开文本的位置。所有区间不能拆开代理对，含 emoji 的边界只能拒绝/降级，不“清洗”输入后分析。阶段 19 的结构校验仍使用当前 ranges 协议，不提前改变生产 token 或结果类型。

阶段 24 ✅ 已完成。新增固定规则 ID `PREDICATE-AGREEMENT-001`、`PREDICATE-FORM-001`。候选必须在同一完整搭配中、确定已有时态/体/语态且替换唯一。前者只改有限 be/have 的一致（含白名单缩写）；后者只替换实义动词为审核的唯一分词形式。例：`She have given him a book.` → `She has given him a book.`，`She is sleep.` → `She is sleeping.`。`She is give her books.` 有 giving/given 两种完整结构，维持 partial 诊断并不给建议。**中间 be/been/being 桥接错误暂不自动修改**，即使某例只剩一个搭配，也保留原来的形式提示；这一收窄是阶段 19 的人工范围选择。

已有 do 基础规则在缩写上复用，不产生第二套规则 ID。`She don't likes books.` 固定两条建议：don't → doesn't 与 likes → like；每次只应用一条，重新分析后再生成当前位置的剩余建议。范围外、未知、时间冲突、否定疑问、多分句均不给修改。共 23 个错误、23 个正确控制、20 个不安全修改拒绝；涵盖原文大写/空格、弯撇号、疑问不连续位置。

## 固定答案与阶段启用

416 个人工开发样例按阶段划分：

| 阶段 | 正确 | 错误 | 边界/无修改对照 | 总数 |
|---|---|---|---|---|
| 21 | 206 | 0 | 34 | 240 |
| 22 | 28 | 10 | 15 | 53 |
| 23 | 36 | 0 | 21 | 57 |
| 24 | 23 | 23 | 20 | 66 |

答案不是分析器导出的。按人工声明的角色/文本片段确定性换算原文 UTF-16 区间、属性父节点、分句节点与连接关系，并存成静态 expected。每个答案显式包含 status、purpose、pattern、complexity、tense、aspect、voice、nodes、reasons、corrections。错误另有 controlId、每步完整原文；原因区间与编辑区间也固定。小写 read 同形有独立 ambiguous 答案。

阶段 19 只检查这些未来答案的结构、数量、范围、层级和内部一致性，不要求当前分析器满足新行为。后续在对应阶段启用 `compareLexiconExpectation`，对完整分类、节点区间、父节点、分句归属、原因、规则 ID 和编辑全部比对。阶段 20 的词典元信息另断言与打包清单完全一致，不在人工语法答案里虚构未来发布哈希。不能为通过规则输出而改写此固定答案；确需人工修正时先说明语法依据和范围修订。

阶段 21 的词条位置、所有动词五种词形与审核被动转换均有样例；生产发布、同形候选预算、基础纠错、用途及禁止进行/被动的行为测试均已验收。阶段 25 另行人工制定了 80 个正确句和 40 个对照，没有复用本开发集或历史迁移句。

## 历史独立性与迁移

冻结时工作树干净，1065 项测试通过。基线提交为 `9708002c8606afaebfc5bd9b7b80537e20149cfe`；以 **进入阶段 19 时的检查器** 提取规则为准，不声称重新考证阶段 12 最初历史提交。

- `tests/baselines/stage12-development.json`：29 个来源、2224 个规范化字符串。
- `tests/baselines/stage18-development.json`：31 个来源、2039 个规范化字符串。

完整保留原检查器递归抽取 fixture 字符串和源码引号字面量的方式，包含非句子字符串，不做过滤、删减或推断。规范化为 lowercase + 合并空白 + trim。每个字符串保存来源文件；来源保存 UTF-8 SHA-256。基线 payload（不含 contentHash）的 JSON.stringify 字节计算 SHA-256，摘要另锁定在 helper 中。基线固定后不再扫描未来 fixtures；缺失、内容改动、自行重算摘要、混入历史输入、验收内部重复均失败。数量、每类 10 个独立句和旧行为断言继续保留。

`tests/baselines/original-fixtures/` 保存 9 份原始 JSON 的完整 UTF-8 字节。常规迁移审查通过 `original-fixtures.mjs` 读取快照，来源哈希取自已经冻结的阶段 12/18 基线，不信任当前 fixture 或迁移表自带的哈希。修改或缺失快照明确失败。原 fixture 的完整比较、65 项迁移和 625 项审查断言全部保留；常规测试不调用 Git，也不读取当前工作树反推旧答案。

`node scripts/check-historical-baselines.mjs` 是独立来源核验命令，需要 Git 和固定提交对象。它从固定 Git 对象核对 60 个来源引用的哈希、重提取集合并核对 9 份快照；不能由当前源码重生成覆盖基线。后续工作树可以迁移答案，但不能倒推修改原始基线。

`lexicon-migrations.json` 逐项审查 625 个历史 JSON 固定输入：65 个迁移记录，560 个保持原行为。每项记录源文件、collection、原 ID（没有 ID 时保留 null 及 index）、完整原 fixture、人工 oldExpected/newExpected、理由及生效阶段。oldExpected 表示 0.14.3 当前约定；originalFixture 保留历史文档字段（一些旧 fixture 的抽象 reason 经 helper 转成当前 punctuation，不丢弃原记录）。审查来源按 file/collection/index 唯一标识；完整来源集合从 9 份已核验哈希的冻结快照枚举，审查表须与该集合完全相等。重复、遗漏和未知来源均拒绝，不能仅用 625 行总数证明完整覆盖。冻结的原始快照完全不改；当前 fixture 在对应阶段实施时按审查表迁移。阶段 22 已迁移 4 项 have 拥有结构，阶段 23 已迁移 11 项缩写，阶段 24 已迁移 50 项安全谓语错误；65 项全部保持回归。

65 项中：4 项 have 拥有结构在 22，11 项缩写在 23，50 项安全谓语错误在 24。重复旧句保留每个源 ID。词汇清单不覆盖 weather/music 等历史未知词，桥接错误保持原答案；现有正确例不因收录新词而失效。阶段 20 对所有结果增加词典元信息，但不改变历史语法答案。历史验收句进入迁移表只算行为回归，不算阶段 25 新独立输入。

验证还包括：历史检查器拒绝错误句型和不存在的原文片段；未来 checker 拒绝删除原因、错改编辑或属性父节点。分析输入继续仅在浏览器内处理，样例文件只有预先写明的教学/开发句，不收集用户输入。

阶段 19 实际工程和浏览器验收见 [验收记录](stage19-scope.md)。词典基础已完成，新词实现与两条分句未来答案的人工协议修订见 [阶段 21 记录](stage21-scope.md)。
