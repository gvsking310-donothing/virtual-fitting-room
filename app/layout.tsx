import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI虚拟试衣间",
  description: "移动端 AI 虚拟试衣体验入口",
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
