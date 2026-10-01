import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clause · 英语语法分析工作台",
  description: "输入英语句子，理解句式结构、主谓宾成分，发现语法问题并查看中文解释。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
