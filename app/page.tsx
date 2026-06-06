import Link from "next/link";
import { MobilePageShell, MobileSection, PrimaryActionCard, SectionCard, StatCard } from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { dashboardStats } from "@/lib/mock-data";

const primaryActions = [
  {
    href: "/review",
    title: "开始今日复习",
    description: "先清掉今天到期的错题，做完再看答案。",
    tone: "blue" as const,
    kicker: "第一步",
  },
  {
    href: "/upload",
    title: "拍题上传",
    description: "白天先拍题，保留原图和当时卡点。",
    tone: "cyan" as const,
    kicker: "新增错题",
  },
  {
    href: "/import",
    title: "导入 ChatGPT 错题卡",
    description: "晚上粘贴 JSON，把错题整理成可复习卡片。",
    tone: "slate" as const,
    kicker: "整理题卡",
  },
];

const secondaryLinks = [
  { href: "/questions", title: "错题库", description: "浏览、筛选和进入详情" },
  { href: "/reports", title: "学习报告", description: "查看薄弱点和下一步建议" },
  { href: "/sprint", title: "考前冲刺", description: "优先处理高风险错题" },
  { href: "/settings", title: "我的", description: "账号、导出和可选增强" },
];

export default function DashboardPage() {
  return (
    <MobilePageShell>
      <PageHeader
        title="今日学习驾驶舱"
        subtitle="先复习，再整理新题。这里保留今天最该做的三件事。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="今日待复习" value={dashboardStats.dueToday} tone="blue" />
          <StatCard label="今日新增" value={dashboardStats.addedToday} />
          <StatCard label="本周完成率" value={dashboardStats.weeklyCompletionRate} tone="green" />
        </div>
      </MobileSection>

      <MobileSection title="现在应该点这里">
        <div className="grid gap-3">
          {primaryActions.map((action) => (
            <PrimaryActionCard key={action.href} {...action} />
          ))}
        </div>
      </MobileSection>

      <MobileSection title="更多入口" subtitle="低频查看放在下面，学习时不用先处理它们。">
        <div className="grid gap-3">
          {secondaryLinks.map((link) => (
            <SectionCard key={link.href}>
              <Link href={link.href} className="flex min-h-11 items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{link.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{link.description}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-blue-700">&gt;</span>
              </Link>
            </SectionCard>
          ))}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
