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
  {
    href: "/exam-overview",
    title: "真题总览统计",
    description: "按科目、章节、题源和年份线索查看现有 408 题库覆盖。",
  },
  {
    href: "/memory-cards",
    title: "记忆卡片统计",
    description: "进入有答案解析的题卡，按不熟题和待核对题做回忆式复习。",
  },
  {
    href: "/notes",
    title: "学习笔记统计",
    description: "汇总个人备注、正确思路和错因标签，用于复盘前快速回看。",
  },
  {
    href: "/collections",
    title: "收藏夹统计",
    description: "按不熟题本、待整理、已掌握和 408 选择题自动归类，复用现有题卡状态。",
  },
  {
    href: "/ranking",
    title: "学习排行榜",
    description: "按科目和章节查看当前账号的通关率、刷题量和掌握榜。",
  },
  {
    href: "/algorithms",
    title: "算法专题统计",
    description: "按排序、查找、树图和操作系统算法聚合 408 算法错题。",
  },
  {
    href: "/study-mode",
    title: "学习模式统计",
    description: "把快速刷题、记忆卡片、收藏夹、算法专题和学习完成回看集中成一个入口。",
  },
  {
    href: "/study-complete",
    title: "学习完成统计",
    description: "查看本轮总结、分组完成度和下一轮复盘入口，完成记录不做伪造。",
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
