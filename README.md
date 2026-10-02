# Clause · 英语语法分析工作台

面向中文学习者的英语语法分析网页应用。

开发阶段、验收标准和交付依赖见 [开发计划](docs/development-plan.md)。

阶段 7–12 的实施顺序及验收标准见 [后续开发计划](docs/follow-up-development-plan.md)：先补齐常用简单句，再扩展并列句和限定 because/if 从句，最后完善学习反馈与扩展版验收。阶段 7–12 ✅ 已完成，扩展版独立验收与本地交付见 [阶段 12 验收](docs/stage12-scope.md)。

## 当前进度

第 1 至第 6 阶段已完成，完成范围为已声明的小词典和本地规则。阶段 7、8 已完成规则模块整理及 [常用简单句补齐](docs/stage8-scope.md)，阶段 9 已完成 [两分句并列句](docs/stage9-scope.md)，阶段 10A 已完成 [后置 because 原因从句](docs/stage10a-scope.md)，阶段 10B 已完成 [前置 if 条件从句](docs/stage10b-scope.md)，阶段 11 已完成 [学习反馈与范围说明](docs/stage11-scope.md)，阶段 12 已完成独立复核、性能与整体验收，当前规则仍为 0.9.0。当前使用自建小词典和规则分析限定范围的五种基本句型与四种句子用途，支持一般现在时与过去时、彩色成分、中文解释及短语内部定语。分析按钮和 Ctrl / ⌘ + Enter 已启用，修改输入立即清除旧结果。

当前支持范围、词典许可、规则和测试说明见 [本地分析 0.9.0](docs/local-analysis-scope.md)。已实现主谓一致、do/does/did 后原形、can 后原形三类纠错，支持查看原因、一次应用一条建议并重新分析；旧建议会随输入变化失效。超范围输入提供稳定的结构化原因；未知词可用键盘选中原文查看，分组例句与范围说明随应用提供。未知词不自动改写；未命中纠错规则不代表句子完全正确。

## 第一版开发范围

第一版采用随应用提供的词典和人工编写的规则，在浏览器内完成常见简单句分析，不使用 AI，也不依赖模型 API。提供彩色成分标注、中文解释、限定规则的基础纠错和修改后重新分析；对未知词、歧义及超出范围的结构明确提示。

安装依赖和构建可能需要联网；环境准备好并启动本地服务后，分析过程应可断网运行，输入句子不上传、不默认持久保存。已支持两个显式主语的完整陈述分句使用 and/but 连接，可进入分句查看成分、返回整句；支持连接词前一个逗号。已支持前置 `If + 条件从句, + 主句`，必须有一个英文逗号。已支持无逗号的 `主句 + because + 原因从句`，两侧均须有显式主语并完整匹配限定陈述结构，主从身份、句型和时态可分别查看。并列句与主从句暂不提供纠错，任一分句未完整匹配时整句降级。共享主语、短语并列、多重连接、前置 because、后置 if、虚拟条件与其他从句仍不支持。具体覆盖范围和验收门槛见开发计划，限定句型、四种用途及三类纠错已实现。已支持限定的 do/be/can 否定陈述句、can 一般疑问句、按人工首音表校验的 a/an 短语及 SVO/SVOC 的 it 宾语。can 不推断现在或过去时；go 可接固定 to school。缩写、否定疑问、否定祈使及通用介词短语仍不支持。

## 本地开发

要求 Node.js >= 22.13.0。已在 macOS / Node.js v24.14.1 验证 710 项测试、类型检查、全仓 ESLint、构建及离线浏览器分析、纠错与再分析流程。阶段 12 新增的 40 个范围内句子全部符合分类、位置和层级答案；20 个超范围对照均正确降级。两种本地启动方式及 1000 字符性能、390px 手机和输入隐私已验收；该结果不是开放英文准确率指标。

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

访问 `http://127.0.0.1:5188`。本轮交付是本地网页运行；完整离线安装包、双击启动、PWA 和公开部署仍是独立事项。构建保留环境代理与 Vinext 路由分类提示，具体证据见 [阶段 12 验收](docs/stage12-scope.md)。

独立样例与性能复核：

```sh
node --experimental-strip-types scripts/check-stage12-fixtures.mjs
node --experimental-strip-types scripts/check-stage12-performance.mjs
```

## 技术栈

- React 19、TypeScript、Vinext / Vite
- Tailwind CSS、Lucide 图标
- Cloudflare Workers / Sites 部署结构

## 项目结构

- `app/page.tsx`：工作台界面与交互
- `app/globals.css`：视觉样式与响应式布局
- `lib/grammar.ts`：本地词典、规则、结果协议与运行时校验
- `tests/grammar.test.mjs`：双宾语固定样例和协议回归
- `tests/patterns.test.mjs`：其余四种基本句型与范围边界
- `tests/purposes.test.mjs`：疑问、祈使、感叹规则与原文位置
- `tests/corrections.test.mjs`：三类纠错、正确对照、安全修改及过期拒绝
- `tests/acceptance.test.mjs`：规则完成后新增的 20 个范围内验收句
- `tests/stage9.test.mjs`：两分句固定答案、归属与协议、共享预算回归
- `tests/fixtures/stage9.json`：13 个正确句和 29 个边界/错误句的人工答案
- `tests/stage12.test.mjs`：40 个新独立答案及 20 个范围边界
- `tests/stage12-performance.test.mjs`：1000 字符边界、共享预算及耗尽降级
- `tests/ui-smoke.mjs`、`tests/ui-stage12.mjs`：可选整体验收与浏览器性能回归
- `app/layout.tsx`：应用元信息
- `components/ui/`：基础界面组件
- `build/`、`scripts/`：开发与部署支持
- `.openai/hosting.json`：Sites 项目标识，不包含访问凭据

依赖、构建产物、本地运行状态和环境配置不会提交。请勿将 API 密钥或其他凭据写入源码。

## 许可证

项目沿用仓库的 MIT 许可证；第三方组件及部署支持代码的授权信息见对应目录。
