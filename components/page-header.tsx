import { BrandMark } from "@/components/brand-logo";

type PageHeaderProps = {
  title: string;
  subtitle: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="px-5 pt-6">
      <div className="flex min-w-0 items-start gap-3">
        <BrandMark size="sm" />
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-normal text-emerald-600">11408 错题复盘</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950">
            {title}
          </h1>
          <p className="mt-2 max-w-[30rem] text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
