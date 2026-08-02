"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildQuestionQualitySummary,
  selectTodayLiftFocus,
  type AnalyticsQuestion,
  type AnalyticsReviewResult,
  type TodayLiftFocus,
} from "@/lib/analytics/learning-insights";
import { BrandLogo } from "@/components/brand-logo";
import { ProfessionalPracticeLauncher } from "@/components/study/ProfessionalPracticeLauncher";
import { buildHomeActionCards, type HomeActionCard } from "@/lib/analytics/home-actions";
import { todayIsoDate } from "@/lib/dates";
import type { PracticeQuestion } from "@/lib/practice/practice-catalog";
import { fetchCurrentUserQuestionRecords } from "@/lib/questions";
import { createClient } from "@/lib/supabase/client";
import type { QuestionSourceInfo } from "@/lib/types";

type SubjectProgress = {
  name: string;
  total: number;
  weak: number;
  progress: number;
};

type HomeStats = {
  totalQuestions: number;
  weakQuestionCount: number;
  inboxQuestionCount: number;
  focus: TodayLiftFocus;
  actionCards: HomeActionCard[];
  subjects: SubjectProgress[];
  practiceQuestions: PracticeQuestion[];
};

const examSubjects = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];

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
  actionCards: buildHomeActionCards({ focus: emptyFocus, questions: [], reviews: [] }),
  subjects: examSubjects.map((name) => ({ name, total: 0, weak: 0, progress: 0 })),
  practiceQuestions: [],
};

const quickActions = [
  { href: "/questions", label: "错题库", helper: "查找和整理错题" },
  { href: "/import", label: "导入错题", helper: "预览后再保存" },
  { href: "/review/today", label: "今日复习", helper: "处理今天到期的题" },
  { href: "/practice", label: "专项练习", helper: "连续练习 408 选择题" },
];

