"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

const desktopNavItems = [
  { href: "/", label: "首页面板" },
  { href: "/questions", label: "错题总览" },
  { href: "/reports", label: "错题分析" },
  { href: "/knowledge-map", label: "知识图谱" },
  { href: "/statistics", label: "数据统计" },
];

function DesktopAppNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="桌面主导航" className="hidden border-b border-slate-100 bg-white px-8 py-5 lg:block">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative h-12 w-12" aria-hidden="true">
            <span className="absolute left-0 top-3 h-5 w-8 rotate-45 rounded bg-[#10b981]" />
            <span className="absolute left-4 top-1 h-5 w-8 rotate-45 rounded bg-[#22d3ee]" />
          </span>
          <span>
            <span className="block text-3xl font-black tracking-normal text-slate-950">
              408 错题训练系统
            </span>
            <span className="mt-1 block text-sm font-black text-slate-400">
              数学 + 计算机考研错题复盘平台
            </span>
          </span>
        </Link>
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
          href="/settings"
          className="flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-slate-900"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100">光</span>
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
    <div className="min-h-screen bg-[#f7f9fb] text-slate-950">
      <DesktopAppNav pathname={pathname} />
      <div className="mx-auto min-h-screen w-full max-w-[520px] bg-[#f8fafc] lg:max-w-[1500px] lg:bg-transparent">
        <main className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10">
          {children}
        </main>
      </div>
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
