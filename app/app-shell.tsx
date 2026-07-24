"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { BottomNav } from "@/components/bottom-nav";

const desktopNavItems = [
  { href: "/", label: "首页面板" },
  { href: "/questions", label: "错题总览" },
  { href: "/reports", label: "错题分析" },
  { href: "/knowledge-map", label: "知识图谱" },
  { href: "/memory-cards", label: "记忆卡片" },
  { href: "/statistics", label: "数据统计" },
];

function DesktopAppNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="桌面主导航" className="hidden border-b border-slate-100 bg-white px-8 py-5 md:block">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8">
        <BrandLogo href="/" size="lg" />
        <div className="flex items-center gap-12 text-base font-bold text-slate-500">
          {desktopNavItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "text-slate-900" : "hover:text-slate-900"}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/profile"
          className="flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-slate-900"
        >
          <BrandMark size="sm" className="rounded-full" />
          <span className="text-slate-700">学习档案</span>
        </Link>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDesignPreview = pathname.startsWith("/design-preview");
  const isHome = pathname === "/";
  const isPractice = pathname === "/practice";

  if (isDesignPreview) {
    return <main className="min-h-screen w-full overflow-x-hidden">{children}</main>;
  }

  if (isHome) {
    return (
      <>
        <main className="min-h-screen w-full overflow-x-hidden">{children}</main>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </>
    );
  }

  return (
    <div
      className={
        isPractice
          ? "flex h-dvh min-h-0 flex-col overflow-hidden bg-[#f7f9fb] text-slate-950"
          : "min-h-screen bg-[#f7f9fb] text-slate-950"
      }
    >
      <DesktopAppNav pathname={pathname} />
      <div
        className={`mx-auto w-full max-w-[520px] bg-[#f8fafc] md:max-w-[1500px] md:bg-transparent ${
          isPractice ? "min-h-0 flex-1" : "min-h-screen"
        }`}
      >
        <main
          className={
            isPractice
              ? "h-full min-h-0 overflow-y-auto overscroll-contain pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0"
              : "min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10"
          }
        >
          {children}
        </main>
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
