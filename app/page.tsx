"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import {
  SecondaryStudyLink,
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyDashboardCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import {
  selectTodayLiftFocus,
  type AnalyticsQuestion,
  type AnalyticsReviewResult,
  type TodayLiftFocus,
} from "@/lib/analytics/learning-insights";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

type HomeStats = {
  totalQuestions: number;
  weakQuestionCount: number;
  inboxQuestionCount: number;
  focus: TodayLiftFocus;
};

const emptyFocus: TodayLiftFocus = {
  questions: [],
  weakTopic: null,
  inboxIssue: null,
  emptyMessage: "暂无明显薄弱点，先完成错题复习",
};

const emptyStats: HomeStats = {
  totalQuestions: 0,
  weakQuestionCount: 0,
  inboxQuestionCount: 0,
  focus: emptyFocus,
};

const moduleLinks = [
  {
    href: "/questions",
    title: "错题本",
    description: "按章节、知识点、错因和掌握程度管理长期错题资产",
  },
  {
    href: "/questions?scope=weak",
    title: "今日提分焦点",
    description: "只看最弱知识点、反复错误题和待处理问题",
  },
  {
    href: "/import",
    title: "导入诊断",
    description: "粘贴 JSON 后定位字段、行列、片段和修复示例",
  },
  {
    href: "/questions?scope=recent",
    title: "错题分享",
    description: "进入单题详情，导出 JSON 或生成 1080x1350 分享图",
  },
];

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function isWeakQuestion(question: AnalyticsQuestion) {
  const mastery = question.mastery_status?.trim() ?? "";
  return (
    question.review_priority === "high" ||
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    mastery.includes("没思路") ||
    mastery.includes("有一点思路") ||
    mastery.includes("不稳") ||
    mastery.includes("卡住")
  );
}

