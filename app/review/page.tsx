"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
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

    const completedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("reviews")
      .update({
        completed_at: completedAt,
        review_result: result,
      })
      .eq("id", review.id);

    if (updateError) {
      setMessage(`复习记录写入失败：${updateError.message}`);
      return;
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("reviews")
      .select("scheduled_date")
      .eq("question_id", review.question_id);

    if (existingError) {
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

    setCompleted((current) => ({ ...current, [review.id]: result }));
    setReviews((current) => current.filter((item) => item.id !== review.id));
    setMessage("复习结果已写入，并已按规则调整后续复习计划。");
  }

  return (
    <div>
      <PageHeader
        title="今日复习"
        subtitle="读取今天及以前未完成的 reviews，逾期任务优先补完。"
      />

      <section className="px-5 pt-5">
        <div className="rounded-lg bg-blue-600 p-4 text-white">
          <p className="text-sm text-blue-100">待复习任务</p>
          <p className="mt-1 text-3xl font-bold">
            {Math.max(reviews.length - Object.keys(completed).length, 0)}
          </p>
          <p className="mt-2 text-xs text-blue-100">
            still_wrong / wrong_again 会重新安排后续复习。
          </p>
        </div>
      </section>

      {isLoading ? (
        <p className="px-5 pt-5 text-sm text-slate-500">正在读取今日复习...</p>
      ) : null}

      {message ? (
        <section className="px-5 pt-5">
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </section>
      ) : null}

      <section className="space-y-4 px-5 pt-5">
        {reviews.map((review) => {
          const result = completed[review.id];

          return (
            <article
              key={review.id}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
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
                    "原题缩略图"
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={review.questions.subject} tone="blue" />
                    <StatusPill
                      label={isOverdue(review.scheduled_date) ? "已逾期" : "今日到期"}
                      tone={isOverdue(review.scheduled_date) ? "red" : "amber"}
                    />
                  </div>
                  <h2 className="mt-2 font-semibold text-slate-950">
                    {review.questions.knowledge_point ?? "待识别知识点"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {review.questions.one_sentence_tip ?? "暂无一句话提醒"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                计划日期：{review.scheduled_date}；错因：
                {review.questions.mistake_types?.join("、") || "待分析"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(Object.keys(resultLabels) as ReviewResult[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleReview(review, key)}
                    className={`min-h-12 rounded-lg px-3 text-sm font-semibold ${
                      result === key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {resultLabels[key]}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
