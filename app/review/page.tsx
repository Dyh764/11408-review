"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnswerPanel } from "@/components/mobile/AnswerPanel";
import { ChoiceList } from "@/components/mobile/ChoiceList";
import { EmptyState, ImagePlaceholder, LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import {
  AttentionBadge,
  DifficultyBadge,
  MotivationBanner,
  PrimaryStudyLink,
  ProgressBar,
  SecondaryStudyLink,
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyDashboardCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { updateKnowledgeStatsForQuestionId } from "@/lib/knowledge-stats";
import { getDailyMotivation } from "@/lib/motivation";
import { areChoiceAnswersEqual, parseAnswerChoiceLabels } from "@/lib/questions/answer-choice";
import { getQuestionStemAndChoices } from "@/lib/questions/extract-choices";
import { calculateReviewPriorityScore, sortDueReviewsByPriority } from "@/lib/reviews/priority-score";
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
            <PrimaryStudyLink href="/" className="bg-white text-[#4f23b6] shadow-none">
              返回首页
            </PrimaryStudyLink>
            <PrimaryStudyLink href="/questions" className="bg-white text-[#4f23b6] shadow-none">
              去错题库
            </PrimaryStudyLink>
          </div>
        </StudyDashboardCard>
      </MobileSection>
    );
  }

  return (
    <MobilePageShell className="bg-[#f4f0ff]">
      <StudyPageHeader
        title="今日复习闪卡"
        subtitle="按系统综合优先级排序，一次只处理一道题。先做题，再看答案，最后记录结果。"
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
        />
      ) : null}

      <MobileSection>
        <MotivationBanner text={getDailyMotivation()} />
      </MobileSection>
    </MobilePageShell>
  );
}