const desktopNavLinks = [
  { href: "/", label: "首页" },
  { href: "/questions", label: "错题库" },
  { href: "/import", label: "导入" },
  { href: "/practice", label: "复习" },
  { href: "/profile", label: "我的" },
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

function questionSourceLabel(question: AnalyticsQuestion) {
  const info = question.source_info;

  if (typeof info === "string" && info.trim()) {
    return info.trim();
  }

  if (info && typeof info === "object") {
    return info.name?.trim() || info.raw?.trim() || info.type?.trim() || "未标题源";
  }

  return question.source?.trim() || "未标题源";
}

function buildSubjectProgress(questions: AnalyticsQuestion[]): SubjectProgress[] {
  return examSubjects.map((name) => {
    const items = questions.filter((question) => question.subject === name);
    const weak = items.filter(isWeakQuestion).length;
    const stable = Math.max(0, items.length - weak);
    const progress = items.length > 0 ? Math.round((stable / items.length) * 100) : 0;

    return { name, total: items.length, weak, progress };
  });
}

function toPracticeQuestion(question: AnalyticsQuestion): PracticeQuestion {
  return {
    id: question.id,
    subject: question.subject,
    chapter: question.chapter,
    knowledge_point: question.knowledge_point,
    difficulty: question.difficulty ?? null,
    mastery_status: question.mastery_status ?? null,
    question_text_status: question.question_text_status,
    answer_status: question.answer_status,
    needs_manual_check: question.needs_manual_check,
    review_priority: question.review_priority,
    mistake_types: question.mistake_types ?? null,
    choices: question.choices ?? [],
    created_at: question.created_at,
    source_info:
      question.source_info && typeof question.source_info === "object"
        ? (question.source_info as QuestionSourceInfo)
        : null,
    question_text: question.question_text,
    standard_answer: question.standard_answer,
    answer_explanation: question.answer_explanation,
    image_path: question.image_path,
  };
}

function HomeExamLogo({ compact = false }: { compact?: boolean }) {
  return <BrandLogo size={compact ? "md" : "lg"} compact={false} />;
}

function HomePanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.055)] transition duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)] ${className}`}
    >
      {children}
    </section>
  );
}

function HomeQuickActions() {
  return (
    <section aria-label="核心操作" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {quickActions.map((action, index) => (
        <Link
          key={action.href}
          href={action.href}
          className={`rounded-[18px] p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
            index === 1
              ? "bg-[#10b981] text-white shadow-[0_14px_30px_rgba(16,185,129,0.2)]"
              : "border border-slate-100 bg-white text-slate-950"
          }`}
        >
          <p className="text-base font-black">{action.label}</p>
          <p className={`mt-1 text-xs leading-5 ${index === 1 ? "text-white/80" : "text-slate-500"}`}>
            {action.helper}
          </p>
        </Link>
      ))}
    </section>
  );
}

function HomeSubjectProgress({ subjects }: { subjects: SubjectProgress[] }) {
  const average =
    subjects.length > 0
      ? Math.round(subjects.reduce((sum, subject) => sum + subject.progress, 0) / subjects.length)
      : 0;

  return (
    <HomePanel>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">数学 + 408 掌握进度</h2>
          <p className="mt-1 text-sm font-bold text-slate-400">数学与 408 进度按真实错题资产和薄弱题比例展示。</p>
        </div>
        <p className="text-sm font-black text-slate-600">数学 + 408 平均掌握率 {average}%</p>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {subjects.map((subject) => (
          <div key={subject.name}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-950">{subject.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{subject.total} 题</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black tracking-normal text-slate-950">{subject.progress}%</p>
                <p className="text-xs font-bold text-slate-400">掌握率</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${subject.progress}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
              <span className="rounded-lg bg-emerald-100 px-3 py-2 text-emerald-700">
                已稳 {Math.max(0, subject.total - subject.weak)}
              </span>
              <span className="rounded-lg bg-amber-100 px-3 py-2 text-amber-700">不熟 {subject.weak}</span>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-500">总计 {subject.total}</span>
            </div>
          </div>
        ))}
      </div>
    </HomePanel>
  );
}

function RecentQuestions({ focus }: { focus: TodayLiftFocus }) {
  if (focus.questions.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-xs font-black text-[#10b981]">今日提分焦点 / 3道最该做错题</p>
        <p className="text-sm font-black text-slate-900">{focus.emptyMessage}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">先导入或整理错题后，这里会显示最近最该回看的题卡。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs font-black text-[#10b981]">今日提分焦点 / 3道最该做错题</p>
      {focus.questions.map((question) => (
        <Link
          key={question.id}
          href={`/questions/${question.id}`}
          className="block rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
        >
          <p className="text-sm font-black text-slate-950">{questionTitle(question)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {questionSourceLabel(question)} / {question.subject} / {question.chapter ?? "未分类"} /{" "}
            {question.knowledge_point ?? "待识别知识点"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">继续做</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">查看解析</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

const actionToneClass: Record<HomeActionCard["tone"], string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  slate: "bg-slate-50 text-slate-700 ring-slate-100",
};

function HomeActionPanel({ actions }: { actions: HomeActionCard[] }) {
  return (
    <HomePanel>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">当前待办</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">按待整理、薄弱章节和最近作答动态生成。</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
          {actions.length} 项
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={`block rounded-lg p-4 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${actionToneClass[action.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-black">{action.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 opacity-80">
                  {action.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-black">
                {action.metric}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/questions?scope=inbox"
        className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-sm font-black text-slate-600 ring-1 ring-slate-100"
      >
        查看更多待办
      </Link>
    </HomePanel>
  );
}

function WeaknessPanel({ focus, weakQuestionCount }: { focus: TodayLiftFocus; weakQuestionCount: number }) {
  return (
    <HomePanel>
      <h2 className="text-lg font-black text-slate-950">本章欠缺分析</h2>
      {focus.weakTopic ? (
        <div className="mt-4 rounded-lg bg-red-50 p-4">
          <p className="text-base font-black text-red-700">{focus.weakTopic.topic}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            最近错误 {focus.weakTopic.recentWrongCount} 次，题卡问题 {focus.weakTopic.qualityIssueCount} 个。
          </p>
          <Link href={focus.weakTopic.actionHref} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-sm font-black text-red-600 ring-1 ring-red-100">
            回看本章
          </Link>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-500">
          当前薄弱题 {weakQuestionCount} 道。继续整理题卡后，会按章节给出更明确的欠缺判断。
        </p>
      )}
    </HomePanel>
  );
}

function HomeDesktopLayout({
  stats,
  message,
  loading,
}: {
  stats: HomeStats;
  message: string;
  loading: boolean;
}) {
  return (
    <div data-testid="home-desktop-dashboard" className="hidden min-h-screen bg-[#f7f9fb] text-slate-950 md:block">
      <nav aria-label="桌面首页导航" className="border-b border-slate-100 bg-white px-8 py-5">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8">
          <HomeExamLogo />
          <div className="flex items-center gap-8 text-base font-bold text-slate-500">
            {desktopNavLinks.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={index === 0 ? "text-slate-900" : "hover:text-slate-900"}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Link href="/settings" className="text-sm font-bold text-slate-500 hover:text-slate-900">
            设置
          </Link>
        </div>
      </nav>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-6 py-4">
        <section className="grid gap-4 lg:grid-cols-4">
          <HomePanel className="flex min-h-36 items-center gap-5">
            <div>
              <p className="text-sm font-black text-slate-500">当前题库</p>
              <p className="mt-2 text-3xl font-black tracking-normal text-slate-900">408 错题库</p>
              <Link href="/profile" className="mt-2 inline-flex text-sm font-black text-[#10b981]">
                查看学习档案
              </Link>
            </div>
          </HomePanel>
          <HomePanel className="flex min-h-36 items-center gap-5">
            <div>
              <p className="text-sm font-black text-slate-600">错题总量</p>
              <p className="mt-2 text-4xl font-black tracking-normal text-slate-900">{stats.totalQuestions}</p>
              <p className="mt-1 text-sm text-slate-500">来自你的真实题库</p>
            </div>
          </HomePanel>
          <HomePanel className="flex min-h-36 items-center justify-between gap-5">
            <div>
              <p className="text-sm font-black text-slate-600">待处理题</p>
              <p className="mt-2 text-3xl font-black tracking-normal text-slate-900">{stats.weakQuestionCount}题</p>
              <p className="mt-1 text-sm text-slate-500">不熟 / 不会 / 需核对</p>
            </div>
            <Link href="/questions?scope=weak" className="text-sm font-black text-[#10b981]">
              立即处理 &gt;
            </Link>
          </HomePanel>
          <HomePanel className="flex min-h-36 items-center gap-5">
            <div>
              <p className="text-sm font-black text-slate-700">11408通关进度</p>
              <p className="mt-2 text-3xl font-black tracking-normal text-slate-900">
                {Math.round(stats.subjects.reduce((sum, subject) => sum + subject.progress, 0) / stats.subjects.length)}%
              </p>
            </div>
          </HomePanel>
        </section>

        {message ? (
          <p className="rounded-[18px] border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">{message}</p>
        ) : null}

        <HomeQuickActions />

        <ProfessionalPracticeLauncher
          questions={stats.practiceQuestions}
          loading={loading}
        />

        <section className="grid gap-4 xl:grid-cols-3">
          <HomeActionPanel actions={stats.actionCards} />
          <HomePanel>
            <h2 className="text-lg font-black text-slate-900">最近错题</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">优先显示今天最值得回看的 3 道题。</p>
            <div className="mt-4">
              <RecentQuestions focus={stats.focus} />
            </div>
          </HomePanel>
          <WeaknessPanel focus={stats.focus} weakQuestionCount={stats.weakQuestionCount} />
        </section>

        <HomeSubjectProgress subjects={stats.subjects} />
      </main>
    </div>
  );
}

function HomeMobileLayout({
  stats,
  message,
  loading,
}: {
  stats: HomeStats;
  message: string;
  loading: boolean;
}) {
  return (
    <div data-testid="home-mobile-dashboard" className="min-h-screen bg-[#f7f9fb] px-4 pb-28 pt-4 text-slate-950 md:hidden">
      <header className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
        <div className="flex items-center justify-between gap-3">
          <HomeExamLogo compact />
          <Link
            href="/profile"
            aria-label="打开学习档案"
            title="学习档案"
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600"
          >
            我的
          </Link>
        </div>
        <div className="mt-5 rounded-[18px] bg-emerald-50 p-4">
          <p className="text-xs font-black text-[#10b981]">今天从这里开始</p>
          <h1 className="mt-2 text-2xl font-black tracking-normal text-slate-950">11408 错题复盘</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">导入错题、完成复习，并把薄弱章节逐个解决。</p>
        </div>
      </header>

      {message ? (
        <p className="mt-4 rounded-[18px] border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">{message}</p>
      ) : null}

      <section className="mt-4 grid grid-cols-3 gap-3">
        <HomePanel className="p-4">
          <p className="text-xs font-black text-slate-500">错题总量</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{stats.totalQuestions}</p>
        </HomePanel>
        <HomePanel className="p-4">
          <p className="text-xs font-black text-slate-500">薄弱题</p>
          <p className="mt-2 text-2xl font-black text-[#10b981]">{stats.weakQuestionCount}</p>
        </HomePanel>
        <HomePanel className="p-4">
          <p className="text-xs font-black text-slate-500">待整理</p>
          <p className="mt-2 text-2xl font-black text-amber-600">{stats.inboxQuestionCount}</p>
        </HomePanel>
      </section>

      <section className="mt-4 grid gap-3">
        <Link href="/questions" className="flex min-h-16 items-center justify-between rounded-[18px] bg-[#10b981] px-5 text-base font-black text-white shadow-[0_18px_35px_rgba(16,185,129,0.24)]">
          <span>打开错题本</span>
          <span>&gt;</span>
        </Link>
        <Link href="/import" className="flex min-h-14 items-center justify-between rounded-[18px] border border-emerald-100 bg-white px-5 text-base font-black text-[#10b981]">
          <span>导入错题</span>
          <span>&gt;</span>
        </Link>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/review/today" className="rounded-[18px] bg-[#10b981] p-4 text-sm font-black text-white shadow-[0_18px_35px_rgba(16,185,129,0.2)]">
          今日复习
          <span className="mt-2 block text-xs font-semibold text-white/80">处理排到今天的题</span>
        </Link>
        <Link href="/questions?scope=weak" className="rounded-[18px] border border-amber-100 bg-amber-50 p-4 text-sm font-black text-amber-800">
          薄弱复习
          <span className="mt-2 block text-xs font-semibold text-amber-700/80">{stats.weakQuestionCount} 题待处理</span>
        </Link>
      </section>

      <ProfessionalPracticeLauncher
        questions={stats.practiceQuestions}
        loading={loading}
        className="mt-5"
      />

      <section className="mt-5">
        <div className="mb-3">
          <h2 className="text-base font-black text-slate-950">数学 + 408 入口</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">按真实题库数量和薄弱题比例展示。</p>
        </div>
        <div className="grid gap-3">
          {stats.subjects.map((subject) => (
            <div key={subject.name} className="rounded-[18px] border border-slate-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{subject.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{subject.total} 题 / 薄弱 {subject.weak}</p>
                </div>
                <p className="text-xl font-black text-[#10b981]">{subject.progress}%</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${subject.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[18px] border border-slate-100 bg-white p-4">
        <h2 className="text-base font-black text-slate-950">今日提分焦点</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">最近错题会优先展示 3 道最该做错题。</p>
        <div className="mt-3">
          <RecentQuestions focus={stats.focus} />
        </div>
      </section>

      <div className="mt-5">
        <HomeActionPanel actions={stats.actionCards} />
      </div>

      <div className="mt-5">
        <WeaknessPanel focus={stats.focus} weakQuestionCount={stats.weakQuestionCount} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<HomeStats>(emptyStats);
  const [message, setMessage] = useState(supabase ? "" : "当前未连接错题数据，请先到设置完成连接。");
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

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
      const activityStart = `${addDays(currentDay, -89)}T00:00:00.000Z`;
      const [
        questionRecords,
        recentReviewsResult,
        dueReviewsResult,
      ] = await Promise.all([
        fetchCurrentUserQuestionRecords(client),
        client
          .from("reviews")
          .select("question_id,review_result,completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", activityStart),
        client
          .from("reviews")
          .select("question_id,review_result,completed_at")
          .eq("user_id", user.id)
          .lte("scheduled_date", currentDay)
          .is("completed_at", null),
      ]);

      const error =
        recentReviewsResult.error ??
        dueReviewsResult.error;
      if (error) {
        setMessage(`错题资产更新失败：${error.message}`);
        return;
      }

      const questions = questionRecords as AnalyticsQuestion[];
      const reviews = [
        ...((recentReviewsResult.data ?? []) as AnalyticsReviewResult[]),
        ...((dueReviewsResult.data ?? []) as AnalyticsReviewResult[]),
      ];
      const focus = selectTodayLiftFocus(questions, reviews, { today: currentDay });
      const actionCards = buildHomeActionCards({ focus, questions, reviews });
      const qualitySummary = buildQuestionQualitySummary(questions);
      const practiceQuestions = questions.map(toPracticeQuestion);

      if (isActive) {
        setStats({
          totalQuestions: questions.length,
          weakQuestionCount: questions.filter(isWeakQuestion).length,
          inboxQuestionCount: qualitySummary.affectedQuestionCount,
          focus,
          actionCards,
          subjects: buildSubjectProgress(questions),
          practiceQuestions,
        });
        setMessage("");
      }
    }

    loadHomeStats().catch((error) => {
      if (isActive) {
        setMessage(error instanceof Error ? error.message : "错题资产更新失败。");
      }
    }).finally(() => {
      if (isActive) {
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [supabase]);

  return (
    <>
      <HomeDesktopLayout stats={stats} message={message} loading={isLoading} />
      <HomeMobileLayout stats={stats} message={message} loading={isLoading} />
    </>
  );
}
