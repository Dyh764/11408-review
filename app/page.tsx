"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  selectTodayLiftFocus,
  type AnalyticsQuestion,
  type AnalyticsReviewResult,
  type TodayLiftFocus,
} from "@/lib/analytics/learning-insights";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

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
  subjects: SubjectProgress[];
  reviewActivity: Record<string, number>;
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
  subjects: examSubjects.map((name) => ({ name, total: 0, weak: 0, progress: 0 })),
  reviewActivity: {},
};

const moduleLinks = [
  {
    href: "/questions",
    title: "错题本",
    description: "按章节、知识点、错因和掌握程度管理长期错题资产",
  },
  {
    href: "/import",
    title: "导入错题",
    description: "粘贴 ChatGPT JSON，预览确认后进入错题库",
  },
  {
    href: "/questions?scope=weak",
    title: "薄弱题本",
    description: "优先处理不会、不熟和需要人工核对的题卡",
  },
  {
    href: "/practice",
    title: "章节复盘",
    description: "按章节和错因进入专项训练，不打乱正式题库",
  },
  {
    href: "/questions?scope=recent",
    title: "错题分享",
    description: "进入单题详情，导出 JSON 或生成分享图",
  },
];

const featureLinks = [
  { href: "/import", label: "导入错题" },
  { href: "/questions", label: "错题库" },
  { href: "/practice", label: "章节复盘" },
  { href: "/reports", label: "学习报告" },
  { href: "/questions?scope=recent", label: "错题分享" },
  { href: "/settings", label: "数据设置" },
];

const desktopNavLinks = [
  { href: "/", label: "首页面板" },
  { href: "/questions", label: "错题总览" },
  { href: "/reports", label: "错题分析" },
  { href: "/knowledge-map", label: "知识图谱" },
  { href: "/statistics", label: "数据统计" },
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

function buildSubjectProgress(questions: AnalyticsQuestion[]): SubjectProgress[] {
  return examSubjects.map((name) => {
    const items = questions.filter((question) => question.subject === name);
    const weak = items.filter(isWeakQuestion).length;
    const stable = Math.max(0, items.length - weak);
    const progress = items.length > 0 ? Math.round((stable / items.length) * 100) : 0;

    return { name, total: items.length, weak, progress };
  });
}

function buildReviewActivity(reviews: AnalyticsReviewResult[]) {
  return reviews.reduce<Record<string, number>>((activity, review) => {
    const key = review.completed_at?.slice(0, 10);
    if (key) {
      activity[key] = (activity[key] ?? 0) + 1;
    }
    return activity;
  }, {});
}

function HomeExamLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={compact ? "relative h-9 w-9" : "relative h-12 w-12"} aria-hidden="true">
        <span className="absolute left-0 top-3 h-5 w-8 rotate-45 rounded bg-[#10b981]" />
        <span className="absolute left-4 top-1 h-5 w-8 rotate-45 rounded bg-[#22d3ee]" />
      </div>
      <div>
        <p className={compact ? "text-xl font-black tracking-normal text-slate-950" : "text-3xl font-black tracking-normal text-slate-950"}>
          408 错题训练系统
        </p>
        {!compact ? (
          <p className="mt-1 text-sm font-black text-slate-400">计算机考研错题复盘平台</p>
        ) : null}
      </div>
    </div>
  );
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
      className={`rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.055)] ${className}`}
    >
      {children}
    </section>
  );
}