function ReviewFlashcard({
  review,
  selectedChoices,
  submittedChoice,
  answerRevealed,
  draftAnswer,
  processing,
  processingLocked,
  onToggleChoice,
  onSubmitChoice,
  onRevealAnswer,
  onDraftAnswer,
  onSkip,
  onReview,
}: {
  review: DueReview;
  selectedChoices: string[];
  submittedChoice: boolean;
  answerRevealed: boolean;
  draftAnswer: string;
  processing: boolean;
  processingLocked: boolean;
  onToggleChoice: (reviewId: string, label: string, isMultiple: boolean) => void;
  onSubmitChoice: () => void;
  onRevealAnswer: () => void;
  onDraftAnswer: (value: string) => void;
  onSkip: () => void;
  onReview: (result: ReviewResult) => void;
}) {
  const hasAnswer = Boolean(review.questions.standard_answer?.trim());
  const questionDisplay = getQuestionStemAndChoices(
    review.questions.question_text,
    review.questions.choices,
  );
  const answerChoices = parseAnswerChoiceLabels(review.questions.standard_answer);
  const isChoiceQuestion = questionDisplay.choices.length > 0;
  const choiceIsCorrect =
    answerChoices.labels.length > 0 &&
    areChoiceAnswersEqual(selectedChoices, answerChoices.labels);
  const canRecordReview = hasAnswer
    ? isChoiceQuestion
      ? submittedChoice && answerRevealed
      : !isChoiceQuestion && answerRevealed
    : true;
  const priority = calculateReviewPriorityScore(review, todayIsoDate());

  return (
    <MobileSection>
      <SectionHeader
        title="当前题目卡片"
        subtitle="默认只看题目，答案隐藏到你主动查看。"
        action={<StudyBadge tone="purple">优先级 {Math.round(priority.total)}</StudyBadge>}
      />
      <StudyCard className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StudyBadge tone={isOverdue(review.scheduled_date) ? "red" : "amber"}>
            {isOverdue(review.scheduled_date) ? "已逾期" : "今日到期"}
          </StudyBadge>
          <DifficultyBadge difficulty={review.questions.difficulty} />
          <AttentionBadge
            needsFix={
              review.questions.question_text_status === "needs_fix" ||
              review.questions.answer_status === "needs_fix"
            }
            needsManualCheck={review.questions.needs_manual_check}
          />
        </div>

        <div className="rounded-lg bg-[#f8f5ff] p-4">
          <div className="flex gap-3">
            <Link
              href={`/questions/${review.question_id}`}
              className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-white text-xs text-slate-500 ring-1 ring-[#e4dcff]"
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
              <p className="text-xs font-black text-[#5b2bd6]">
                {review.questions.subject} / {review.questions.chapter ?? "待识别章节"}
              </p>
              <h2 className="mt-2 break-words text-lg font-black leading-7 text-[#211536]">
                {review.questions.knowledge_point ?? "待识别知识点"}
              </h2>
              <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                {review.questions.one_sentence_tip ?? "先独立完成，再展开答案核对。"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <TextQuestionPreview
              subject={review.questions.subject}
              chapter={review.questions.chapter}
              knowledge_point={review.questions.knowledge_point}
              question_text={questionDisplay.questionText}
              mastery_status={review.questions.mastery_status}
              question_text_status={review.questions.question_text_status}
              source={review.questions.source}
              compact
              hideMeta
              hideTitle
            />
          </div>
        </div>

        {questionDisplay.choices.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-black text-[#211536]">选择题选项</p>
            <ChoiceList
              choices={questionDisplay.choices}
              mode={submittedChoice ? "reviewed" : "answering"}
              selectedLabels={selectedChoices}
              correctLabels={answerChoices.labels}
              revealAnswer={answerRevealed}
              disabled={answerRevealed}
              onToggleChoice={(label) => onToggleChoice(review.id, label, answerChoices.isMultiple)}
            />
          </div>
        ) : (
          <label className="block">
            <span className="text-sm font-black text-[#211536]">
              非选择题答案核对区（可不填）
            </span>
            <textarea
              value={draftAnswer}
              onChange={(event) => onDraftAnswer(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-lg border border-[#d9cffd] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#5b2bd6]"
              placeholder="先写下你的答案或关键步骤，再查看标准答案。"
            />
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          {hasAnswer ? (
            isChoiceQuestion && !answerRevealed ? (
              <button
                type="button"
                onClick={onSubmitChoice}
                disabled={selectedChoices.length === 0 && answerChoices.labels.length > 0}
                className="min-h-12 rounded-lg bg-[#5b2bd6] px-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
              >
                提交答案
              </button>
            ) : (
              <button
                type="button"
                onClick={onRevealAnswer}
                disabled={answerRevealed}
                className="min-h-12 rounded-lg bg-[#5b2bd6] px-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
              >
                {answerRevealed ? "答案已显示" : "我做完了，查看答案"}
              </button>
            )
          ) : (
            <StudyBadge tone="amber">暂无标准答案，可直接记录结果</StudyBadge>
          )}
          <button
            type="button"
            onClick={onSkip}
            disabled={processingLocked}
            className="min-h-12 rounded-lg border border-[#d9cffd] bg-white px-4 text-sm font-black text-[#4f23b6] disabled:text-slate-400"
          >
            跳过本题
          </button>
        </div>

        {answerRevealed ? (
          <div className="space-y-3">
            {isChoiceQuestion && answerChoices.labels.length > 0 ? (
              <p
                className={`rounded-lg p-3 text-sm font-black ${
                  choiceIsCorrect
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                    : "bg-red-50 text-red-800 ring-1 ring-red-100"
                }`}
              >
                {choiceIsCorrect ? "回答正确" : "回答错误"}；正确答案：{answerChoices.labels.join("、")}
              </p>
            ) : null}
            {!isChoiceQuestion ? (
              <div className="rounded-lg bg-[#ede7ff] p-3 text-sm leading-6 text-[#4f23b6] ring-1 ring-[#d9cffd]">
                <p>请对照标准答案自行判断，本工具暂不自动判定非选择题对错。</p>
                {draftAnswer.trim() ? <p className="mt-2 break-words">本次答案/思路：{draftAnswer}</p> : null}
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

        {canRecordReview ? (
          <div>
            <p className="mb-2 text-sm font-black text-[#211536]">记录本题结果</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(resultLabels) as ReviewResult[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onReview(key)}
                  disabled={processing || processingLocked}
                  className="min-h-12 rounded-lg bg-[#ede7ff] px-3 text-sm font-black text-[#4f23b6] disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {processing ? "写入中..." : resultLabels[key]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </StudyCard>
    </MobileSection>
  );
}
