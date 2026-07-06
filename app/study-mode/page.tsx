"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import {
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import { createClient } from "@/lib/supabase/client";

type StudyMode = {
  key: string;
  title: string;
  description: string;
  href: string;
  count: number;
  helper: string;
  badge: string;
  tone: "green" | "cyan" | "amber" | "slate";
};

const examSubjects = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];
const algorithmKeywords = [
  "排序",
  "查找",
  "二分",
  "折半",
  "树",
  "图",
  "调度",
  "页面置换",
  "最短路径",
  "生成树",
  "死锁",
];

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function isWeakQuestion(question: QuestionWithImage) {
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

function needsOrganizing(question: QuestionWithImage) {
  return (
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    question.answer_status === "ai_unverified" ||
    !hasText(question.question_text) ||
    !hasText(question.standard_answer)
  );
}

function hasAnswerContent(question: QuestionWithImage) {
  return (
    hasText(question.standard_answer) ||
    hasText(question.answer_explanation) ||
    hasText(question.solution_summary) ||
    (question.key_steps?.length ?? 0) > 0
  );
}

function isExamChoice(question: QuestionWithImage) {
  return examSubjects.includes(question.subject) && (question.choices?.length ?? 0) > 0;
}

function isAlgorithmQuestion(question: QuestionWithImage) {
  const source = [
    question.subject,
    question.chapter,
    question.knowledge_point,
    question.question_text,
    question.solution_summary,
    question.answer_explanation,
    ...(question.mistake_types ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  return algorithmKeywords.some((keyword) => source.includes(keyword));
}

function buildStudyModes(questions: QuestionWithImage[]): StudyMode[] {
  const weakQuestions = questions.filter(isWeakQuestion);
  const inboxQuestions = questions.filter(needsOrganizing);
  const memoryCards = questions.filter(hasAnswerContent);
  const examChoices = questions.filter(isExamChoice);
  const algorithms = questions.filter(isAlgorithmQuestion);

  return [
    {
      key: "quick",
      title: "快速刷题",
      description: "进入 408 选择题轮次，提交答案后先停在答案解析界面，再手动下一题。",
      href: "/practice?mode=exam408-choice",
      count: examChoices.length,
      helper: "408 选择题",
      badge: "答案解析",
      tone: "green",
    },
    {
      key: "memory",
      title: "记忆卡片",
      description: "先回忆题干和知识点，再翻开答案解析，适合睡前或碎片时间复盘。",
      href: "/memory-cards",
      count: memoryCards.length,
      helper: "可回忆题卡",
      badge: "回忆模式",
      tone: "cyan",
    },
    {
      key: "collections",
      title: "收藏夹",
      description: "把不熟题、待整理、已掌握和最近错题集中成可复用的题本入口。",
      href: "/collections",
      count: weakQuestions.length + inboxQuestions.length,
      helper: "需处理题卡",
      badge: "题本分组",
      tone: "amber",
    },
    {
      key: "algorithms",
      title: "算法专题",
      description: "按排序、查找、树与图、操作系统算法聚合已有 408 算法错题。",
      href: "/algorithms",
      count: algorithms.length,
      helper: "命中算法题",
      badge: "步骤动画演示",
      tone: "cyan",
    },
    {
      key: "inbox",
      title: "错题整理",
      description: "集中处理缺题干、缺答案、AI 未核对或需要人工检查的题卡。",
      href: "/questions?scope=inbox",
      count: inboxQuestions.length,
      helper: "待整理",
      badge: "数据清理",
      tone: "slate",
    },
    {
      key: "complete",
      title: "学习完成",
      description: "做完一轮后查看完成总结、分组完成度和下一轮入口。",
      href: "/study-complete",
      count: Math.max(0, questions.length - weakQuestions.length),
      helper: "稳定题卡",
      badge: "完成回看",
      tone: "green",
    },
  ];
}

function ModeCard({ mode }: { mode: StudyMode }) {
  return (
    <Link href={mode.href} className="block rounded-lg bg-white p-4 ring-1 ring-slate-100 active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StudyBadge tone={mode.tone}>{mode.badge}</StudyBadge>
            <StudyBadge tone="slate">{mode.helper}</StudyBadge>
          </div>
          <p className="mt-3 text-base font-black text-slate-950">{mode.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{mode.description}</p>
        </div>
        <div className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-right">
          <p className="text-lg font-black text-blue-700">{mode.count}</p>
          <p className="text-xs text-slate-500">题</p>
        </div>
      </div>
    </Link>
  );
}

export default function StudyModePage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看学习模式。");
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    fetchCurrentUserQuestions(supabase)
      .then((items) => {
        if (isActive) {
          setQuestions(items);
          setMessage(items.length === 0 ? "还没有可分配学习模式的题卡，先导入错题后再开始。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "学习模式读取失败。");
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

  const modes = useMemo(() => buildStudyModes(questions), [questions]);
  const examChoiceCount = useMemo(() => questions.filter(isExamChoice).length, [questions]);
  const memoryCardCount = useMemo(() => questions.filter(hasAnswerContent).length, [questions]);
  const weakCount = useMemo(() => questions.filter(isWeakQuestion).length, [questions]);

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="学习模式"
        subtitle="参考 408os 的学习模式入口，把当前题库分到刷题、记忆、收藏、算法和完成回看中；不新建数据表，只复用已有题卡。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="刷题" value={examChoiceCount} helper="408 选择题" tone="green" />
          <SprintStatCard label="记忆" value={memoryCardCount} helper="有解析题卡" tone="cyan" />
          <SprintStatCard label="薄弱" value={weakCount} helper="优先处理" tone="amber" />
        </div>
      </MobileSection>

      <MobileSection>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/practice?mode=exam408-choice"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
          >
            快速刷题
          </Link>
          <Link
            href="/memory-cards"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
          >
            记忆卡片
          </Link>
        </div>
      </MobileSection>

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取学习模式..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader title="模式列表" subtitle="每张卡片都是现有页面入口，不做空按钮。" />
        <div className="grid gap-3">
          {modes.map((mode) => (
            <ModeCard key={mode.key} mode={mode} />
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <StudyCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <StudyBadge tone="green">学习完成</StudyBadge>
            <StudyBadge tone="cyan">收藏夹</StudyBadge>
            <StudyBadge tone="amber">算法专题</StudyBadge>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            本页只负责分发学习路径。刷题提交后的答案解析停留逻辑仍在 /practice 内完成；学完一轮后进入完成页看总结。
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/collections"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
            >
              收藏夹
            </Link>
            <Link
              href="/study-complete"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
            >
              学习完成
            </Link>
          </div>
        </StudyCard>
      </MobileSection>
    </MobilePageShell>
  );
}
