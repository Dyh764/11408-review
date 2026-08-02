"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { BottomNav } from "@/components/bottom-nav";

const desktopNavItems = [
  { href: "/", label: "首页" },
  { href: "/questions", label: "错题库" },
  { href: "/import", label: "导入" },
  { href: "/practice", label: "复习" },
  { href: "/profile", label: "我的" },
];

function DesktopAppNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="桌面主导航" className="hidden shrink-0 border-b border-slate-100 bg-white px-8 py-5 md:block">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8">
        <BrandLogo href="/" size="lg" />
        <div className="flex items-center gap-8 text-base font-bold text-slate-500">
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
        <Link href="/settings" className="text-sm font-bold text-slate-500 hover:text-slate-900">
          设置
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
    <div className="min-h-screen bg-[#f7f9fb] text-slate-950 md:flex md:flex-col">
      <DesktopAppNav pathname={pathname} />
      <div className="mx-auto min-h-screen w-full max-w-[520px] bg-[#f8fafc] md:flex md:min-h-0 md:max-w-[1500px] md:flex-1 md:flex-col md:bg-transparent">
        <main className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] md:min-h-0 md:flex-1 md:pb-10">
          {children}
        </main>
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
