# Clause · 英语语法分析工作台

面向中文学习者的英语语法分析网页应用。

开发阶段、验收标准和交付依赖见 [开发计划](docs/development-plan.md)。

阶段 7–12 的实施顺序及验收标准见 [后续开发计划](docs/follow-up-development-plan.md)：先补齐常用简单句，再扩展并列句和限定 because/if 从句，最后完善学习反馈与扩展版验收。阶段 7 的范围、样例和规则模块整理已完成；阶段 8–12 待开始。

## 当前进度

第 1 至第 6 阶段已完成，完成范围为已声明的小词典和本地规则。阶段 7 已完成规则模块整理及 [阶段 8 范围与预期](docs/stage8-scope.md)，运行能力仍为 0.4.0。当前使用自建小词典和规则分析限定范围的五种基本句型与四种句子用途，支持一般现在时与过去时、彩色成分、中文解释及短语内部定语。分析按钮和 Ctrl / ⌘ + Enter 已启用，修改输入立即清除旧结果。

当前支持范围、词典许可、规则和测试说明见 [本地分析 0.4.0](docs/local-analysis-scope.md)。已实现主谓一致、do/does/did 后原形、can 后原形三类纠错，支持查看原因、一次应用一条建议并重新分析；旧建议会随输入变化失效。超范围输入明确提示，未命中纠错规则不代表句子完全正确。

## 第一版开发范围

第一版采用随应用提供的词典和人工编写的规则，在浏览器内完成常见简单句分析，不使用 AI，也不依赖模型 API。提供彩色成分标注、中文解释、限定规则的基础纠错和修改后重新分析；对未知词、歧义及超出范围的结构明确提示。

安装依赖和构建可能需要联网；环境准备好并启动本地服务后，分析过程应可断网运行，输入句子不上传、不默认持久保存。复杂句完整分析后续另行排期。具体覆盖范围和验收门槛见开发计划，限定句型、四种用途及三类纠错已实现。can 仅支持肯定陈述句；go 可接固定 to school，暂不支持通用介词短语。

## 本地开发

要求 Node.js >= 22.13.0。已在 macOS / Node.js v24.14.1 验证 245 项测试、类型检查、ESLint、构建及离线浏览器分析、纠错与再分析流程。额外 20 个范围内新句子全部正确分析；该结果不是开放英文准确率指标。

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
- `tests/ui-smoke.mjs`：可选浏览器回归
- `app/layout.tsx`：应用元信息
- `components/ui/`：基础界面组件
- `build/`、`scripts/`：开发与部署支持
- `.openai/hosting.json`：Sites 项目标识，不包含访问凭据

依赖、构建产物、本地运行状态和环境配置不会提交。请勿将 API 密钥或其他凭据写入源码。

## 许可证

项目沿用仓库的 MIT 许可证；第三方组件及部署支持代码的授权信息见对应目录。