function questionTitle(question: AnalyticsQuestion) {
  return question.knowledge_point?.trim() || question.chapter?.trim() || "待整理错题";
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<HomeStats>(emptyStats);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看真实错题资产。");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;

    async function loadHomeStats() {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        setMessage("登录后会显示你的错题资产和提分焦点。");
        return;
      }

      const currentDay = todayIsoDate();
      const weekStart = `${addDays(currentDay, -6)}T00:00:00.000Z`;
      const [questionsResult, recentReviewsResult] = await Promise.all([
        client
          .from("questions")
          .select(
            "id,subject,chapter,knowledge_point,question_text,choices,standard_answer,answer_explanation,mastery_status,review_priority,needs_manual_check,question_text_status,answer_status,answer_source,mistake_types,created_at",
          )
          .eq("user_id", user.id)
          .is("deleted_at", null),
        client
          .from("reviews")
          .select("question_id,review_result,completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", weekStart),
      ]);

      const error = questionsResult.error ?? recentReviewsResult.error;
      if (error) {
        setMessage(`错题资产更新失败：${error.message}`);
        return;
      }

      const questions = (questionsResult.data ?? []) as AnalyticsQuestion[];
      const reviews = (recentReviewsResult.data ?? []) as AnalyticsReviewResult[];
      const focus = selectTodayLiftFocus(questions, reviews, { today: currentDay });

      if (isActive) {
        setStats({
          totalQuestions: questions.length,
          weakQuestionCount: questions.filter(isWeakQuestion).length,
          inboxQuestionCount: focus.inboxIssue ? 1 : 0,
          focus,
        });
        setMessage("");
      }
    }

    loadHomeStats().catch((error) => {
      if (isActive) {
        setMessage(error instanceof Error ? error.message : "错题资产更新失败。");
      }
    });

    return () => {
      isActive = false;
    };
  }, [supabase]);

  const hasFocus =
    stats.focus.questions.length > 0 || stats.focus.weakTopic || stats.focus.inboxIssue;

  return (
    <MobilePageShell className="bg-[#f4f0ff]">
      <StudyPageHeader
        title="数学错题资产管理"
        subtitle="管理长期错题资产，分析薄弱点，并回答：我现在该做什么。"
      />

      <MobileSection>
        <StudyDashboardCard>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/75">错题资产</p>
              <p className="mt-2 text-4xl font-black tracking-normal">{stats.totalQuestions}</p>
              <p className="mt-2 text-sm leading-6 text-white/75">
                系统只保留错题本、今日提分焦点、导入诊断和错题分享四个模块。
              </p>
            </div>
            <div className="shrink-0 rounded-lg bg-white/14 px-3 py-2 text-right">
              <p className="text-xs font-bold text-white/75">薄弱题</p>
              <p className="text-2xl font-black">{stats.weakQuestionCount}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Link
              href="/questions"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-[#4f23b6]"
            >
              打开错题本
            </Link>
            <Link
              href="/import"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/35 px-4 text-sm font-black text-white"
            >
              进入导入诊断
            </Link>
          </div>
        </StudyDashboardCard>
        {message ? (
          <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-600 ring-1 ring-[#e4dcff]">
            {message}
          </p>
        ) : null}
      </MobileSection>

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="错题总量" value={stats.totalQuestions} helper="长期资产" />
          <SprintStatCard label="薄弱题" value={stats.weakQuestionCount} helper="需要优先回看" tone="purple" />
          <SprintStatCard label="收件箱" value={stats.inboxQuestionCount} helper="待处理问题" tone="amber" />
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="核心模块" subtitle="四个入口覆盖管理、决策、诊断和分享。" />
        <div className="grid gap-3">
          {moduleLinks.map((link) => (
            <StudyCard key={link.href}>
              <Link href={link.href} className="flex min-h-14 items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-base font-black text-[#211536]">{link.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {link.description}
                  </span>
                </span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#ede7ff] text-sm font-black text-[#4f23b6]">
                  &gt;
                </span>
              </Link>
            </StudyCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader
          title="今日提分焦点"
          subtitle="不生成计划，只给最多三类可行动信息。"
        />
        <div className="grid gap-3">
          {!hasFocus ? (
            <StudyCard>
              <p className="text-sm font-black text-[#211536]">{stats.focus.emptyMessage}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                数据不足时，先从错题本里挑最近或薄弱题快速回看。
              </p>
            </StudyCard>
          ) : null}

          {stats.focus.questions.length > 0 ? (
            <StudyCard>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#211536]">3道最该做错题</p>
                <StudyBadge tone="purple">{stats.focus.questions.length} 题</StudyBadge>
              </div>
              <div className="mt-3 grid gap-2">
                {stats.focus.questions.map((question) => (
                  <Link
                    key={question.id}
                    href={`/questions/${question.id}`}
                    className="rounded-lg bg-[#f8f5ff] p-3 ring-1 ring-[#e4dcff]"
                  >
                    <p className="break-words text-sm font-black text-[#211536]">
                      {questionTitle(question)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {question.subject} / {question.chapter ?? "未分类"}
                    </p>
                  </Link>
                ))}
              </div>
            </StudyCard>
          ) : null}

          {stats.focus.weakTopic ? (
            <StudyCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#211536]">1个最弱知识点</p>
                  <p className="mt-1 break-words text-base font-black text-[#4f23b6]">
                    {stats.focus.weakTopic.topic}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    最近错误 {stats.focus.weakTopic.recentWrongCount} 次 / 题卡问题 {stats.focus.weakTopic.qualityIssueCount} 个
                  </p>
                </div>
                <SecondaryStudyLink href={stats.focus.weakTopic.actionHref} className="min-h-9 px-3 text-xs">
                  回看
                </SecondaryStudyLink>
              </div>
            </StudyCard>
          ) : null}

          {stats.focus.inboxIssue ? (
            <StudyCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#211536]">1个待处理导入问题</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {stats.focus.inboxIssue.labels.map((label) => (
                      <StudyBadge key={label} tone="amber">
                        {label}
                      </StudyBadge>
                    ))}
                  </div>
                </div>
                <SecondaryStudyLink href={stats.focus.inboxIssue.actionHref} className="min-h-9 px-3 text-xs">
                  整理
                </SecondaryStudyLink>
              </div>
            </StudyCard>
          ) : null}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
