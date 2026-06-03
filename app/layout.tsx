import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

export const metadata: Metadata = {
  title: "11408 错题复盘助手",
  description: "手机优先的 11408 错题拍题、复习和薄弱点分析工具。",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="phone-shell">
          <main className="min-h-screen pb-24">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
