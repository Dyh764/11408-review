import { ActionCard, MobileCard, MobileSection, StatCard } from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { isDeepSeekConfigured } from "@/lib/env";
import { dashboardStats, mockQuestions } from "@/lib/mock-data";

const quickActions = [
  { href: "/upload", label: "拍题上传", description: "先留住原图和卡点" },
  { href: "/import", label: "导入 ChatGPT 错题卡", description: "粘贴 JSON，生成复习计划" },
  { href: "/review", label: "开始今日复习", description: "处理今天到期的错题" },
  { href: "/sprint", label: "考前冲刺", description: "优先处理最危险的题" },
  { href: "/questions", label: "错题库", description: "按科目和薄弱点筛选" },
  { href: "/reports", label: "学习报告", description: "看本周薄弱点和建议" },
];

export default function DashboardPage() {
  const deepSeekEnabled = isDeepSeekConfigured();

  return (
    <div>
      <PageHeader
        title="今天先把该复习的题清掉"
        subtitle="拍题留原图，晚上导入 ChatGPT 错题卡，系统负责复习计划和薄弱点统计。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="待复习" value={dashboardStats.dueToday} tone="blue" />
          <StatCard label="今日新增" value={dashboardStats.addedToday} />
          <StatCard label="本周完成" value={dashboardStats.weeklyCompletionRate} tone="green" />
        </div>
      </MobileSection>

      <MobileSection title="今天要做的事">
        <div className="grid gap-3">
          {quickActions.map((action, index) => (
            <ActionCard
              key={action.href}
              href={action.href}
              title={action.label}
              description={action.description}
              tone={index === 0 ? "blue" : index === 1 ? "cyan" : "slate"}
            />
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-950">薄弱点 Top 3</h2>
          <StatusPill label="mock" tone="blue" />
        </div>
        <div className="mt-3 space-y-3">
          {dashboardStats.weakestTop3.map((item, index) => (
            <MobileCard key={item.name} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {index + 1}. {item.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">薄弱分越高越需要优先复盘</p>
              </div>
              <p className="text-lg font-bold text-red-600">{item.score}</p>
            </MobileCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection title="智能建议">
        <MobileCard>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusPill
              label={deepSeekEnabled ? "DeepSeek 已启用" : "DeepSeek 未启用（可选）"}
              tone={deepSeekEnabled ? "blue" : "amber"}
            />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {deepSeekEnabled
              ? "点击后会根据最近错题、复习结果和薄弱点摘要生成建议。"
              : "当前使用规则统计，DeepSeek 可选启用。"}
          </p>
          <button
            type="button"
            disabled={!deepSeekEnabled}
            className="mt-4 min-h-12 w-full rounded-lg bg-amber-100 px-4 text-sm font-semibold text-amber-800 disabled:bg-slate-100 disabled:text-slate-400"
          >
            刷新智能分析
          </button>
        </MobileCard>
      </MobileSection>

      <MobileSection title="今日样例题">
        <div className="mt-3 space-y-3">
          {mockQuestions.slice(0, 2).map((question) => (
            <MobileCard key={question.id}>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={question.subject} tone="blue" />
                <StatusPill label={question.masteryStatus} tone="amber" />
              </div>
              <p className="mt-3 font-bold text-slate-950">{question.knowledgePoint}</p>
              <p className="mt-1 text-sm text-slate-600">{question.oneSentenceTip}</p>
            </MobileCard>
          ))}
        </div>
      </MobileSection>
    </div>
  );
}
