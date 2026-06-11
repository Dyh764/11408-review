"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnswerPanel } from "@/components/mobile/AnswerPanel";
import { ChoiceList } from "@/components/mobile/ChoiceList";
import { EmptyState, ImagePlaceholder, LoadingState, MobileCard, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { updateKnowledgeStatsForQuestionId } from "@/lib/knowledge-stats";
import { getQuestionStemAndChoices } from "@/lib/questions/extract-choices";
import { areChoiceAnswersEqual, parseAnswerChoiceLabels } from "@/lib/questions/answer-choice";
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

export default function ReviewPage() {
  const [reviews, setReviews] = useState<DueReview[]>([]);
  const [completed, setCompleted] = useState<Record<string, ReviewResult>>({});
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
    setCompleted((current) => ({ ...current, [review.id]: result }));
    setReviews(nextReviews);
    setLastCompletedReview({ result, remainingCount: nextReviews.length });
    setProcessingReviewId("");
    setMessage("复习结果已写入，并已按规则调整后续复习计划。");
  }

  const overdueCount = reviews.filter((review) => isOverdue(review.scheduled_date)).length;
  const todayCount = reviews.length - overdueCount;

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

  function handleSkipReview(review: DueReview) {
    const nextReviews = reviews.filter((item) => item.id !== review.id);
    setReviews(nextReviews);
    setMessage(
      nextReviews.length > 0
        ? "已跳过本题，不记录本次结果。"
        : "已跳过本题，不记录本次结果。暂无更多题。",
    );
    setLastCompletedReview(null);
    setRevealedAnswers((current) => {
      const next = { ...current };
      delete next[review.id];
      return next;
    });
    setSelectedChoices((current) => {
      const next = { ...current };
      delete next[review.id];
      return next;
    });
    setSubmittedChoices((current) => {
      const next = { ...current };
      delete next[review.id];
      return next;
    });
    setDraftAnswers((current) => {
      const next = { ...current };
      delete next[review.id];
      return next;
    });
  }

  function handleNextReview() {
    setLastCompletedReview(null);
    setMessage(reviews.length > 0 ? "" : "今日复习完成，暂无更多题。");
  }

  return (
    <MobilePageShell>
      <PageHeader
        title="今日复习"
        subtitle="先看题，做完后再展开答案，然后记录这次复习结果。"
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

      {lastCompletedReview ? (
        <MobileSection>
          <div className="rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
            <p className="font-semibold">
              已记录“{resultLabels[lastCompletedReview.result]}”。
              {lastCompletedReview.remainingCount > 0 ? "可以继续下一题。" : "今日复习完成。"}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleNextReview}
                className="min-h-12 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
              >
                下一题
              </button>
              <Link
                href="/questions"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100"
              >
                返回错题库
              </Link>
            </div>
          </div>
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
          const hasAnswer = Boolean(review.questions.standard_answer?.trim());
          const isAnswerRevealed = Boolean(revealedAnswers[review.id]);
          const questionDisplay = getQuestionStemAndChoices(
            review.questions.question_text,
            review.questions.choices,
          );
          const answerChoices = parseAnswerChoiceLabels(review.questions.standard_answer);
          const isChoiceQuestion = questionDisplay.choices.length > 0;
          const selected = selectedChoices[review.id] ?? [];
          const isChoiceSubmitted = Boolean(submittedChoices[review.id]);
          const choiceIsCorrect =
            answerChoices.labels.length > 0 &&
            areChoiceAnswersEqual(selected, answerChoices.labels);
          const canRecordReview = hasAnswer
            ? isChoiceQuestion
              ? isChoiceSubmitted && isAnswerRevealed
              : !isChoiceQuestion && isAnswerRevealed
            : true;

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
                        question_text={questionDisplay.questionText}
                        mastery_status={review.questions.mastery_status}
                        question_text_status={review.questions.question_text_status}
                        source={review.questions.source}
                        compact
                      />
                    </div>
                  ) : null}
                  {questionDisplay.choices.length > 0 ? (
                    <div className="mt-3">
                      <ChoiceList
                        choices={questionDisplay.choices}
                        compact
                        mode={isChoiceSubmitted ? "reviewed" : "answering"}
                        selectedLabels={selected}
                        correctLabels={answerChoices.labels}
                        revealAnswer={isAnswerRevealed}
                        disabled={isAnswerRevealed}
                        onToggleChoice={(label) =>
                          toggleChoice(review.id, label, answerChoices.isMultiple)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 break-words text-xs leading-5 text-slate-500">
                计划 {review.scheduled_date}；章节 {review.questions.chapter ?? "待识别"}；错因 {review.questions.mistake_types?.join("、") || "待分析"}
              </p>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleSkipReview(review)}
                  disabled={Boolean(processingReviewId)}
                  className="min-h-10 rounded-lg bg-white px-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 disabled:text-slate-400"
                >
                  跳过本题
                </button>
              </div>

              {!isChoiceQuestion ? (
                <div className="mt-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">
                      写下你的答案或思路（仅本次复习记录，可不填）
                    </span>
                    <textarea
                      value={draftAnswers[review.id] ?? ""}
                      onChange={(event) =>
                        setDraftAnswers((current) => ({
                          ...current,
                          [review.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                    />
                  </label>
                </div>
              ) : null}

              {hasAnswer ? (
                <div className="mt-4">
                  {isChoiceQuestion && !isAnswerRevealed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedChoices((current) => ({ ...current, [review.id]: true }));
                        setRevealedAnswers((current) => ({ ...current, [review.id]: true }));
                      }}
                      disabled={selected.length === 0 && answerChoices.labels.length > 0}
                      className="min-h-12 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      提交答案
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedAnswers((current) => ({ ...current, [review.id]: true }))
                      }
                      disabled={isAnswerRevealed}
                      className="min-h-12 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {isAnswerRevealed ? "答案已显示" : "我做完了，查看答案"}
                    </button>
                  )}
                  {isAnswerRevealed ? (
                    <div className="mt-3 space-y-3">
                      {isChoiceQuestion && answerChoices.labels.length > 0 ? (
                        <p
                          className={`rounded-lg p-3 text-sm font-semibold ${
                            choiceIsCorrect
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                              : "bg-red-50 text-red-800 ring-1 ring-red-100"
                          }`}
                        >
                          {choiceIsCorrect ? "回答正确" : "回答错误"}；正确答案：{answerChoices.labels.join("、")}
                        </p>
                      ) : null}
                      {!isChoiceQuestion ? (
                        <div className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-800 ring-1 ring-blue-100">
                          <p>请对照标准答案自行判断，本工具暂不自动判定填空题对错。</p>
                          {draftAnswers[review.id]?.trim() ? (
                            <p className="mt-2 break-words">本次答案/思路：{draftAnswers[review.id]}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <AnswerPanel
                        standard_answer={review.questions.standard_answer}
                        answer_explanation={review.questions.answer_explanation}
                        key_steps={review.questions.key_steps}
                        answer_status={review.questions.answer_status}
                        answer_source={review.questions.answer_source}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
                  这道题还没有录入标准答案，可以先按自己的结果记录复习。
                </p>
              )}

              {canRecordReview ? (
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
              ) : null}
            </MobileCard>
          );
        })}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
