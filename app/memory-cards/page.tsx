"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnswerPanel } from "@/components/mobile/AnswerPanel";
import { MathText } from "@/components/mobile/MathText";
import { LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import {
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";

type CardFilter = "all" | "weak" | "unverified";

const filterLabels: Record<CardFilter, string> = {
  all: "全部卡片",
  weak: "不熟题",
  unverified: "待核对",
};

function hasAnswer(question: QuestionWithImage) {
  return Boolean(question.standard_answer?.trim() || question.answer_explanation?.trim());
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

function cardTitle(question: QuestionWithImage) {
  return question.knowledge_point?.trim() || question.chapter?.trim() || "待整理题卡";
}

function sortMemoryCards(cards: QuestionWithImage[]) {
  return [...cards].sort((a, b) => {
    const priorityA = a.review_priority === "high" ? 2 : a.review_priority === "medium" ? 1 : 0;
    const priorityB = b.review_priority === "high" ? 2 : b.review_priority === "medium" ? 1 : 0;

    return (
      priorityB - priorityA ||
      Number(isWeakQuestion(b)) - Number(isWeakQuestion(a)) ||
      String(b.created_at).localeCompare(String(a.created_at))
    );
  });
}

export default function MemoryCardsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看记忆卡片。");
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [filter, setFilter] = useState<CardFilter>("all");
  const [revealedCardIds, setRevealedCardIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    fetchCurrentUserQuestions(supabase)
      .then((items) => {
        if (isActive) {
          setQuestions(items);
          setMessage(items.length === 0 ? "还没有可生成记忆卡片的题卡。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "记忆卡片读取失败。");
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

  const answerCards = useMemo(() => sortMemoryCards(questions.filter(hasAnswer)), [questions]);
  const weakCount = useMemo(() => answerCards.filter(isWeakQuestion).length, [answerCards]);
  const unverifiedCount = useMemo(
    () =>
      answerCards.filter(
        (question) =>
          question.answer_status === "ai_unverified" ||
          question.answer_status === "needs_fix" ||
          question.needs_manual_check,
      ).length,
    [answerCards],
  );
  const visibleCards = useMemo(
    () =>
      answerCards.filter((question) => {
        if (filter === "weak") return isWeakQuestion(question);
        if (filter === "unverified") {
          return (
            question.answer_status === "ai_unverified" ||
            question.answer_status === "needs_fix" ||
            question.needs_manual_check
          );
        }
        return true;
      }),
    [answerCards, filter],
  );

  function toggleReveal(questionId: string) {
    setRevealedCardIds((current) => ({ ...current, [questionId]: !current[questionId] }));
  }

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="记忆卡片"
        subtitle="像背单词一样先回忆题干、卡点和答案，再点开解析核对。数据直接来自你的错题库。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="可记忆" value={answerCards.length} helper="有答案题卡" />
          <SprintStatCard label="不熟题" value={weakCount} helper="优先复现" tone="amber" />
          <SprintStatCard label="待核对" value={unverifiedCount} helper="先看解析" tone="cyan" />
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
          <LoadingState label="正在读取记忆卡片..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader title="卡片范围" subtitle="先筛出要背的一组，再逐张查看解析。" />
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(filterLabels) as CardFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-11 rounded-lg px-3 text-sm font-black ${
                filter === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-100"
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <div className="grid gap-3">
          {visibleCards.map((question) => {
            const revealed = Boolean(revealedCardIds[question.id]);

            return (
              <StudyCard key={question.id} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StudyBadge tone="green">{question.subject}</StudyBadge>
                  <StudyBadge tone={isWeakQuestion(question) ? "amber" : "slate"}>
                    {isWeakQuestion(question) ? "优先记忆" : "普通卡片"}
                  </StudyBadge>
                  {question.answer_status === "ai_unverified" ? (
                    <StudyBadge tone="amber">待核对</StudyBadge>
                  ) : null}
                </div>

                <div>
                  <p className="text-base font-black text-slate-950">{cardTitle(question)}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {question.chapter ?? "未分类"} / {question.difficulty ?? "未标难度"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 text-xs font-black text-slate-500">先回忆题干</p>
                  <MathText text={question.question_text} fallback="这张卡片暂时没有题干。" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleReveal(question.id)}
                    className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
                  >
                    {revealed ? "收起解析" : "查看解析"}
                  </button>
                  <Link
                    href={`/questions/${question.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
                  >
                    题目详情
                  </Link>
                </div>

                {revealed ? (
                  <AnswerPanel
                    standard_answer={question.standard_answer}
                    answer_explanation={question.answer_explanation}
                    key_steps={question.key_steps}
                    one_sentence_tip={question.one_sentence_tip}
                    answer_status={question.answer_status}
                    answer_source={question.answer_source}
                  />
                ) : null}
              </StudyCard>
            );
          })}

          {!isLoading && visibleCards.length === 0 ? (
            <StudyCard>
              <p className="text-sm font-black text-slate-950">这一组还没有卡片</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                先导入带 standard_answer 和 answer_explanation 的错题卡，或回到错题库补齐答案解析。
              </p>
              <Link
                href="/import"
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
              >
                去导入
              </Link>
            </StudyCard>
          ) : null}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
