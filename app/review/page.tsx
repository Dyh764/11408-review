"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { MotivationBanner } from "@/components/study/MotivationBanner";
import { ReviewFlashcard } from "@/components/study/ReviewFlashcard";
import {
  ProgressBar,
  SecondaryStudyLink,
  SprintStatCard,
  StudyCard,
  StudyDashboardCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { updateKnowledgeStatsForQuestionId } from "@/lib/knowledge-stats";
import { getDailyMotivation } from "@/lib/motivation";
import { sortDueReviewsByPriority } from "@/lib/reviews/priority-score";
import { buildReviewAdjustmentPlan, shouldCancelPendingHighFrequencyReviews, shouldIncrementRepeatedWrongCount } from "@/lib/review-scheduler";
import { fetchDueReviews, todayIsoDate, type DueReview } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import type { ReviewResult } from "@/lib/types";

const resultLabels: Record<ReviewResult, string> = {
  still_wrong: "仍不会",
  improved: "有进步",
  mastered: "已掌握",
  wrong_again: "又错了",
};

function isOverdue(scheduledDate: string) {
  return scheduledDate < todayIsoDate();
}

function getFocusTopics(reviews: DueReview[]) {
  const topics = new Map<string, number>();

  for (const review of reviews) {
    const topic = review.questions.knowledge_point ?? review.questions.chapter ?? "待整理错题";
    topics.set(topic, (topics.get(topic) ?? 0) + 1);
  }

  return Array.from(topics, ([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => item.topic);
}

export default function ReviewPage() {
  const [reviews, setReviews] = useState<DueReview[]>([]);
  const [initialReviewCount, setInitialReviewCount] = useState(0);
  const [focusTopics, setFocusTopics] = useState<string[]>([]);
  const [completedCounts, setCompletedCounts] = useState<Record<ReviewResult, number>>({
    still_wrong: 0,
    improved: 0,
    mastered: 0,
    wrong_again: 0,
  });
  const [skippedCount, setSkippedCount] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string[]>>({});
  const [submittedChoices, setSubmittedChoices] = useState<Record<string, boolean>>({});
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [processingReviewId, setProcessingReviewId] = useState("");
  const [lastCompletedReview, setLastCompletedReview] = useState<{
    result: ReviewResult;
    remainingCount: number;
  } | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实今日复习。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    fetchDueReviews(supabase)
      .then((items) => {
        if (isActive) {
          const sorted = sortDueReviewsByPriority(items, todayIsoDate());
          setReviews(sorted);
          setInitialReviewCount(sorted.length);
          setFocusTopics(getFocusTopics(sorted));
          setMessage(sorted.length === 0 ? "今天没有到期或逾期的复习任务。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取今日复习失败。");
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

  async function handleReview(review: DueReview, result: ReviewResult) {
    if (!supabase) {
      setMessage("请配置 Supabase 环境变量后再记录复习结果。");
      return;
    }

    if (processingReviewId) {
      return;
    }

    setProcessingReviewId(review.id);
    const completedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("reviews")
      .update({
        completed_at: completedAt,
        review_result: result,
      })
      .eq("id", review.id)
      .is("completed_at", null);

    if (updateError) {
      setProcessingReviewId("");
      setMessage(`复习记录写入失败：${updateError.message}`);
      return;
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("reviews")
      .select("scheduled_date")
      .eq("question_id", review.question_id);

    if (existingError) {
      setProcessingReviewId("");
      setMessage(`已完成当前复习，但读取后续计划失败：${existingError.message}`);
      return;
    }

    if (shouldCancelPendingHighFrequencyReviews(result)) {
      const { error: cancelError } = await supabase
        .from("reviews")
        .delete()
        .eq("question_id", review.question_id)
        .is("completed_at", null)
        .gt("scheduled_date", todayIsoDate());

      if (cancelError) {
        setProcessingReviewId("");
        setMessage(`已完成当前复习，但取消后续高频任务失败：${cancelError.message}`);
        return;
      }
    }

    const adjustmentRows = buildReviewAdjustmentPlan({
      userId: review.user_id,
      questionId: review.question_id,
      reviewResult: result,
      existingScheduledDates: (existingRows ?? []).map((row) => String(row.scheduled_date)),
    });

    if (adjustmentRows.length > 0) {
      const { error: planError } = await supabase
        .from("reviews")
        .upsert(adjustmentRows, { onConflict: "question_id,scheduled_date" });

      if (planError) {
        setProcessingReviewId("");
        setMessage(`已完成当前复习，但后续计划调整失败：${planError.message}`);
        return;
      }
    }

    if (result === "mastered") {
      await supabase
        .from("questions")
        .update({ review_priority: "low", mastery_status: "完全掌握" })
        .eq("id", review.question_id)
        .is("deleted_at", null);
    } else if (shouldIncrementRepeatedWrongCount(result)) {
      await supabase
        .from("questions")
        .update({ review_priority: "high" })
        .eq("id", review.question_id)
        .is("deleted_at", null);
    }

    try {
      await updateKnowledgeStatsForQuestionId(supabase, review.question_id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `已完成复习，但薄弱点统计更新失败：${error.message}`
          : "已完成复习，但薄弱点统计更新失败。",
      );
      setProcessingReviewId("");
      return;
    }

    const nextReviews = reviews.filter((item) => item.id !== review.id);
    setCompletedCounts((current) => ({ ...current, [result]: current[result] + 1 }));
    setReviews(nextReviews);
    setLastCompletedReview({ result, remainingCount: nextReviews.length });
    setProcessingReviewId("");
    setMessage("复习结果已写入，并已按规则调整后续复习计划。");
  }

  const activeReview = reviews[0] ?? null;
  const overdueCount = reviews.filter((review) => isOverdue(review.scheduled_date)).length;
  const todayCount = reviews.length - overdueCount;
  const completedTotal = Object.values(completedCounts).reduce((sum, count) => sum + count, 0);
  const progress = initialReviewCount > 0
    ? Math.round(((completedTotal + skippedCount) / initialReviewCount) * 100)
    : 0;

  function toggleChoice(reviewId: string, label: string, isMultiple: boolean) {
    setSelectedChoices((current) => {
      const selected = current[reviewId] ?? [];

      if (!isMultiple) {
        return { ...current, [reviewId]: selected.includes(label) ? [] : [label] };
      }

      return {
        ...current,
        [reviewId]: selected.includes(label)
          ? selected.filter((item) => item !== label)
          : [...selected, label],
      };
    });
  }

  function cleanupReviewDraft(reviewId: string) {
    setRevealedAnswers((current) => {
      const next = { ...current };
      delete next[reviewId];
      return next;
    });
    setSelectedChoices((current) => {
      const next = { ...current };
      delete next[reviewId];
      return next;
    });
    setSubmittedChoices((current) => {
      const next = { ...current };
      delete next[reviewId];
      return next;
    });
    setDraftAnswers((current) => {
      const next = { ...current };
      delete next[reviewId];
      return next;
    });
  }

  function handleSkipReview(review: DueReview) {
    const nextReviews = reviews.filter((item) => item.id !== review.id);
    setReviews(nextReviews);
    setSkippedCount((count) => count + 1);
    setMessage(
      nextReviews.length > 0
        ? "已跳过本题，不记录本次结果。"
        : "已跳过本题，不记录本次结果。暂无更多题。",
    );
    setLastCompletedReview(null);
    cleanupReviewDraft(review.id);
  }

  function handleNextReview() {
    setLastCompletedReview(null);
    setMessage(reviews.length > 0 ? "" : "今日复习完成，暂无更多题。");
  }

  function renderSummary() {
    return (
      <MobileSection>
        <StudyDashboardCard>
          <p className="text-sm font-bold text-white/75">本轮复习完成</p>
          <p className="mt-2 text-3xl font-black tracking-normal">今日完成 {completedTotal} 题</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">已掌握</p>
              <p className="mt-1 text-2xl font-black">{completedCounts.mastered}</p>
            </div>
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">又错了</p>
              <p className="mt-1 text-2xl font-black">{completedCounts.wrong_again}</p>
            </div>
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">跳过</p>
              <p className="mt-1 text-2xl font-black">{skippedCount}</p>
            </div>
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">有进步</p>
              <p className="mt-1 text-2xl font-black">{completedCounts.improved}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(focusTopics.length > 0 ? focusTopics : ["继续保持复盘节奏"]).map((topic) => (
              <span key={topic} className="rounded-full bg-white/14 px-3 py-1 text-xs font-black">
                {topic}
              </span>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-[#4f23b6]"
            >
              返回首页
            </Link>
            <Link
              href="/questions"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-[#4f23b6]"
            >
              去错题库
            </Link>
          </div>
        </StudyDashboardCard>
      </MobileSection>
    );
  }

  return (
    <MobilePageShell className="bg-[#f4f0ff]">
      <StudyPageHeader
        title="今日复习闪卡"
        subtitle="先处理最该复盘的题，一次只推进一道。先做题，再看答案，最后记录结果。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="待复习" value={reviews.length} helper="当前剩余" />
          <SprintStatCard label="逾期" value={overdueCount} helper="优先处理" tone="amber" />
          <SprintStatCard label="今日" value={todayCount} helper="到期任务" tone="purple" />
        </div>
      </MobileSection>

      <MobileSection>
        <StudyCard>
          <ProgressBar
            value={progress}
            label={initialReviewCount > 0 ? `第 ${Math.min(completedTotal + skippedCount + 1, initialReviewCount)} / ${initialReviewCount} 题` : "今日进度"}
            helper={`${progress}%`}
          />
        </StudyCard>
      </MobileSection>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取今日复习..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-[#e4dcff]">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {lastCompletedReview ? (
        <MobileSection>
          <StudyCard className="bg-emerald-50">
            <p className="text-sm font-black text-emerald-900">
              已记录“{resultLabels[lastCompletedReview.result]}”。
              {lastCompletedReview.remainingCount > 0 ? "可以继续下一题。" : "今日复习完成。"}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleNextReview}
                className="min-h-12 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white"
              >
                下一题
              </button>
              <SecondaryStudyLink href="/questions">返回错题库</SecondaryStudyLink>
            </div>
          </StudyCard>
        </MobileSection>
      ) : null}

      {!isLoading && !activeReview && initialReviewCount > 0 ? renderSummary() : null}

      {!isLoading && !activeReview && initialReviewCount === 0 ? (
        <MobileSection>
          <EmptyState
            title="今天的复习任务已清空"
            description="可以去错题库挑一题主动复盘，或导入今天整理好的 ChatGPT 错题卡。"
            action={{ href: "/import", label: "导入错题卡" }}
          />
        </MobileSection>
      ) : null}

      {activeReview && !lastCompletedReview ? (
        <ReviewFlashcard
          review={activeReview}
          selectedChoices={selectedChoices[activeReview.id] ?? []}
          submittedChoice={Boolean(submittedChoices[activeReview.id])}
          answerRevealed={Boolean(revealedAnswers[activeReview.id])}
          draftAnswer={draftAnswers[activeReview.id] ?? ""}
          processing={processingReviewId === activeReview.id}
          processingLocked={Boolean(processingReviewId)}
          onToggleChoice={toggleChoice}
          onSubmitChoice={() => {
            setSubmittedChoices((current) => ({ ...current, [activeReview.id]: true }));
            setRevealedAnswers((current) => ({ ...current, [activeReview.id]: true }));
          }}
          onRevealAnswer={() =>
            setRevealedAnswers((current) => ({ ...current, [activeReview.id]: true }))
          }
          onDraftAnswer={(value) =>
            setDraftAnswers((current) => ({ ...current, [activeReview.id]: value }))
          }
          onSkip={() => handleSkipReview(activeReview)}
          onReview={(result) => handleReview(activeReview, result)}
          today={todayIsoDate()}
        />
      ) : null}

      <MobileSection>
        <MotivationBanner text={getDailyMotivation()} />
      </MobileSection>
    </MobilePageShell>
  );
}
