"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import {
  ProgressBar,
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import { createClient } from "@/lib/supabase/client";

type GroupComplete = {
  label: string;
  total: number;
  done: number;
  weak: number;
  rate: number;
};

const examSubjects = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];

function isDone(question: QuestionWithImage) {
  return question.mastery_status === "完全掌握" || question.review_priority === "low";
}

function isWeak(question: QuestionWithImage) {
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
    !question.question_text?.trim() ||
    !question.standard_answer?.trim()
  );
}

function buildGroupCompletion(questions: QuestionWithImage[]): GroupComplete[] {
  return examSubjects.map((subject) => {
    const items = questions.filter((question) => question.subject === subject);
    const done = items.filter(isDone).length;
    const weak = items.filter(isWeak).length;
    const rate = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

    return {
      label: subject,
      total: items.length,
      done,
      weak,
      rate,
    };
  });
}

function formatToday() {
  return new Date().toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

export default function StudyCompletePage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看学习完成页。");
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
          setMessage(items.length === 0 ? "还没有可生成完成总结的题卡，先导入错题或完成一轮刷题。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "学习完成页读取失败。");
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

  const doneCount = useMemo(() => questions.filter(isDone).length, [questions]);
  const weakCount = useMemo(() => questions.filter(isWeak).length, [questions]);
  const inboxCount = useMemo(() => questions.filter(needsOrganizing).length, [questions]);
  const completionRate = questions.length > 0 ? Math.round((doneCount / questions.length) * 100) : 0;
  const groupCompletion = useMemo(() => buildGroupCompletion(questions), [questions]);

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="学习完成"
        subtitle="参考 408os 的学习完成和分组完成页，用当前题库状态生成本轮总结；不伪造完成记录，也不新建轮次表。"
      />

      <MobileSection>
        <StudyCard className="space-y-4 bg-blue-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-700">本轮总结 · {formatToday()}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{completionRate}%</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                已掌握 {doneCount} 题，仍需处理 {weakCount} 题。
              </p>
            </div>
            <StudyBadge tone="green">学习完成</StudyBadge>
          </div>
          <ProgressBar value={completionRate} label="完成进度" helper={`${doneCount}/${questions.length || 0}`} />
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="已掌握" value={doneCount} helper="稳定题卡" tone="green" />
          <SprintStatCard label="薄弱" value={weakCount} helper="下一轮优先" tone="amber" />
          <SprintStatCard label="待整理" value={inboxCount} helper="先补数据" tone="cyan" />
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
          <LoadingState label="正在生成学习完成总结..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader title="分组完成" subtitle="按 408 科目查看完成度，下一轮优先补薄弱科目。" />
        <div className="grid gap-3">
          {groupCompletion.map((group) => (
            <StudyCard key={group.label} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{group.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    已掌握 {group.done} / 总题量 {group.total}
                  </p>
                </div>
                <StudyBadge tone={group.weak > 0 ? "amber" : "green"}>
                  {group.weak > 0 ? `薄弱 ${group.weak}` : "稳定"}
                </StudyBadge>
              </div>
              <ProgressBar value={group.rate} label="完成率" helper={`${group.rate}%`} />
            </StudyCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="下一轮" subtitle="完成页不替你自动跳题，只给出下一步真实入口。" />
        <div className="grid gap-3">
          <Link
            href="/practice?mode=exam408-choice"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
          >
            继续刷题
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/memory-cards"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
            >
              记忆卡片
            </Link>
            <Link
              href="/collections"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
            >
              收藏夹
            </Link>
            <Link
              href="/questions?scope=weak"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
            >
              薄弱题本
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
            >
              学习档案
            </Link>
          </div>
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
