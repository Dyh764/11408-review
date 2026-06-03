type PageHeaderProps = {
  title: string;
  subtitle: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="px-5 pt-6">
      <p className="text-sm font-medium text-blue-700">11408-review</p>
      <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
    </header>
  );
}
