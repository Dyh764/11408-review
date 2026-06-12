"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { MotivationBanner } from "@/components/study/MotivationBanner";
import { ReviewFlashcard, type FlashcardReview } from "@/components/study/ReviewFlashcard";
import {
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyDashboardCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { updateKnowledgeStatsForQuestionId } from "@/lib/knowledge-stats";
import { getDailyMotivation } from "@/lib/motivation";
import {
  buildPracticeCatalog,
  filterPracticeQuestions,
  type PracticeFilter,
} from "@/lib/practice/practice-catalog";
import { buildReviewAdjustmentPlan, shouldIncrementRepeatedWrongCount } from "@/lib/review-scheduler";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import type { ReviewResult } from "@/lib/types";

function makePracticeReview(question: QuestionWithImage): FlashcardReview {
  const today = todayIsoDate();

  return {
    id: `practice-${question.id}`,
    user_id: question.user_id,
    question_id: question.id,
    scheduled_date: today,
    completed_at: null,
    review_result: null,
    signedImageUrl: question.signedImageUrl,
    questions: {
      id: question.id,
      subject: question.subject,
      chapter: question.chapter,
      knowledge_point: question.knowledge_point,
      difficulty: question.difficulty,
      image_path: question.image_path,
      source: question.source,
      question_text: question.question_text,
      choices: question.choices,
      question_text_status: question.question_text_status,
      mastery_status: question.mastery_status,
      mistake_types: question.mistake_types,
      standard_answer: question.standard_answer,
      answer_explanation: question.answer_explanation,
      key_steps: question.key_steps,
      answer_status: question.answer_status,
      answer_source: question.answer_source,
      one_sentence_tip: question.one_sentence_tip,
      review_priority: question.review_priority,
      needs_manual_check: question.needs_manual_check,
      created_at: question.created_at,
      deleted_at: question.deleted_at,
    },
  };
}

export default function PracticePage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [activeFilter, setActiveFilter] = useState<PracticeFilter | null>(null);
  const [queue, setQueue] = useState<FlashcardReview[]>([]);
  const [initialCount, setInitialCount] = useState(0);
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
  const [topicParam] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("topic")?.trim() ?? ""
      : "",
  );
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看专项复盘。",
  );
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
          if (topicParam) {
            const topicFilter: PracticeFilter = { type: "topic", topic: topicParam };
            const selected = filterPracticeQuestions(items, topicFilter).map(makePracticeReview);

            setActiveFilter(topicFilter);
            setQueue(selected);
            setInitialCount(selected.length);
            setCompletedCounts({ still_wrong: 0, improved: 0, mastered: 0, wrong_again: 0 });
            setSkippedCount(0);
            setMessage(selected.length === 0 ? "这个范围暂时没有错题。" : "");
          } else {
            setMessage(items.length === 0 ? "还没有可复盘的错题。" : "");
          }
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取专项复盘失败。");
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
  }, [supabase, topicParam]);

  const catalog = useMemo(() => buildPracticeCatalog(questions), [questions]);
  const completedTotal = Object.values(completedCounts).reduce((sum, count) => sum + count, 0);
  const activeReview = queue[0] ?? null;
  const progress =
    initialCount > 0 ? Math.round(((completedTotal + skippedCount) / initialCount) * 100) : 0;

  function resetRound(filter: PracticeFilter) {
    const selected = filterPracticeQuestions(questions, filter).map(makePracticeReview);

    setActiveFilter(filter);
    setQueue(selected);
    setInitialCount(selected.length);
    setCompletedCounts({ still_wrong: 0, improved: 0, mastered: 0, wrong_again: 0 });
    setSkippedCount(0);
    setMessage(selected.length === 0 ? "这个范围暂时没有错题。" : "");
  }

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

  function handleSkipReview(review: FlashcardReview) {
    setQueue((current) => current.filter((item) => item.id !== review.id));
    setSkippedCount((count) => count + 1);
    setMessage("已跳过本题，不记录本次结果。");
    cleanupReviewDraft(review.id);
  }

  async function handleReview(review: FlashcardReview, result: ReviewResult) {
    if (!supabase) {
      setMessage("请配置 Supabase 环境变量后再记录复盘结果。");
      return;
    }

    if (processingReviewId) {
      return;
    }

    setProcessingReviewId(review.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProcessingReviewId("");
      setMessage("请先登录，再记录专项复盘。");
      return;
    }

    const completedAt = new Date().toISOString();
    const today = todayIsoDate();
    const { error: upsertError } = await supabase
      .from("reviews")
      .upsert(
        {
          user_id: user.id,
          question_id: review.question_id,
          scheduled_date: today,
          completed_at: completedAt,
          review_result: result,
        },
        { onConflict: "question_id,scheduled_date" },
      );

    if (upsertError) {
      setProcessingReviewId("");
      setMessage(`专项复盘写入失败：${upsertError.message}`);
      return;
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("reviews")
      .select("scheduled_date")
      .eq("question_id", review.question_id);

    if (!existingError) {
      const adjustmentRows = buildReviewAdjustmentPlan({
        userId: user.id,
        questionId: review.question_id,
        reviewResult: result,
        existingScheduledDates: (existingRows ?? []).map((row) => String(row.scheduled_date)),
      });

      if (adjustmentRows.length > 0) {
        await supabase
          .from("reviews")
          .upsert(adjustmentRows, { onConflict: "question_id,scheduled_date" });
      }
    }

    if (result === "mastered") {
      await supabase
        .from("questions")
        .update({ review_priority: "low", mastery_status: "完全掌握" })
        .eq("id", review.question_id)
        .eq("user_id", user.id)
        .is("deleted_at", null);
    } else if (shouldIncrementRepeatedWrongCount(result)) {
      await supabase
        .from("questions")
        .update({ review_priority: "high" })
        .eq("id", review.question_id)
        .eq("user_id", user.id)
        .is("deleted_at", null);
    }

    try {
      await updateKnowledgeStatsForQuestionId(supabase, review.question_id);
    } catch {
      // 专项复盘结果已经写入；统计失败只提示，不阻断本轮继续。
    }

    setCompletedCounts((current) => ({ ...current, [result]: current[result] + 1 }));
    setQueue((current) => current.filter((item) => item.id !== review.id));
    cleanupReviewDraft(review.id);
    setProcessingReviewId("");
    setMessage("专项复盘结果已记录。");
  }

  function renderSummary() {
    return (
      <MobileSection>
        <StudyDashboardCard>
          <p className="text-sm font-bold text-white/75">专项复盘完成</p>
          <p className="mt-2 text-3xl font-black tracking-normal">本轮完成 {completedTotal} 题</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">又错</p>
              <p className="mt-1 text-2xl font-black">{completedCounts.wrong_again}</p>
            </div>
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">已掌握</p>
              <p className="mt-1 text-2xl font-black">{completedCounts.mastered}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/80">
            本章建议：把又错的题回到详情页补充卡点，下一轮优先处理同类错因。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveFilter(null);
                setInitialCount(0);
                setMessage("");
              }}
              className="min-h-12 rounded-lg bg-white px-4 text-sm font-black text-[#4f23b6]"
            >
              再选一组
            </button>
            <Link
              href="/questions"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/30 px-4 text-sm font-black text-white"
            >
              去错题库
            </Link>
          </div>
        </StudyDashboardCard>
        <div className="mt-4">
          <MotivationBanner text={getDailyMotivation()} />
        </div>
      </MobileSection>
    );
  }

  return (
    <MobilePageShell className="bg-[#f4f0ff]">
      <StudyPageHeader
        title="专项复盘"
        subtitle="主动挑一个章节或一类错因，开一轮更聚焦的闪卡复盘。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="章节" value={catalog.chapterOptions.length} helper="可选范围" />
          <SprintStatCard label="错因" value={catalog.mistakeOptions.length} helper="分类入口" />
          <SprintStatCard label="进度" value={`${progress}%`} helper="本轮完成" tone="purple" />
        </div>
      </MobileSection>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取专项复盘..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-[#e4dcff]">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {!isLoading && questions.length === 0 ? (
        <MobileSection>
          <EmptyState
            title="还没有可复盘的错题"
            description="先拍题上传或导入 ChatGPT 错题卡，再按章节和错因专项复盘。"
            action={{ href: "/import", label: "导入错题卡" }}
          />
        </MobileSection>
      ) : null}

      {!activeFilter && questions.length > 0 ? (
        <>
          <MobileSection>
            <SectionHeader title="章节复盘" subtitle="只复习所选章节内的错题，按优先级排序。" />
            <div className="grid gap-3">
              {catalog.chapterOptions.map((option) => (
                <button
                  key={`${option.subject}-${option.chapter}`}
                  type="button"
                  onClick={() =>
                    resetRound({ type: "chapter", subject: option.subject, chapter: option.chapter })
                  }
                  className="text-left"
                >
                  <StudyCard>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-[#211536]">{option.chapter}</p>
                        <p className="mt-1 text-xs text-slate-500">{option.subject}</p>
                      </div>
                      <StudyBadge tone={option.needsAttentionCount > 0 ? "amber" : "green"}>
                        {option.count} 题
                      </StudyBadge>
                    </div>
                  </StudyCard>
                </button>
              ))}
            </div>
          </MobileSection>

          <MobileSection>
            <SectionHeader title="错因复盘" subtitle="按概念、计算、审题等错因聚焦处理。" />
            <div className="grid grid-cols-2 gap-3">
              {catalog.mistakeOptions.map((option) => (
                <button
                  key={option.mistakeType}
                  type="button"
                  onClick={() => resetRound({ type: "mistake", mistakeType: option.mistakeType })}
                  className="text-left"
                >
                  <StudyCard>
                    <p className="font-black text-[#211536]">{option.mistakeType}</p>
                    <p className="mt-2 text-xs text-slate-500">{option.count} 题</p>
                  </StudyCard>
                </button>
              ))}
            </div>
          </MobileSection>
        </>
      ) : null}

      {activeReview ? (
        <ReviewFlashcard
          review={activeReview}
          today={todayIsoDate()}
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

      {activeFilter && !activeReview && initialCount > 0 ? renderSummary() : null}
    </MobilePageShell>
  );
}
