import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "purple" | "cyan" | "green" | "amber" | "red" | "slate";

const badgeClass: Record<Tone, string> = {
  purple: "bg-[#ede7ff] text-[#4f23b6] ring-[#d9cffd]",
  cyan: "bg-cyan-50 text-cyan-800 ring-cyan-100",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StudyPageHeader({
  title,
  subtitle,
  eyebrow = "11408 冲刺复盘",
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
}) {
  return (
    <header className="px-5 pt-6">
      <p className="text-xs font-black tracking-normal text-[#5b2bd6]">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-black tracking-normal text-[#211536]">{title}</h1>
      <p className="mt-2 max-w-[30rem] text-sm leading-6 text-slate-600">{subtitle}</p>
    </header>
  );
}

export function StudyCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[#e4dcff] bg-white p-4 shadow-[0_10px_28px_rgba(62,38,123,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StudyDashboardCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-[#4f23b6] p-5 text-white shadow-[0_18px_42px_rgba(79,35,182,0.28)]">
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-black tracking-normal text-[#211536]">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SprintStatCard({
  label,
  value,
  helper,
  tone = "purple",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
}) {
  return (
    <StudyCard className={tone === "purple" ? "bg-[#f8f5ff]" : ""}>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={tone === "purple" ? "mt-2 text-2xl font-black text-[#4f23b6]" : "mt-2 text-2xl font-black text-slate-950"}>
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </StudyCard>
  );
}

export function ProgressBar({
  value,
  label,
  helper,
  inverse = false,
}: {
  value: number;
  label?: string;
  helper?: string;
  inverse?: boolean;
}) {
  const width = Math.max(0, Math.min(100, value));

  return (
    <div>
      {label || helper ? (
        <div className={`mb-2 flex justify-between gap-3 text-xs font-bold ${inverse ? "text-white/85" : "text-slate-600"}`}>
          <span>{label}</span>
          <span>{helper}</span>
        </div>
      ) : null}
      <div className={`h-2 overflow-hidden rounded-full ${inverse ? "bg-white/20" : "bg-[#e5ddff]"}`}>
        <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function StudyBadge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-black ring-1 ${badgeClass[tone]}`}>
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty?: string | null }) {
  const value = difficulty?.trim() || "未标难度";
  const tone: Tone = value === "压轴" || value === "较难" || value === "困难" ? "red" : value === "中等" ? "amber" : "purple";

  return <StudyBadge tone={tone}>{value}</StudyBadge>;
}

export function MasteryBadge({ mastery }: { mastery?: string | null }) {
  const value = mastery?.trim() || "未标掌握";
  const tone: Tone = value === "完全掌握" ? "green" : value.includes("没") || value.includes("卡") ? "amber" : "purple";

  return <StudyBadge tone={tone}>{value}</StudyBadge>;
}

export function AttentionBadge({
  needsFix,
  needsManualCheck,
}: {
  needsFix?: boolean;
  needsManualCheck?: boolean;
}) {
  if (needsFix) {
    return <StudyBadge tone="red">需要修正</StudyBadge>;
  }

  if (needsManualCheck) {
    return <StudyBadge tone="amber">需要核对</StudyBadge>;
  }

  return <StudyBadge tone="green">已可复习</StudyBadge>;
}

export function PrimaryStudyLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#5b2bd6] px-4 text-sm font-black text-white shadow-[0_12px_26px_rgba(91,43,214,0.26)] ${className}`}
    >
      {children}
    </Link>
  );
}

export function SecondaryStudyLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d9cffd] bg-white px-4 text-sm font-black text-[#4f23b6] ${className}`}
    >
      {children}
    </Link>
  );
}

export function MotivationBanner({ text }: { text: string }) {
  return (
    <StudyCard className="bg-[#fbfaff]">
      <p className="text-xs font-black text-[#5b2bd6]">今日激励句</p>
      <p className="mt-2 text-sm leading-6 text-[#211536]">{text}</p>
    </StudyCard>
  );
}
