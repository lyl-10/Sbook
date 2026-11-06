import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "个人知识库",
  description: "我的知识管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}