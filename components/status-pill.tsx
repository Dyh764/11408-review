type StatusPillProps = {
  label: string;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
};

const toneClass = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusPill({ label, tone = "slate" }: StatusPillProps) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${toneClass[tone]}`}>
      {label}
    </span>
  );
}
