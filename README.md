# Clause · 英语语法分析工作台

面向中文学习者的英语语法分析网页应用，输入在浏览器内通过本地词典与规则分析。

阶段 1–12 ✅ 已完成，历史开发与验收见 [开发计划](docs/development-plan.md)、[后续开发计划](docs/follow-up-development-plan.md) 和 [阶段 12 验收](docs/stage12-scope.md)。本轮阶段 13–18 ✅ 已完成；实施记录见 [谓语扩展执行计划](docs/predicate-expansion-plan.md)。

下一轮按阶段 19–25 规划本地 SQLite 数据库词典、审核快照与词汇扩容、实义 have、限定否定缩写及谓语纠错；范围、依赖和验收门槛见 [后续计划](docs/next-development-plan.md)。数据库维护词典，分析仍在浏览器内使用打包快照，输入句子不入库。计划已补充历史验收语料基线、词条修改后重新审核，以及规则与词典版本联合校验。新增阶段均待开始，当前支持范围仍以 0.14.3 为准。

## 当前进度

当前规则 **0.14.3**。保留五种基本句型、四种简单句用途、限定 do/be/can 否定与一般疑问，以及两个完整陈述分句的 and/but、后置 because、前置 if。新增现在/过去进行时、完成时、限定被动语态，以及完成进行、完成被动、进行被动。完整谓语、时态、体和语态按原文标注，多分句分别展示各自分类。

完整词形、被动转换、错误状态与限制见 [当前本地分析范围](docs/predicate-expansion-scope.md)。仍使用人工小词典，不代表支持任意英文。实义动词 have、SV/SVOC 被动、将来时、缩写、否定疑问、特殊疑问、通用介词短语、新 can 链及完成进行被动不在本轮范围内。

新谓语组合暂不提供自动修改建议。原有主谓一致、do/does/did 后原形、can 后原形三类纠错保留；每次应用一条并重新分析，编辑输入立即使旧结果和建议失效。未知词可键盘定位，范围外与语境歧义明确提示；未命中纠错不代表句子完全正确。

## 运行与隐私

安装依赖和构建可能需要联网；启动本地服务后分析可断网运行。句子不上传、不写日志、不持久保存，刷新后恢复默认例句。分析按钮和 Ctrl / ⌘ + Enter 已启用，手机和键盘可查看成分、短语定语及分句。

项目尚未上线，不做旧数据或旧结果协议兼容，规则见 [AGENTS.md](AGENTS.md)。协议字段与固定测试答案直接升级，已有行为断言继续回归；已验收阶段使用 ✅ 标注。

## 本地开发

要求 Node.js >= 22.13.0。已在 macOS / Node.js v24.14.1 验证 1065 项测试、类型检查、全仓 ESLint、构建；独立 60 个正确句和 30 个对照均符合人工固定答案。两种本地启动方式、1000 UTF-16 上限、计算预算、390px 手机、断网与隐私在阶段 18 复核；结果仅证明当前声明范围。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5188
```

访问终端显示的本地地址。

```sh
npm test
npx tsc --noEmit
npm run build
```

构建产物也已在准备好的本地环境验证启动（Wrangler 本地模式）：

```sh
npm run build
npm run start -- --port 5188
```

访问 `http://127.0.0.1:5188`。本轮交付是本地网页运行；完整离线安装包、双击启动、PWA 和公开部署仍是独立事项。构建保留环境代理与 Vinext 路由分类提示，具体证据见 [本轮范围与验收](docs/predicate-expansion-scope.md)。

独立样例与性能复核：

```sh
node --experimental-strip-types scripts/check-stage12-fixtures.mjs
node --experimental-strip-types scripts/check-stage12-performance.mjs
node --experimental-strip-types scripts/check-predicate-fixtures.mjs
node --experimental-strip-types scripts/check-predicate-performance.mjs
```

## 技术栈

- React 19、TypeScript、Vinext / Vite
- Tailwind CSS、Lucide 图标
- Cloudflare Workers / Sites 部署结构

## 项目结构

- `app/page.tsx`：工作台界面与交互
- `app/globals.css`：视觉样式与响应式布局
- `lib/grammar.ts`：同步分析与安全纠错公共入口
- `lib/grammar/predicate.ts`、`composed.ts`：助动词链、体/语态及主动/被动搭配
- `lib/grammar/protocol.ts`：结果类型与运行时校验；`classification.ts`：界面分类标签
- `tests/grammar.test.mjs`：双宾语固定样例和协议回归
- `tests/patterns.test.mjs`：其余四种基本句型与范围边界
- `tests/purposes.test.mjs`：疑问、祈使、感叹规则与原文位置
- `tests/corrections.test.mjs`：三类纠错、正确对照、安全修改及过期拒绝
- `tests/acceptance.test.mjs`：规则完成后新增的 20 个范围内验收句
- `tests/stage9.test.mjs`：两分句固定答案、归属与协议、共享预算回归
- `tests/fixtures/stage9.json`：13 个正确句和 29 个边界/错误句的人工答案
- `tests/stage12.test.mjs`：40 个新独立答案及 20 个范围边界
- `tests/stage12-performance.test.mjs`：1000 字符边界、共享预算及耗尽降级
- `tests/stage13.test.mjs` 至 `tests/stage18.test.mjs`：谓语扩展、协议、独立答案与预算回归
- `tests/fixtures/predicate-development.json`、`predicate-acceptance.json`：人工固定开发与独立答案
- `tests/ui-smoke.mjs`、`tests/ui-stage12.mjs`、`tests/ui-predicate.mjs`：可选整体验收与浏览器性能回归
- `app/layout.tsx`：应用元信息
- `components/ui/`：基础界面组件
- `build/`、`scripts/`：开发与部署支持
- `.openai/hosting.json`：Sites 项目标识，不包含访问凭据

依赖、构建产物、本地运行状态和环境配置不会提交。请勿将 API 密钥或其他凭据写入源码。

## 许可证

项目沿用仓库的 MIT 许可证；第三方组件及部署支持代码的授权信息见对应目录。
