import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { dashboardStats, mockQuestions } from "@/lib/mock-data";

const quickActions = [
  { href: "/upload", label: "拍题上传", description: "拍照、选科目、写一句卡点" },
  { href: "/review", label: "今日复习", description: "处理今天到期的错题" },
  { href: "/sprint", label: "考前冲刺", description: "优先处理最危险的题" },
  { href: "/questions", label: "错题库", description: "按科目和薄弱点筛选" },
  { href: "/reports", label: "学习报告", description: "看本周薄弱点和建议" },
  { href: "/settings", label: "设置导出", description: "导出数据和检查配置" },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="今晚先把错题留住"
        subtitle="MVP 原型使用 mock 数据，先验证手机端拍题、复习和报告入口。"
      />

      <section className="grid grid-cols-3 gap-3 px-5 pt-5">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">今日待复习</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {dashboardStats.dueToday}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">今日新增</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {dashboardStats.addedToday}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">本周完成</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {dashboardStats.weeklyCompletionRate}
          </p>
        </div>
      </section>

      <section className="px-5 pt-5">
        <h2 className="text-base font-semibold text-slate-950">最快入口</h2>
        <div className="mt-3 grid gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{action.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{action.description}</p>
                </div>
                <span className="text-xl text-blue-600">›</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">薄弱点 Top 3</h2>
          <StatusPill label="mock" tone="blue" />
        </div>
        <div className="mt-3 space-y-3">
          {dashboardStats.weakestTop3.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {index + 1}. {item.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">薄弱分越高越需要优先复盘</p>
              </div>
              <p className="text-lg font-bold text-red-600">{item.score}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pt-5">
        <h2 className="text-base font-semibold text-slate-950">今日样例题</h2>
        <div className="mt-3 space-y-3">
          {mockQuestions.slice(0, 2).map((question) => (
            <article
              key={question.id}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex flex-wrap gap-2">
                <StatusPill label={question.subject} tone="blue" />
                <StatusPill label={question.masteryStatus} tone="amber" />
              </div>
              <p className="mt-3 font-semibold text-slate-950">{question.knowledgePoint}</p>
              <p className="mt-1 text-sm text-slate-600">{question.oneSentenceTip}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
