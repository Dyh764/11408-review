"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { fetchCurrentUserReports, type ReportRecord, type ReportType } from "@/lib/reports";
import { createClient } from "@/lib/supabase/client";

const tabLabels: Record<ReportType, string> = {
  daily: "日报",
  weekly: "周报",
  monthly: "月报",
};

type RankedItem = {
  label?: string;
  count?: number;
  subject?: string;
  chapter?: string;
  knowledge_point?: string;
  weakness_score?: number;
  detail?: string;
  title?: string;
};

type ReportContent = {
  title?: string;
  summary?: Record<string, unknown>;
  subject_distribution?: RankedItem[];
  frequent_mistake_types?: RankedItem[];
  weakest_knowledge_points?: RankedItem[];
  repeated_wrong_knowledge_points?: RankedItem[];
  next_actions?: RankedItem[];
  tomorrow_suggestions?: RankedItem[];
  weekly_suggestions?: RankedItem[];
  monthly_focus?: RankedItem[];
};

const metricLabels: Record<string, string> = {
  new_questions: "新增错题",
  analyzed_questions: "已分析错题",
  completed_reviews: "完成复习",
  overdue_reviews: "逾期复习",
  mastered_count: "已掌握",
  wrong_again_count: "复习后又错",
  review_completion_rate: "复习完成率",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toContent(value: unknown): ReportContent {
  if (!isRecord(value)) {
    return {};
  }

  return value as ReportContent;
}

function asItems(value: unknown) {
  return Array.isArray(value) ? (value as RankedItem[]) : [];
}

function formatMetric(key: string, value: unknown) {
  if (typeof value !== "number") {
    return String(value ?? 0);
  }

  return key === "review_completion_rate" ? `${value}%` : String(value);
}

function pickSuggestions(content: ReportContent, tab: ReportType) {
  if (tab === "daily") {
    return asItems(content.tomorrow_suggestions ?? content.next_actions);
  }

  if (tab === "weekly") {
    return asItems(content.weekly_suggestions ?? content.next_actions);
  }

  return asItems(content.monthly_focus ?? content.next_actions);
}

function LatestReport({ report, tab }: { report: ReportRecord; tab: ReportType }) {
  const content = toContent(report.content_json);
  const summary = isRecord(content.summary) ? content.summary : {};
  const metrics = Object.entries(metricLabels).filter(([key]) => key in summary);
  const subjectDistribution = asItems(content.subject_distribution);
  const mistakeTypes = asItems(content.frequent_mistake_types);
  const weakPoints = asItems(content.weakest_knowledge_points);
  const nextActions = pickSuggestions(content, tab);

  return (
    <section className="space-y-4 px-5 pt-5">
      <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="break-words font-semibold text-slate-950">
              {content.title ?? `${tabLabels[tab]} ${report.start_date}`}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {report.start_date} 至 {report.end_date}
            </p>
          </div>
          <StatusPill label="real report" tone="blue" />
        </div>
      </article>

      <section className="grid grid-cols-2 gap-3">
        {metrics.length > 0 ? (
          metrics.map(([key]) => (
            <div key={key} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs text-slate-500">{metricLabels[key]}</p>
              <p className="mt-2 break-words text-2xl font-bold text-slate-950">
                {formatMetric(key, summary[key])}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-2 rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            这份报告暂无总结数据。
          </div>
        )}
      </section>

      <ReportList title="科目分布" items={subjectDistribution} empty="暂无科目分布。" />
      <ReportList title="高频错因" items={mistakeTypes} empty="暂无高频错因。" />
      <ReportList title="薄弱知识点" items={weakPoints} empty="暂无薄弱知识点。" showScore />
      <ReportList title="下一步建议" items={nextActions} empty="暂无下一步建议。" />
    </section>
  );
}

function ReportList({
  title,
  items,
  empty,
  showScore = false,
}: {
  title: string;
  items: RankedItem[];
  empty: string;
  showScore?: boolean;
}) {
  return (
    <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 10).map((item, index) => {
            const label = item.label ?? item.knowledge_point ?? item.title ?? "未命名";
            const meta = item.detail ?? item.subject ?? item.chapter ?? "";
            const value =
              showScore && typeof item.weakness_score === "number"
                ? `弱点分 ${item.weakness_score}`
                : typeof item.count === "number"
                  ? `${item.count} 次`
                  : "";

            return (
              <li
                key={`${label}-${index}`}
                className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 break-words">{label}</span>
                  {value ? <span className="shrink-0 text-xs text-slate-500">{value}</span> : null}
                </div>
                {meta ? <p className="mt-1 break-words text-xs text-slate-500">{meta}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">{empty}</p>
      )}
    </article>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportType>("daily");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实报告。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    fetchCurrentUserReports(supabase)
      .then((items) => {
        if (isActive) {
          setReports(items);
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取报告失败。");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [supabase]);

  const latestReport = reports.find((report) => report.type === tab) ?? null;

  return (
    <div>
      <PageHeader
        title="学习报告"
        subtitle="读取 reports 表中的日报、周报和月报，按当前登录用户的 RLS 数据展示。"
      />

      <section className="px-5 pt-5">
        <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">
          {(Object.keys(tabLabels) as ReportType[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`min-h-11 rounded-md text-sm font-semibold ${
                tab === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
              }`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <p className="px-5 pt-5 text-sm text-slate-500">正在读取报告...</p>
      ) : null}

      {message ? (
        <section className="px-5 pt-5">
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </section>
      ) : null}

      {!isLoading && !latestReport ? (
        <section className="px-5 pt-5">
          <div className="rounded-lg bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-slate-100">
            暂无{tabLabels[tab]}。部署 Cron 后，系统会按计划写入 reports 表；也可以先手动调用对应 Edge Function 生成。
          </div>
        </section>
      ) : null}

      {latestReport ? <LatestReport report={latestReport} tab={tab} /> : null}
    </div>
  );
}
