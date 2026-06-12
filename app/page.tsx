"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { MotivationBanner } from "@/components/study/MotivationBanner";
import {
  buildQuestionQualitySummary,
  buildWeaknessTrends,
  type AnalyticsReviewResult,
  type QuestionQualitySummary,
  type WeaknessTrend,
} from "@/lib/analytics/learning-insights";
import {
  ProgressBar,
  SecondaryStudyLink,
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyDashboardCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { todayIsoDate } from "@/lib/dates";
import { getDailyMotivation } from "@/lib/motivation";
import { createClient } from "@/lib/supabase/client";

type DashboardStats = {
  dueToday: number;
  completedToday: number;
  addedToday: number;
  totalQuestions: number;
  completionRate: number;
  focusChapters: string[];
  subjectStats: Array<{ subject: string; total: number; highRisk: number }>;
  weaknessTrends: WeaknessTrend[];
  qualitySummary: QuestionQualitySummary;
};

const emptyQualitySummary: QuestionQualitySummary = {
  totalIssueCount: 0,
  highIssueCount: 0,
  severeIssueCount: 0,
  needsFixCount: 0,
  uncategorizedCount: 0,
  aiUnverifiedCount: 0,
  affectedQuestionCount: 0,
  topIssues: [],
};

const emptyStats: DashboardStats = {
  dueToday: 0,
  completedToday: 0,
  addedToday: 0,
  totalQuestions: 0,
  completionRate: 0,
  focusChapters: [],
  subjectStats: [],
  weaknessTrends: [],
  qualitySummary: emptyQualitySummary,
};

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

const quickLinks = [
  { href: "/questions", title: "错题库", description: "浏览、筛选和进入详情" },
  { href: "/practice", title: "专项复盘", description: "按章节或错因开一轮" },
  { href: "/sprint", title: "考前冲刺", description: "优先处理高风险错题" },
];

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfNextDay(dateKey: string) {
  return `${addDays(dateKey, 1)}T00:00:00.000Z`;
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看真实学习统计。");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;

    async function loadDashboardStats() {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        setMessage("登录后会显示你的实时学习统计。");
        return;
      }

      const today = todayIsoDate();
      const weekStart = `${addDays(today, -6)}T00:00:00.000Z`;
      const [dueResult, completedResult, addedResult, questionsResult, recentReviewsResult] =
        await Promise.all([
        client
          .from("reviews")
          .select("id,questions!inner(deleted_at)", { count: "exact", head: true })
          .eq("user_id", user.id)
          .lte("scheduled_date", today)
          .is("completed_at", null)
          .is("questions.deleted_at", null),
        client
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("completed_at", `${today}T00:00:00.000Z`)
          .lt("completed_at", startOfNextDay(today)),
        client
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", startOfNextDay(today)),
        client
          .from("questions")
          .select("id,subject,chapter,knowledge_point,question_text,standard_answer,answer_explanation,mastery_status,review_priority,needs_manual_check,question_text_status,answer_status,created_at")
          .eq("user_id", user.id)
          .is("deleted_at", null),
        client
          .from("reviews")
          .select("question_id,review_result,completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", weekStart),
      ]);

      const error =
        dueResult.error ??
        completedResult.error ??
        addedResult.error ??
        questionsResult.error ??
        recentReviewsResult.error;

      if (error) {
        setMessage(`学习统计更新失败：${error.message}`);
        return;
      }

      const completedToday = completedResult.count ?? 0;
      const dueToday = dueResult.count ?? 0;
      const todayTotal = completedToday + dueToday;
      const completionRate = todayTotal > 0 ? Math.round((completedToday / todayTotal) * 100) : 0;
      const questionRows = questionsResult.data ?? [];
      const recentReviews = (recentReviewsResult.data ?? []) as AnalyticsReviewResult[];
      const weaknessTrends = buildWeaknessTrends(questionRows, recentReviews, {
        today,
        limit: 3,
      });
      const qualitySummary = buildQuestionQualitySummary(questionRows, { limit: 3 });
      const subjectMap = new Map<string, { subject: string; total: number; highRisk: number }>();
      const focusMap = new Map<string, number>();

      for (const question of questionRows) {
        const subject = String(question.subject ?? "未标科目");
        const current = subjectMap.get(subject) ?? { subject, total: 0, highRisk: 0 };
        current.total += 1;

        const isHighRisk =
          question.review_priority === "high" ||
          question.needs_manual_check ||
          question.question_text_status === "needs_fix" ||
          question.answer_status === "needs_fix" ||
          question.mastery_status === "完全没思路" ||
          question.mastery_status === "思路对但卡住";

        if (isHighRisk) {
          current.highRisk += 1;
          const focus = String(question.knowledge_point ?? question.chapter ?? "待整理错题");
          focusMap.set(focus, (focusMap.get(focus) ?? 0) + 1);
        }

        subjectMap.set(subject, current);
      }

      const focusChapters = Array.from(focusMap, ([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((item) => item.label);

      if (isActive) {
        setStats({
          dueToday,
          completedToday,
          addedToday: addedResult.count ?? 0,
          totalQuestions: questionRows.length,
          completionRate,
          focusChapters,
          weaknessTrends,
          qualitySummary,
          subjectStats: Array.from(subjectMap.values())
            .sort((a, b) => b.highRisk - a.highRisk || b.total - a.total)
            .slice(0, 5),
        });
        setMessage("");
      }
    }

    loadDashboardStats().catch((error) => {
      if (isActive) {
        setMessage(error instanceof Error ? error.message : "学习统计更新失败。");
      }
    });

    return () => {
      isActive = false;
    };
  }, [supabase]);

  return (
    <MobilePageShell className="bg-[#f4f0ff]">
      <StudyPageHeader
        title="今日学习驾驶舱"
        subtitle="先清掉到期复习，再补充新错题。打开首页就知道今天从哪里开始。"
      />

      <MobileSection>
        <StudyDashboardCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white/75">今日待复习</p>
              <p className="mt-2 text-4xl font-black tracking-normal">{stats.dueToday}</p>
              <p className="mt-1 text-sm text-white/75">已完成 {stats.completedToday} 题</p>
            </div>
            <div className="rounded-lg bg-white/14 px-3 py-2 text-right">
              <p className="text-xs font-bold text-white/75">错题总量</p>
              <p className="text-2xl font-black">{stats.totalQuestions}</p>
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar
              value={stats.completionRate}
              label="今日学习进度"
              helper={`${stats.completionRate}%`}
              inverse
            />
          </div>
          {stats.dueToday > 0 ? (
            <div className="mt-5 grid gap-2">
              <Link
                href="/review"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-[#4f23b6]"
              >
                开始今日复习
              </Link>
              <Link
                href="/review/today"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/35 px-4 text-sm font-black text-white"
              >
                查看今日题单
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-lg bg-white/14 p-3">
              <p className="text-sm font-black text-white">今日暂无到期复习</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/questions"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-3 text-xs font-black text-[#4f23b6]"
                >
                  去错题库看看
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/35 px-3 text-xs font-black text-white"
                >
                  拍题上传
                </Link>
              </div>
            </div>
          )}
        </StudyDashboardCard>
        {message ? (
          <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-600 ring-1 ring-[#e4dcff]">
            {message}
          </p>
        ) : null}
      </MobileSection>

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="今日完成" value={stats.completedToday} helper="已写入复习记录" />
          <SprintStatCard label="今日新增" value={stats.addedToday} helper="新整理错题" />
          <SprintStatCard label="错题总量" value={stats.totalQuestions} helper="当前题库" />
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader
          title="今日提分焦点"
          subtitle="根据最近 7 天复习结果和题卡质量，先处理最可能拖分的知识点。"
          action={<StudyBadge tone="purple">{stats.weaknessTrends.length || 0} 项</StudyBadge>}
        />
        <div className="grid gap-3">
          {stats.weaknessTrends.length > 0 ? (
            stats.weaknessTrends.map((trend) => (
              <StudyCard key={trend.topic}>
                <Link href={trend.actionHref} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#211536]">{trend.topic}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {trend.subject} / {trend.chapter}
                      </p>
                    </div>
                    <StudyBadge tone={trend.trend === "up" ? "amber" : trend.trend === "down" ? "green" : "purple"}>
                      {trend.trend === "up" ? "反复错" : trend.trend === "down" ? "变稳定" : "待观察"}
                    </StudyBadge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600">{trend.recommendation}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-[#f8f5ff] p-2">
                      <p className="text-[11px] font-bold text-slate-500">近 7 天错</p>
                      <p className="mt-1 text-lg font-black text-[#4f23b6]">{trend.recentWrongCount}</p>
                    </div>
                    <div className="rounded-lg bg-[#f8f5ff] p-2">
                      <p className="text-[11px] font-bold text-slate-500">题卡问题</p>
                      <p className="mt-1 text-lg font-black text-[#4f23b6]">{trend.qualityIssueCount}</p>
                    </div>
                    <div className="rounded-lg bg-[#f8f5ff] p-2">
                      <p className="text-[11px] font-bold text-slate-500">题量</p>
                      <p className="mt-1 text-lg font-black text-[#4f23b6]">{trend.questionCount}</p>
                    </div>
                  </div>
                </Link>
              </StudyCard>
            ))
          ) : (
            <StudyCard>
              <p className="text-sm font-black text-[#211536]">暂无明显薄弱点变化</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                完成几轮复习后，这里会显示最近更该专项处理的知识点。
              </p>
            </StudyCard>
          )}
          {stats.qualitySummary.totalIssueCount > 0 ? (
            <SecondaryStudyLink href="/questions?scope=inbox" className="justify-between">
              <span>整理收件箱</span>
              <span className="text-xs font-semibold text-slate-500">
                {stats.qualitySummary.affectedQuestionCount} 题待整理
              </span>
            </SecondaryStudyLink>
          ) : null}
        </div>
      </MobileSection>

      <MobileSection>
        <MotivationBanner text={getDailyMotivation()} />
      </MobileSection>

      <MobileSection>
        <SectionHeader title="快速开始" subtitle="先完成最重要的复习，再处理新增错题。" />
        <div className="grid gap-3">
          {primaryActions.slice(1).map((action) => (
            <StudyCard key={action.href}>
              <Link href={action.href} className="flex min-h-12 items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-black text-[#211536]">{action.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{action.description}</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ede7ff] text-sm font-black text-[#4f23b6]">
                  &gt;
                </span>
              </Link>
            </StudyCard>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <SecondaryStudyLink key={link.href} href={link.href} className="flex-col items-start text-left">
                <span>{link.title}</span>
                <span className="mt-1 text-xs font-semibold text-slate-500">{link.description}</span>
              </SecondaryStudyLink>
            ))}
          </div>
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="科目入口" subtitle="按薄弱程度排序，先看高风险科目。" />
        <div className="grid gap-3">
          {stats.subjectStats.length === 0 ? (
            <StudyCard>
              <p className="text-sm font-black text-[#211536]">还没有错题数据</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                可以先拍题上传，或导入 ChatGPT 整理好的错题卡。
              </p>
            </StudyCard>
          ) : null}
          {stats.subjectStats.map((subject) => (
            <StudyCard key={subject.subject}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-[#211536]">{subject.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {subject.total} 题 · 高风险 {subject.highRisk} 题
                  </p>
                </div>
                <StudyBadge tone={subject.highRisk > 0 ? "amber" : "green"}>
                  {subject.highRisk > 0 ? "需要关注" : "节奏稳定"}
                </StudyBadge>
              </div>
            </StudyCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="薄弱提醒" subtitle="优先处理会影响下一轮复盘的章节。" />
        <StudyCard>
          <div className="flex flex-wrap gap-2">
            {(stats.focusChapters.length > 0 ? stats.focusChapters : ["先完成今日复习", "整理新错题"]).map((item) => (
              <StudyBadge key={item} tone="purple">{item}</StudyBadge>
            ))}
          </div>
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="智能自检" subtitle="本阶段只预留入口，不自动改题干、图片或标准答案。" />
        <StudyCard>
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-black text-[#211536]">数据异常检查</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                后续用于检查章节、知识点、难度、标签和复习计划异常。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryStudyLink href="/settings/system-check">查看系统检查</SecondaryStudyLink>
              <SecondaryStudyLink href="/questions">查看错题库</SecondaryStudyLink>
            </div>
          </div>
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="更多入口" subtitle="低频查看放在下面，学习时不用先处理它们。" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/reports", title: "学习报告" },
            { href: "/settings", title: "账号与导出" },
          ].map((link) => (
            <SecondaryStudyLink key={link.href} href={link.href}>
              {link.title}
            </SecondaryStudyLink>
          ))}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