function HomeContributionHeatmap({ activity }: { activity: Record<string, number> }) {
  const today = todayIsoDate();
  const days = Array.from({ length: 90 }, (_, index) => addDays(today, index - 89));
  const reviewActivityTotal = days.reduce((total, day) => total + (activity[day] ?? 0), 0);
  const activeReviewDays = days.filter((day) => (activity[day] ?? 0) > 0).length;
  const todayCount = activity[today] ?? 0;

  return (
    <div>
      <div className="grid grid-flow-col grid-rows-6 gap-1">
        {days.map((day, index) => {
          const count = activity[day] ?? 0;
          const tone =
            count >= 4
              ? "bg-emerald-600"
              : count >= 2
                ? "bg-emerald-400"
                : count === 1
                  ? "bg-emerald-100"
                  : index % 9 === 0
                    ? "bg-slate-100"
                    : "bg-slate-50";

          return <span key={day} className={`h-3 w-3 rounded ${tone}`} title={`${day}: ${count}`} />;
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1 text-xs font-black text-slate-400">
        <span>少</span>
        <span className="h-3 w-3 rounded bg-slate-100" />
        <span className="h-3 w-3 rounded bg-emerald-100" />
        <span className="h-3 w-3 rounded bg-emerald-400" />
        <span className="h-3 w-3 rounded bg-emerald-600" />
        <span>多</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 px-2 py-3">
          <p className="text-lg font-black text-slate-950">{reviewActivityTotal}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">90天内完成</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-3">
          <p className="text-lg font-black text-slate-950">{activeReviewDays}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">活跃天数</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-3">
          <p className="text-lg font-black text-emerald-700">{todayCount}</p>
          <p className="mt-1 text-[11px] font-bold text-emerald-700">今日完成</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/review/today"
          className="rounded-lg bg-[#10b981] px-3 py-3 text-center text-sm font-black text-white"
        >
          今日复习
        </Link>
        <Link
          href="/practice"
          className="rounded-lg bg-white px-3 py-3 text-center text-sm font-black text-slate-700 ring-1 ring-slate-100"
        >
          专项练习
        </Link>
      </div>
    </div>
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
        <Link key={question.id} href={`/questions/${question.id}`} className="block rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-sm font-black text-slate-950">{questionTitle(question)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {question.subject} / {question.chapter ?? "未分类"}
          </p>
        </Link>
      ))}
    </div>
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

function HomeDesktopLayout({ stats, message }: { stats: HomeStats; message: string }) {
  return (
    <div data-testid="home-desktop-dashboard" className="hidden min-h-screen bg-[#f7f9fb] text-slate-950 lg:block">
      <nav aria-label="桌面首页导航" className="border-b border-slate-100 bg-white px-8 py-5">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8">
          <HomeExamLogo />
          <div className="flex items-center gap-12 text-base font-bold text-slate-500">
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
          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100">光</span>
            <span className="text-slate-700">学习档案</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-6 py-4">
        <section className="grid gap-4 lg:grid-cols-4">
          <HomePanel className="flex min-h-36 items-center gap-5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-700">档</div>
            <div>
              <p className="text-sm font-black text-slate-500">当前题库</p>
              <p className="mt-2 text-3xl font-black tracking-normal text-slate-900">408 错题库</p>
            </div>
          </HomePanel>
          <HomePanel className="flex min-h-36 items-center gap-5">
            <div className="text-3xl text-slate-600">□</div>
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
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-2xl font-black text-emerald-600">中</div>
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

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_386px]">
          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_0.9fr_0.9fr]">
              <HomePanel>
                <h2 className="text-lg font-black text-slate-900">做题贡献（最近90天）</h2>
                <div className="mt-8 grid place-items-center">
                  <HomeContributionHeatmap activity={stats.reviewActivity} />
                </div>
              </HomePanel>
              <HomePanel>
                <h2 className="text-lg font-black text-slate-900">公告栏</h2>
                <div className="mt-5 space-y-5 text-sm text-slate-600">
                  <p><span className="rounded bg-blue-50 px-2 py-1 text-blue-600">系统</span> 导入错题后会自动进入待整理题库 <span className="ml-4 rounded bg-red-400 px-2 py-1 text-white">new</span></p>
                  <p><span className="rounded bg-blue-50 px-2 py-1 text-blue-600">提示</span> 建议优先处理需要核对的题卡 <span className="ml-4 rounded bg-red-400 px-2 py-1 text-white">new</span></p>
                </div>
              </HomePanel>
              <HomePanel>
                <h2 className="text-lg font-black text-slate-900">最近错题</h2>
                <p className="mt-1 text-xs font-bold text-slate-400">今日提分焦点会优先展示 3 道最该做错题。</p>
                <div className="mt-4">
                  <RecentQuestions focus={stats.focus} />
                </div>
              </HomePanel>
            </div>

            <HomeSubjectProgress subjects={stats.subjects} />
            <WeaknessPanel focus={stats.focus} weakQuestionCount={stats.weakQuestionCount} />
          </div>

          <aside className="grid content-start gap-4">
            <HomePanel>
              <h2 className="text-lg font-black text-slate-900">功能区</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {featureLinks.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-4 text-center text-sm font-black ${
                      index < 2 ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-700 ring-1 ring-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </HomePanel>

            <HomePanel>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">我的收藏夹</h2>
                <Link href="/questions?scope=weak" className="text-sm font-bold text-slate-500">查看</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-100 p-4 text-blue-700">
                  <p className="text-2xl font-black">{stats.weakQuestionCount}题</p>
                  <p className="mt-3 text-base font-black">不熟题本</p>
                </div>
                <div className="rounded-lg bg-emerald-100 p-4 text-emerald-800">
                  <p className="text-2xl font-black">{stats.inboxQuestionCount}题</p>
                  <p className="mt-3 text-base font-black">待整理</p>
                </div>
              </div>
            </HomePanel>

            <HomePanel>
              <p className="text-lg font-black text-slate-900">本地学习档案</p>
              <p className="mt-1 text-sm font-bold text-slate-500">只展示当前错题资产，不接入外部社区身份。</p>
            </HomePanel>
          </aside>
        </section>
      </main>
    </div>
  );
}

function HomeMobileLayout({ stats, message }: { stats: HomeStats; message: string }) {
  return (
    <div data-testid="home-mobile-dashboard" className="min-h-screen bg-[#f7f9fb] px-4 pb-28 pt-4 text-slate-950 lg:hidden">
      <header className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
        <div className="flex items-center justify-between gap-3">
          <HomeExamLogo compact />
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500">光</span>
        </div>
        <div className="mt-5 rounded-[18px] bg-emerald-50 p-4">
          <p className="text-xs font-black text-[#10b981]">首页面板</p>
          <h1 className="mt-2 text-2xl font-black tracking-normal text-slate-950">数学错题资产管理</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">管理长期错题资产，分析薄弱点，并回答：我现在该做什么。</p>
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
          <span>进入导入诊断</span>
          <span>&gt;</span>
        </Link>
      </section>

      <section className="mt-5">
        <div className="mb-3">
          <h2 className="text-base font-black text-slate-950">核心模块</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">错题本、导入错题、四科入口和最近错题优先。</p>
        </div>
        <div className="grid gap-3">
          {moduleLinks.map((link) => (
            <Link key={link.href} href={link.href} className="flex min-h-16 items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
              <span className="min-w-0">
                <span className="block text-base font-black text-slate-950">{link.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{link.description}</span>
              </span>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-sm font-black text-[#10b981]">&gt;</span>
            </Link>
          ))}
        </div>
      </section>

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
        <WeaknessPanel focus={stats.focus} weakQuestionCount={stats.weakQuestionCount} />
      </div>
    </div>
  );
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
      const activityStart = `${addDays(currentDay, -89)}T00:00:00.000Z`;
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
          .gte("completed_at", activityStart),
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
          subjects: buildSubjectProgress(questions),
          reviewActivity: buildReviewActivity(reviews),
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

  return (
    <>
      <HomeDesktopLayout stats={stats} message={message} />
      <HomeMobileLayout stats={stats} message={message} />
    </>
  );
}
