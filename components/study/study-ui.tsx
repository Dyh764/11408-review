import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "purple" | "cyan" | "green" | "amber" | "red" | "slate";

const badgeClass: Record<Tone, string> = {
  purple: "bg-blue-50 text-blue-700 ring-blue-100",
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
      <p className="text-xs font-black tracking-normal text-blue-600">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-black tracking-normal text-slate-950">{title}</h1>
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
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.045)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StudyDashboardCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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
        <h2 className="text-base font-black tracking-normal text-slate-950">{title}</h2>
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
    <StudyCard className={tone === "purple" ? "bg-slate-50" : ""}>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={tone === "purple" ? "mt-2 text-2xl font-black text-blue-700" : "mt-2 text-2xl font-black text-slate-950"}>
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
      <div className={`h-2 overflow-hidden rounded-full ${inverse ? "bg-white/20" : "bg-slate-200"}`}>
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
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
      className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] ${className}`}
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
      className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 ${className}`}
    >
      {children}
    </Link>
  );
}

export function MotivationBanner({ text }: { text: string }) {
  return (
    <StudyCard className="bg-blue-50">
      <p className="text-xs font-black text-blue-700">今日激励句</p>
      <p className="mt-2 text-sm leading-6 text-slate-950">{text}</p>
    </StudyCard>
  );
}
