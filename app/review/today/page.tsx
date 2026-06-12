"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { MathText } from "@/components/mobile/MathText";
import { SectionHeader, SprintStatCard, StudyBadge, StudyCard, StudyPageHeader } from "@/components/study/study-ui";
import { todayIsoDate } from "@/lib/dates";
import { getQuestionStemAndChoices } from "@/lib/questions/extract-choices";
import { buildQuestionBadges } from "@/lib/questions/question-badges";
import { calculateReviewPriorityScore, explainReviewPriorityScore } from "@/lib/reviews/priority-score";
import { fetchDueReviews, type DueReview } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";

type DifficultyGroup = "困难" | "中等" | "基础 / 简单" | "未标注";

const groupOrder: DifficultyGroup[] = ["困难", "中等", "基础 / 简单", "未标注"];

function isOverdue(review: DueReview, today: string) {
  return review.scheduled_date < today;
}

function difficultyGroup(review: DueReview): DifficultyGroup {
  const difficulty = review.questions.difficulty?.trim() ?? "";

  if (difficulty === "困难" || difficulty === "较难" || difficulty === "压轴") {
    return "困难";
  }

  if (difficulty === "中等") {
    return "中等";
  }

  if (difficulty === "基础" || difficulty === "简单" || difficulty === "容易") {
    return "基础 / 简单";
  }

  return "未标注";
}

function needsAttention(review: DueReview) {
  return (
    review.questions.needs_manual_check ||
    review.questions.question_text_status === "needs_fix" ||
    review.questions.answer_status === "needs_fix"
  );
}

export default function TodayReviewListPage() {
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<DueReview[]>([]);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看今日复习题单。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const today = todayIsoDate();

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    fetchDueReviews(supabase)
      .then((items) => {
        if (!isActive) return;

        setReviews(
          [...items].sort(
            (a, b) =>
              calculateReviewPriorityScore(b, today).total -
                calculateReviewPriorityScore(a, today).total ||
              a.scheduled_date.localeCompare(b.scheduled_date),
          ),
        );
        setMessage(items.length === 0 ? "今天没有到期或逾期的复习任务。" : "");
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取今日复习题单失败。");
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
  }, [supabase, today]);

  const groups = useMemo(
    () =>
      groupOrder.map((group) => {
        const items = reviews.filter((review) => difficultyGroup(review) === group);

        return {
          group,
          items,
          overdueCount: items.filter((review) => isOverdue(review, today)).length,
          attentionCount: items.filter(needsAttention).length,
        };
      }),
    [reviews, today],
  );

  return (
    <MobilePageShell className="bg-[#f4f0ff]">
      <StudyPageHeader
        title="今日复习题单"
        subtitle="查看今天所有到期和逾期题，按难度分组，任选一道开始闪卡复习。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="今日题单" value={reviews.length} helper="到期/逾期" />
          <SprintStatCard label="已逾期" value={reviews.filter((review) => isOverdue(review, today)).length} helper="优先处理" tone="amber" />
          <SprintStatCard label="需处理" value={reviews.filter(needsAttention).length} helper="核对/修正" tone="purple" />
        </div>
      </MobileSection>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取今日题单..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-[#e4dcff]">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {!isLoading && reviews.length === 0 ? (
        <MobileSection>
          <EmptyState
            title="暂无今日题单"
            description="可以去错题库挑一题专项复盘，或导入今天整理好的错题卡。"
            action={{ href: "/questions", label: "去错题库" }}
          />
        </MobileSection>
      ) : null}

      {groups.map(({ group, items, overdueCount, attentionCount }) =>
        items.length > 0 ? (
          <MobileSection key={group}>
            <SectionHeader
              title={group}
              subtitle={`${items.length} 题 · 已逾期 ${overdueCount} · 需核对/修正 ${attentionCount}`}
              action={<StudyBadge tone={attentionCount > 0 ? "amber" : "green"}>{items.length} 题</StudyBadge>}
            />
            <div className="grid gap-3">
              {items.map((review) => {
                const questionDisplay = getQuestionStemAndChoices(
                  review.questions.question_text,
                  review.questions.choices,
                );
                const priority = explainReviewPriorityScore(review, today);
                const badges = buildQuestionBadges(review.questions, {
                  reviewStatus: isOverdue(review, today) ? "overdue" : "due_today",
                  questionKind: questionDisplay.choices.length > 0 ? "选择题" : "文字题",
                });

                return (
                  <StudyCard key={review.id}>
                    <div className="flex flex-wrap gap-1.5">
                      {badges.map((badge) => (
                        <StudyBadge key={badge.label} tone={badge.tone}>
                          {badge.label}
                        </StudyBadge>
                      ))}
                      <StudyBadge tone="purple">{priority.level}</StudyBadge>
                    </div>
                    <p className="mt-3 text-xs font-black text-[#5b2bd6]">
                      {review.questions.subject} / {review.questions.chapter ?? "待识别章节"}
                    </p>
                    <MathText
                      text={questionDisplay.questionText}
                      fallback="暂无题目摘要。"
                      compact
                      className="mt-2 line-clamp-4 text-base font-black leading-7 text-[#211536]"
                    />
                    <MathText
                      text={review.questions.knowledge_point}
                      fallback="待识别知识点"
                      compact
                      className="mt-2 text-xs font-semibold leading-5 text-slate-500"
                    />
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {priority.reasons.slice(0, 3).map((reason) => (
                        <span key={reason} className="rounded-full bg-[#f8f5ff] px-2.5 py-1 text-xs font-bold text-[#4f23b6] ring-1 ring-[#e4dcff]">
                          {reason}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/review?startQuestionId=${review.question_id}`}
                      className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#5b2bd6] px-4 text-sm font-black text-white"
                    >
                      开始这题
                    </Link>
                  </StudyCard>
                );
              })}
            </div>
          </MobileSection>
        ) : null,
      )}
    </MobilePageShell>
  );
}
