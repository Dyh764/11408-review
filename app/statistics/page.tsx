import Link from "next/link";
import { MobilePageShell, MobileSection, SectionCard, StatCard } from "@/components/mobile/primitives";
import { StudyCard, StudyPageHeader } from "@/components/study/study-ui";

const statEntrypoints = [
  {
    href: "/reports",
    title: "学习报告",
    description: "查看日报、周报、月报，以及薄弱点 Top 3 和题卡质量概览。",
  },
  {
    href: "/questions?scope=weak",
    title: "薄弱题统计",
    description: "直接进入错题库的薄弱题范围，处理不熟、不会和待核对题卡。",
  },
  {
    href: "/questions?scope=inbox",
    title: "待整理统计",
    description: "集中处理导入后缺字段、需修正或 AI 未核对的题卡。",
  },
  {
    href: "/practice",
    title: "专项复盘统计",
    description: "从章节和错因维度发起复盘，复用现有复习记录逻辑。",
  },
];

export default function StatisticsPage() {
  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="数据统计"
        subtitle="这里不新建一套统计逻辑，而是把现有报告、错题筛选和专项复盘集中成一个入口。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="报告" value="3类" helper="日 / 周 / 月" tone="green" />
          <StatCard label="范围" value="4类" helper="错题筛选" tone="cyan" />
          <StatCard label="复盘" value="2类" helper="章节 / 错因" tone="amber" />
        </div>
      </MobileSection>

      <MobileSection>
        <SectionCard title="统计入口" subtitle="已有功能保持不变；这里只提供考试平台风格的聚合入口。">
          <div className="grid gap-3">
            {statEntrypoints.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg bg-white p-4 ring-1 ring-slate-100"
              >
                <p className="text-base font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
              </Link>
            ))}
          </div>
        </SectionCard>
      </MobileSection>

      <MobileSection>
        <StudyCard>
          <p className="text-sm font-black text-slate-950">数据边界</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            本页不写数据库、不新增 schema，只复用现有错题库、报告和复盘功能。
          </p>
        </StudyCard>
      </MobileSection>
    </MobilePageShell>
  );
}
