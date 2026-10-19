import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "曲线罗盘 · 沪深300择时",
  description: "沪深300全收益与债券基金双曲线，300点距离择时与每日信号。",
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
