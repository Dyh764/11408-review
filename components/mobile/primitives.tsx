import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "blue" | "cyan" | "green" | "amber" | "red" | "slate";

const cardToneClass: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-900",
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-900",
  green: "border-emerald-100 bg-emerald-50 text-emerald-900",
  amber: "border-amber-100 bg-amber-50 text-amber-900",
  red: "border-red-100 bg-red-50 text-red-900",
  slate: "border-slate-100 bg-white text-slate-900",
};

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
    <section className={`px-5 pt-5 ${className}`}>
      {title ? (
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
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
    <div className={`rounded-lg border p-4 shadow-sm ${cardToneClass[tone]} ${className}`}>
      {children}
    </div>
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

export function ActionCard({
  href,
  title,
  description,
  tone = "slate",
}: {
  href: string;
  title: string;
  description: string;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 shadow-sm active:scale-[0.99] ${cardToneClass[tone]}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm leading-5 opacity-75">{description}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-xl font-bold text-blue-700">
          ›
        </span>
      </div>
    </Link>
  );
}

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

export function ImagePlaceholder({ label = "文字错题卡" }: { label?: string }) {
  return (
    <div className="grid h-full min-h-20 w-full place-items-center rounded-lg bg-slate-100 px-3 text-center text-xs font-semibold leading-5 text-slate-500">
      {label}
    </div>
  );
}
