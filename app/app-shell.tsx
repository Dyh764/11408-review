"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

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
    <div className="phone-shell">
      <main className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
