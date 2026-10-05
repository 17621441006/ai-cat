import type { Metadata } from "next";
import "./globals.css";
import "./studio.css";
import "./explorer.css";
import "./night.css";
import "./upgrade.css";
import "./office.css";
import "./ppt-editor.css";
import "./office-delivery.css";
import "./writing.css";
import "./journey.css";
import "./writing-visuals.css";
import "./onboarding.css";
import "./operations.css";
import "./navigation-space.css";
import "./visual-studio.css";
import "./video-studio.css";
import "./research-studio.css";
import "./flexible-tables.css";
import "./human-review.css";
import "./cat-assistant.css";
import "./cat-chat.css";
import "./assistant-rich.css";
import "./learning-workspace.css";
import "@xyflow/react/dist/style.css";
import "./agent-workshop.css";
import "./visual-learning.css";

export const metadata: Metadata = {
  title: "AI 进阶研习所 · 云应用与供应链",
  description: "面向企业项目经理与产品经理的AI互动学习平台：核心课程、智能体工坊、模型参数实验、ERP编程实训与供应链产品演示。",
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
    <html lang="zh-CN" suppressHydrationWarning>
      <head><link rel="preload" as="image" href="/images/cat-portrait-listening.webp" fetchPriority="low"/><script dangerouslySetInnerHTML={{__html:`try{var t=localStorage.getItem("ai-practice-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}`}}/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
