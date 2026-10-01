# Clause · 英语语法分析工作台

面向中文学习者的英语语法分析网页应用。

## 当前进度

已完成工作台界面初版：英文句子输入、例句选择、双宾语句的彩色成分示例、点击成分查看说明，以及移动端布局。

当前分析结果仍为固定示例，“分析句子”按钮暂未启用。任意句子分析、语法纠错和 AI 接口尚待实现；此提交用于保存界面开发进度。

## 本地开发

要求 Node.js >= 22.13.0。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5188
```

访问终端显示的本地地址。

```sh
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
- `app/layout.tsx`：应用元信息
- `components/ui/`：基础界面组件
- `build/`、`scripts/`：开发与部署支持
- `.openai/hosting.json`：Sites 项目标识，不包含访问凭据

依赖、构建产物、本地运行状态和环境配置不会提交。请勿将 API 密钥或其他凭据写入源码。

## 许可证

项目沿用仓库的 MIT 许可证；第三方组件及部署支持代码的授权信息见对应目录。
