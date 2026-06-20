import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "blue" | "cyan" | "green" | "amber" | "red" | "slate";

const cardToneClass: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-950",
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-950",
  green: "border-emerald-100 bg-emerald-50 text-emerald-950",
  amber: "border-amber-100 bg-amber-50 text-amber-950",
  red: "border-red-100 bg-red-50 text-red-950",
  slate: "border-slate-200 bg-white text-slate-950",
};

const actionToneClass: Record<Tone, string> = {
  blue: "border-blue-600 bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]",
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-950",
  green: "border-emerald-100 bg-emerald-50 text-emerald-950",
  amber: "border-amber-100 bg-amber-50 text-amber-950",
  red: "border-red-100 bg-red-50 text-red-950",
  slate: "border-slate-100 bg-white text-slate-950",
};

export function MobilePageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`min-w-0 space-y-5 pb-4 ${className}`}>{children}</div>;
}

export function MobileSection({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-5 ${className}`}>
      {title ? (
        <div className="mb-3">
          <h2 className="text-[15px] font-bold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MobileCard({
  children,
  className = "",
  tone = "slate",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.045)] ${cardToneClass[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <MobileCard className={className}>
      {title || subtitle ? (
        <div className="mb-3">
          {title ? <h3 className="text-sm font-bold text-slate-900">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </MobileCard>
  );
}

export function StatCard({
  label,
  value,
  helper,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
}) {
  return (
    <MobileCard tone={tone} className="min-h-24">
      <p className="text-xs font-semibold opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold leading-none">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 opacity-75">{helper}</p> : null}
    </MobileCard>
  );
}

export function PrimaryActionCard({
  href,
  title,
  description,
  tone = "slate",
  kicker,
}: {
  href: string;
  title: string;
  description: string;
  tone?: Tone;
  kicker?: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 active:scale-[0.99] ${actionToneClass[tone]}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {kicker ? <p className="mb-1 text-xs font-bold opacity-75">{kicker}</p> : null}
          <p className="text-base font-bold">{title}</p>
          <p className="mt-1 text-sm leading-5 opacity-80">{description}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/85 text-lg font-bold text-blue-700">
          &gt;
        </span>
      </div>
    </Link>
  );
}

export const ActionCard = PrimaryActionCard;

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <MobileCard className="text-center">
      <p className="text-base font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
        >
          {action.label}
        </Link>
      ) : null}
    </MobileCard>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <MobileCard className="text-sm leading-6 text-slate-600">
      <span className="inline-block h-2 w-2 rounded-full bg-blue-500 align-middle" />
      <span className="ml-2">{label}</span>
    </MobileCard>
  );
}

export function ErrorState({
  title = "这里暂时没有读出来",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <MobileCard tone="red">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
    </MobileCard>
  );
}

export function Notice({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <MobileCard tone={tone} className="text-sm leading-6">
      {children}
    </MobileCard>
  );
}

export function ImagePlaceholder({ label = "无原图预览" }: { label?: string }) {
  return (
    <div className="grid h-full min-h-20 w-full place-items-center rounded-lg bg-blue-50 px-3 text-center text-xs font-semibold leading-5 text-blue-700 ring-1 ring-blue-100">
      {label}
    </div>
  );
}
