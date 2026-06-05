"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, ImagePlaceholder, LoadingState, MobileCard, MobileSection } from "@/components/mobile/primitives";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { updateKnowledgeStatsForQuestionId } from "@/lib/knowledge-stats";
import { getQuestionSourceLabel } from "@/lib/questions/source-label";
import { buildReviewAdjustmentPlan, shouldCancelPendingHighFrequencyReviews, shouldIncrementRepeatedWrongCount } from "@/lib/review-scheduler";
import { fetchDueReviews, todayIsoDate, type DueReview } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import type { ReviewResult } from "@/lib/types";

const resultLabels: Record<ReviewResult, string> = {
  still_wrong: "仍不会",
  improved: "有进步",
  mastered: "已掌握",
  wrong_again: "复习后又错",
};

function isOverdue(scheduledDate: string) {
  return scheduledDate < todayIsoDate();
}

export default function ReviewPage() {
  const [reviews, setReviews] = useState<DueReview[]>([]);
  const [completed, setCompleted] = useState<Record<string, ReviewResult>>({});
  const [processingReviewId, setProcessingReviewId] = useState("");
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
          setReviews(items);
          setMessage(items.length === 0 ? "今天没有到期或逾期的复习任务。" : "");
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
        .eq("id", review.question_id);
    } else if (shouldIncrementRepeatedWrongCount(result)) {
      await supabase
        .from("questions")
        .update({ review_priority: "high" })
        .eq("id", review.question_id);
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

    setCompleted((current) => ({ ...current, [review.id]: result }));
    setReviews((current) => current.filter((item) => item.id !== review.id));
    setProcessingReviewId("");
    setMessage("复习结果已写入，并已按规则调整后续复习计划。");
  }

  const overdueCount = reviews.filter((review) => isOverdue(review.scheduled_date)).length;
  const todayCount = reviews.length - overdueCount;

  return (
    <div>
      <PageHeader
        title="今日复习"
        subtitle="读取今天及以前未完成的 reviews，逾期任务优先补完。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-blue-600 p-4 text-white">
            <p className="text-sm text-blue-100">待复习</p>
            <p className="mt-1 text-3xl font-bold">{reviews.length}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-red-700 ring-1 ring-red-100">
            <p className="text-sm">逾期</p>
            <p className="mt-1 text-3xl font-bold">{overdueCount}</p>
          </div>
          <div className="rounded-lg bg-white p-4 text-slate-700 ring-1 ring-slate-100">
            <p className="text-sm">今日</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">{todayCount}</p>
          </div>
        </div>
      </MobileSection>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取今日复习..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </MobileSection>
      ) : null}

      <MobileSection>
        <div className="space-y-4">
        {!isLoading && reviews.length === 0 ? (
          <EmptyState
            title="今天的复习任务已清空"
            description="可以去错题库挑一题主动复盘，或导入今天整理好的 ChatGPT 错题卡。"
            action={{ href: "/import", label: "导入错题卡" }}
          />
        ) : null}
        {reviews.map((review) => {
          const result = completed[review.id];
          const isProcessing = processingReviewId === review.id;

          return (
            <MobileCard key={review.id}>
              <div className="flex gap-3">
                <Link
                  href={`/questions/${review.question_id}`}
                  className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-xs text-slate-500"
                >
                  {review.signedImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.signedImageUrl}
                      alt="原题缩略图"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder label={review.questions.image_path ? "原题缩略图" : "文字错题卡"} />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={review.questions.subject} tone="blue" />
                    <StatusPill
                      label={getQuestionSourceLabel(review.questions)}
                      tone="blue"
                    />
                    <StatusPill
                      label={isOverdue(review.scheduled_date) ? "已逾期" : "今日到期"}
                      tone={isOverdue(review.scheduled_date) ? "red" : "amber"}
                    />
                  </div>
                  <h2 className="mt-2 break-words font-semibold text-slate-950">
                    {review.questions.knowledge_point ?? "待识别知识点"}
                  </h2>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                    {review.questions.one_sentence_tip ?? "暂无一句话提醒"}
                  </p>
                  {!review.questions.image_path ? (
                    <div className="mt-2">
                      <TextQuestionPreview
                        subject={review.questions.subject}
                        chapter={review.questions.chapter}
                        knowledge_point={review.questions.knowledge_point}
                        question_text={review.questions.question_text}
                        mastery_status={review.questions.mastery_status}
                        question_text_status={review.questions.question_text_status}
                        source={review.questions.source}
                        compact
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 break-words text-sm leading-6 text-slate-500">
                计划日期：{review.scheduled_date}；章节：
                {review.questions.chapter ?? "待识别"}；上次错因：
                {review.questions.mistake_types?.join("、") || "待分析"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(Object.keys(resultLabels) as ReviewResult[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleReview(review, key)}
                    disabled={isProcessing || Boolean(processingReviewId)}
                    className={`min-h-12 rounded-lg px-3 text-sm font-semibold ${
                      result === key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    } disabled:bg-slate-200 disabled:text-slate-400`}
                  >
                    {isProcessing ? "写入中..." : resultLabels[key]}
                  </button>
                ))}
              </div>
            </MobileCard>
          );
        })}
        </div>
      </MobileSection>
    </div>
  );
}
