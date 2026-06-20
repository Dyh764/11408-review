"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页", icon: "⌂" },
  { href: "/questions", label: "错题", icon: "▣" },
  { href: "/import", label: "导入", icon: "+" },
  { href: "/practice", label: "练习", icon: "✓" },
  { href: "/settings", label: "我的", icon: "•" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-[520px] grid-cols-5 gap-1.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-lg text-xs font-bold transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)]"
                  : "bg-slate-50/70 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
