"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState, MobileCard, MobilePageShell, MobileSection, SectionCard } from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { fetchCurrentUserReports, type ReportRecord, type ReportType } from "@/lib/reports";
import { createClient } from "@/lib/supabase/client";

const tabLabels: Record<ReportType, string> = {
  daily: "日报",
  weekly: "周报",
  monthly: "月报",
};

const generateButtonLabels: Record<ReportType, string> = {
  daily: "生成今日报告",
  weekly: "生成本周报告",
  monthly: "生成本月报告",
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
  answered_questions: "有答案",
  unanswered_questions: "无答案",
  answer_unverified_count: "答案待核对",
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
  const repeatedWrong = asItems(content.repeated_wrong_knowledge_points);
  const nextActions = pickSuggestions(content, tab);

  return (
    <MobileSection>
      <div className="space-y-4">
      <SectionCard title="今日总结">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="break-words font-semibold text-slate-950">
              {content.title ?? `${tabLabels[tab]} ${report.start_date}`}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {report.start_date} 至 {report.end_date}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="有答案 / 无答案 / 待核对">
      <div className="grid grid-cols-2 gap-3">
        {metrics.length > 0 ? (
          metrics.map(([key]) => (
            <div key={key} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs text-slate-500">{metricLabels[key]}</p>
              <p className="mt-2 break-words text-2xl font-bold text-slate-950">
                {formatMetric(key, summary[key])}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
            这份报告暂无总结数据。
          </div>
        )}
      </div>
      </SectionCard>

      <ReportList title="薄弱点 Top 3" items={weakPoints.slice(0, 3)} empty="暂无薄弱点。" showScore />
      <ReportList title="高频错因" items={mistakeTypes} empty="暂无高频错因。" />
      <ReportList title="科目分布" items={subjectDistribution} empty="暂无科目分布。" />
      <ReportList title="重复错误点" items={repeatedWrong.slice(0, 3)} empty="暂无重复错误点。" showScore />
      <ReportList title="下一步建议" items={nextActions} empty="暂无下一步建议。" />
      </div>
    </MobileSection>
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
  const maxCount = Math.max(...items.map((item) => item.count ?? 0), 1);

  return (
    <MobileCard>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
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
                {title === "科目分布" && typeof item.count === "number" ? (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.max(8, Math.round((item.count / maxCount) * 100))}%` }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">{empty}</p>
      )}
    </MobileCard>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportType>("daily");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实报告。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isGenerating, setIsGenerating] = useState(false);
  const [deepSeekConfigured, setDeepSeekConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/settings/status")
      .then((response) => response.json())
      .then((data: { deepseek?: { configured: boolean } }) => {
        setDeepSeekConfigured(Boolean(data.deepseek?.configured));
      })
      .catch(() => setDeepSeekConfigured(false));
  }, []);

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

  const reportsForTab = reports.filter((report) => report.type === tab);
  const selectedReport =
    reportsForTab.find((report) => report.id === selectedReportId) ?? reportsForTab[0] ?? null;

  async function handleGenerateReport(source: "rule" | "deepseek" = "rule") {
    setIsGenerating(true);
    setMessage("");

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, source }),
      });
      const result = (await response.json()) as { report?: ReportRecord; error?: string };

      if (!response.ok || !result.report) {
        setMessage(result.error ?? "生成报告失败。");
        return;
      }

      setReports((current) => [
        result.report as ReportRecord,
        ...current.filter((report) => report.id !== result.report?.id),
      ]);
      setSelectedReportId(result.report.id);
      setMessage("规则版报告已生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成报告失败。");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <MobilePageShell>
      <PageHeader
        title="学习报告"
        subtitle="像复盘小结一样看今天学得怎么样，以及下一步先补哪里。"
      />

      <section className="px-5 pt-5">
        <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">
          {(Object.keys(tabLabels) as ReportType[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setSelectedReportId("");
              }}
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
        <MobileSection>
          <LoadingState label="正在读取报告..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {!isLoading && !selectedReport ? (
        <MobileSection>
          <MobileCard>
            <h2 className="text-base font-bold text-slate-950">还没有报告</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              还没有报告。完成几次导入或复习后，可以生成学习总结。
            </p>
            <button
              type="button"
              onClick={() => handleGenerateReport("rule")}
              disabled={isGenerating}
              className="mt-4 min-h-12 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {isGenerating ? "生成中..." : generateButtonLabels[tab]}
            </button>
          </MobileCard>
        </MobileSection>
      ) : null}

      {selectedReport ? <LatestReport report={selectedReport} tab={tab} /> : null}

      <MobileSection>
        <MobileCard>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800">智能总结（可选）</h2>
            <StatusPill
              label={deepSeekConfigured ? "已启用" : "未启用（可选）"}
              tone={deepSeekConfigured ? "blue" : "amber"}
            />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {deepSeekConfigured
              ? "可在现有统计基础上生成一版学习建议；普通报告始终可用。"
              : "当前先使用普通学习统计，不影响报告生成。"}
          </p>
          <button
            type="button"
            onClick={() => handleGenerateReport("deepseek")}
            disabled={isGenerating || !deepSeekConfigured}
            className="mt-4 min-h-12 w-full rounded-lg bg-amber-100 px-4 text-sm font-semibold text-amber-800 disabled:bg-slate-100 disabled:text-slate-400"
          >
            生成智能总结
          </button>
        </MobileCard>
      </MobileSection>

      {reportsForTab.length > 1 ? (
        <MobileSection>
          <MobileCard>
            <h3 className="text-sm font-bold text-slate-800">历史{tabLabels[tab]}</h3>
            <div className="mt-3 space-y-2">
              {reportsForTab.slice(0, 8).map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm ${
                    selectedReport?.id === report.id
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                      : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="break-words">
                    {report.start_date} 至 {report.end_date}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(report.created_at).toLocaleDateString("zh-CN")}
                  </span>
                </button>
              ))}
            </div>
          </MobileCard>
        </MobileSection>
      ) : null}
    </MobilePageShell>
  );
}
