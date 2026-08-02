"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { MotivationBanner } from "@/components/study/MotivationBanner";
import { ReviewFlashcardDeck } from "@/components/study/ReviewFlashcardDeck";
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
  filterPracticeQuestions,
  type PracticeFilter,
  type PracticeSourceRange,
} from "@/lib/practice/practice-catalog";
import {
  parsePracticeAnswerMode,
  practiceAnswerModeLabels,
  type PracticeAnswerMode,
} from "@/lib/practice/practice-mode";
import {
  buildPracticeScopeKey,
  buildPracticeSessionStorageKey,
  completePracticeQuestion,
  createPracticeSession,
  markPracticeQuestionShown,
  parsePracticeSession,
  reconcilePracticeSession,
  removeUnavailablePracticeQuestion,
  selectPracticeResumeQuestionId,
  skipPracticeQuestion,
  type PracticeSessionV1,
} from "@/lib/practice/practice-session";
import { buildReviewAdjustmentPlan, shouldIncrementRepeatedWrongCount } from "@/lib/review-scheduler";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import { canUseQuestionInPractice } from "@/lib/questions/question-image";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import type { ReviewResult } from "@/lib/types";

const exam408SubjectOptions = ["数据结构", "计算机组成原理", "操作系统", "计算机网络"] as const;
const practiceDifficultyOptions = ["基础", "中等", "较难", "压轴"] as const;
const practiceSourceOptions: Array<{
  key: PracticeSourceRange;
  label: string;
}> = [
  { key: "all", label: "全部题源" },
  { key: "book", label: "王道书配套题" },
  { key: "exam", label: "历年真题" },
  { key: "supplement", label: "补充习题" },
];

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
      source_info: question.source_info,
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

function getPracticeQuestionSelection(
  questions: QuestionWithImage[],
  filter: PracticeFilter,
) {
  const candidates =
    filter.type === "daily-choice"
      ? questions.filter(canUseQuestionInPractice)
      : questions;
  const filtered = filterPracticeQuestions(candidates, filter);
  const available = filtered.filter(canUseQuestionInPractice);

  return {
    available,
    missingImageCount: filtered.length - available.length,
  };
}

function getPracticeScopeLabel(filter: PracticeFilter) {
  if (filter.type === "exam408-choice") {
    const sourceLabel =
      practiceSourceOptions.find((option) => option.key === filter.sourceRange)?.label ?? "";
    return [
      filter.chapter || filter.subject || "全部 408",
      filter.difficulty,
      filter.sourceRange && filter.sourceRange !== "all" ? sourceLabel : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (filter.type === "daily-choice") {
    return "每日一题";
  }

  if (filter.type === "high-frequency-choice") {
    return "个人高频错题";
  }

  if (filter.type === "chapter") {
    return `${filter.subject} / ${filter.chapter}`;
  }

  if (filter.type === "topic") {
    return filter.topic;
  }

  return filter.mistakeType;
}

function practiceSessionSize(session: PracticeSessionV1) {
  const completed = Object.values(session.completedCounts).reduce((sum, count) => sum + count, 0);
  return session.remainingQuestionIds.length + completed + session.skippedCount;
}

function persistPracticeSession(session: PracticeSessionV1) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = buildPracticeSessionStorageKey(session.userId, session.scopeKey);
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

function preparePracticeRound(
  questions: QuestionWithImage[],
  filter: PracticeFilter,
) {
  const selection = getPracticeQuestionSelection(questions, filter);
  const questionIds = selection.available.map((question) => question.id);
  const questionById = new Map(selection.available.map((question) => [question.id, question]));
  const userId = selection.available[0]?.user_id ?? questions[0]?.user_id ?? "";
  const scopeKey = buildPracticeScopeKey(filter);
  const storageKey = userId ? buildPracticeSessionStorageKey(userId, scopeKey) : "";
  const stored =
    storageKey && typeof window !== "undefined"
      ? parsePracticeSession(window.localStorage.getItem(storageKey))
      : null;
  const matchingStored =
    stored && stored.userId === userId && stored.scopeKey === scopeKey ? stored : null;
  const reconciled = matchingStored
    ? reconcilePracticeSession(matchingStored, questionIds)
    : null;
  let session =
    reconciled && reconciled.remainingQuestionIds.length > 0
      ? reconciled
      : createPracticeSession({
          userId,
          filter,
          questionIds,
          previousFirstQuestionId: reconciled?.orderedQuestionIds[0],
        });
  const activeQuestionId = selectPracticeResumeQuestionId(session);

  if (activeQuestionId) {
    session = markPracticeQuestionShown(session, activeQuestionId);
  }

  if (userId) {
    persistPracticeSession(session);
  }

  return {
    session,
    activeReviewId: activeQuestionId ? `practice-${activeQuestionId}` : "",
    queue: session.remainingQuestionIds
      .map((questionId) => questionById.get(questionId))
      .filter((question): question is QuestionWithImage => Boolean(question))
      .map(makePracticeReview),
    missingImageCount: selection.missingImageCount,
  };
}

function PracticeContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [activeFilter, setActiveFilter] = useState<PracticeFilter | null>(null);
  const [queue, setQueue] = useState<FlashcardReview[]>([]);
  const [activeReviewId, setActiveReviewId] = useState("");
  const [practiceSession, setPracticeSession] = useState<PracticeSessionV1 | null>(null);
  const [activeAnswerMode, setActiveAnswerMode] = useState<PracticeAnswerMode>("standard");
  const practiceSessionRef = useRef<PracticeSessionV1 | null>(null);
  const unavailableImageIdsRef = useRef(new Set<string>());
  const [missingImageCount, setMissingImageCount] = useState(0);
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
  const [submittedResults, setSubmittedResults] = useState<
    Record<string, ReviewResult | undefined>
  >({});
  const [repeatAttemptCount, setRepeatAttemptCount] = useState(0);
  const [openBookViewedCount, setOpenBookViewedCount] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [processingReviewId, setProcessingReviewId] = useState("");
  const topicParam = searchParams.get("topic")?.trim() ?? "";
  const modeParam = searchParams.get("mode")?.trim() ?? "";
  const subjectParam = searchParams.get("subject")?.trim() ?? "";
  const chapterParam = searchParams.get("chapter")?.trim() ?? "";
  const answerModeParam = searchParams.get("answerMode")?.trim() ?? "";
  const sourceRangeParam = searchParams.get("sourceRange")?.trim() ?? "";
  const difficultyParam = searchParams.get("difficulty")?.trim() ?? "";
  const [message, setMessage] = useState(
    supabase ? "" : "当前未连接错题数据，请先到设置完成连接。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  const activatePreparedRound = useCallback(
    (
      prepared: ReturnType<typeof preparePracticeRound>,
      filter: PracticeFilter,
      answerMode: PracticeAnswerMode = "standard",
    ) => {
      practiceSessionRef.current = prepared.session;
      unavailableImageIdsRef.current.clear();
      setPracticeSession(prepared.session);
      setActiveFilter(filter);
      setActiveAnswerMode(answerMode);
      setQueue(prepared.queue);
      setActiveReviewId(prepared.activeReviewId);
      setInitialCount(practiceSessionSize(prepared.session));
      setCompletedCounts(prepared.session.completedCounts);
      setSkippedCount(prepared.session.skippedCount);
      setMissingImageCount(prepared.missingImageCount);
      setRevealedAnswers({});
      setSelectedChoices({});
      setSubmittedChoices({});
      setSubmittedResults({});
      setRepeatAttemptCount(0);
      setOpenBookViewedCount(0);
      setDraftAnswers({});
      setMessage(
        prepared.queue.length === 0
          ? prepared.missingImageCount > 0
            ? `当前范围有 ${prepared.missingImageCount} 道题依赖图片但没有可用原图，已自动跳过。`
            : "这个范围暂时没有可刷的 408 选择题。"
          : prepared.missingImageCount > 0
            ? `已自动跳过 ${prepared.missingImageCount} 道缺图题。`
            : "",
      );
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    fetchCurrentUserQuestions(supabase)
      .then((items) => {
        if (isActive) {
          setQuestions(items);
          if (modeParam === "exam408-choice") {
            const answerMode = parsePracticeAnswerMode(answerModeParam);
            const sourceRange = practiceSourceOptions.some(
              (option) => option.key === sourceRangeParam,
            )
              ? (sourceRangeParam as PracticeSourceRange)
              : undefined;
            const difficulty = practiceDifficultyOptions.includes(
              difficultyParam as (typeof practiceDifficultyOptions)[number],
            )
              ? difficultyParam
              : undefined;
            const choiceFilter: PracticeFilter = {
              type: "exam408-choice",
              subject: subjectParam || undefined,
              chapter: chapterParam || undefined,
              sourceRange,
              difficulty,
              answerMode: answerMode === "standard" ? undefined : answerMode,
            };
            activatePreparedRound(
              preparePracticeRound(items, choiceFilter),
              choiceFilter,
              answerMode,
            );
          } else if (modeParam === "daily-choice") {
            const dailyFilter: PracticeFilter = {
              type: "daily-choice",
              date: todayIsoDate(),
            };
            activatePreparedRound(preparePracticeRound(items, dailyFilter), dailyFilter);
          } else if (modeParam === "high-frequency-choice") {
            const highFrequencyFilter: PracticeFilter = {
              type: "high-frequency-choice",
            };
            activatePreparedRound(
              preparePracticeRound(items, highFrequencyFilter),
              highFrequencyFilter,
            );
          } else if (topicParam) {
            const topicFilter: PracticeFilter = { type: "topic", topic: topicParam };
            activatePreparedRound(preparePracticeRound(items, topicFilter), topicFilter);
          } else {
            setMessage(items.length === 0 ? "还没有可刷的 408 选择题。" : "");
          }
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取 408 刷题数据失败。");
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
  }, [
    activatePreparedRound,
    answerModeParam,
    supabase,
    chapterParam,
    difficultyParam,
    modeParam,
    sourceRangeParam,
    subjectParam,
    topicParam,
  ]);

  const exam408Selection = useMemo(
    () => getPracticeQuestionSelection(questions, { type: "exam408-choice" }),
    [questions],
  );
  const exam408ChoiceTotal = exam408Selection.available.length;
  const exam408MissingImageTotal = exam408Selection.missingImageCount;
  const dailyChoiceSelection = useMemo(
    () =>
      getPracticeQuestionSelection(questions, {
        type: "daily-choice",
        date: todayIsoDate(),
      }),
    [questions],
  );
  const highFrequencySelection = useMemo(
    () => getPracticeQuestionSelection(questions, { type: "high-frequency-choice" }),
    [questions],
  );
  const exam408SubjectCounts = useMemo(
    () =>
      exam408SubjectOptions.map((subject) => {
        const selection = getPracticeQuestionSelection(questions, {
          type: "exam408-choice",
          subject,
        });

        return {
          subject,
          count: selection.available.length,
          missingImageCount: selection.missingImageCount,
        };
      }),
    [questions],
  );
  const completedTotal = Object.values(completedCounts).reduce((sum, count) => sum + count, 0);
  const progress =
    initialCount > 0 ? Math.round(((completedTotal + skippedCount) / initialCount) * 100) : 0;

  function resetRound(
    filter: PracticeFilter,
    answerMode: PracticeAnswerMode = "standard",
  ) {
    const scopedFilter: PracticeFilter =
      filter.type === "exam408-choice"
        ? {
            ...filter,
            answerMode: answerMode === "standard" ? undefined : answerMode,
          }
        : filter;
    activatePreparedRound(
      preparePracticeRound(questions, scopedFilter),
      scopedFilter,
      answerMode,
    );
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
    setSubmittedResults((current) => {
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

  function syncPracticeSession(nextSession: PracticeSessionV1) {
    practiceSessionRef.current = nextSession;
    setPracticeSession(nextSession);
    setInitialCount(practiceSessionSize(nextSession));
    setCompletedCounts(nextSession.completedCounts);
    setSkippedCount(nextSession.skippedCount);
    persistPracticeSession(nextSession);
  }

  function updatePracticeSession(
    update: (current: PracticeSessionV1) => PracticeSessionV1,
  ) {
    const current = practiceSessionRef.current;

    if (!current) {
      return null;
    }

    const next = update(current);
    syncPracticeSession(next);
    return next;
  }

  function retireVisibleReview(review: FlashcardReview) {
    const reviewIndex = queue.findIndex((item) => item.id === review.id);
    const remaining = queue.filter((item) => item.id !== review.id);
    const nextReview =
      remaining[Math.min(Math.max(reviewIndex, 0), Math.max(remaining.length - 1, 0))] ??
      remaining[0];

    setQueue(remaining);
    setActiveReviewId(nextReview?.id ?? "");
    cleanupReviewDraft(review.id);
  }

  function handleActiveReviewChange(review: FlashcardReview) {
    setActiveReviewId(review.id);
    updatePracticeSession((current) =>
      markPracticeQuestionShown(current, review.question_id),
    );
  }

  function advanceRepeatReview(review: FlashcardReview) {
    const reviewIndex = queue.findIndex((item) => item.id === review.id);
    const nextReview = queue[(reviewIndex + 1 + queue.length) % queue.length];

    cleanupReviewDraft(review.id);
    if (nextReview) {
      setActiveReviewId(nextReview.id);
      updatePracticeSession((current) =>
        markPracticeQuestionShown(current, nextReview.question_id),
      );
    }
    setMessage("已保留本组题目，可继续循环作答。");
  }

  function handleSkipReview(review: FlashcardReview) {
    if (activeAnswerMode === "repeat") {
      advanceRepeatReview(review);
      return;
    }

    updatePracticeSession((current) =>
      skipPracticeQuestion(current, review.question_id),
    );
    retireVisibleReview(review);
    setMessage("已跳过本题，不记录本次结果。");
  }

  function handleOpenBookNext(review: FlashcardReview) {
    updatePracticeSession((current) =>
      skipPracticeQuestion(current, review.question_id),
    );
    setOpenBookViewedCount((count) => count + 1);
    retireVisibleReview(review);
    setMessage("本题已回顾，不写入对错记录。");
  }

  function completeReviewLocally(review: FlashcardReview, result: ReviewResult, nextMessage: string) {
    updatePracticeSession((current) =>
      completePracticeQuestion(current, review.question_id, result),
    );
    retireVisibleReview(review);
    setMessage(nextMessage);
  }

  async function persistReviewResult(
    review: FlashcardReview,
    result: ReviewResult,
    options: { lock: boolean; failurePrefix: string },
  ) {
    if (!supabase) {
      setMessage("当前未连接错题数据，暂时不能记录刷题结果。");
      return false;
    }

    if (options.lock && processingReviewId) {
      return false;
    }

    if (options.lock) {
      setProcessingReviewId(review.id);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (options.lock) {
        setProcessingReviewId("");
      }
      setMessage("请先登录，再记录刷题结果。");
      return false;
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
      if (options.lock) {
        setProcessingReviewId("");
      }
      setMessage(`${options.failurePrefix}${upsertError.message}`);
      return false;
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
      // 刷题结果已经写入；统计失败只提示，不阻断本轮继续。
    }

    if (options.lock) {
      setProcessingReviewId("");
    }

    return true;
  }

  async function handleReview(review: FlashcardReview, result: ReviewResult) {
    const saved = await persistReviewResult(review, result, {
      lock: true,
      failurePrefix: "刷题记录写入失败：",
    });

    if (saved) {
      completeReviewLocally(review, result, "刷题结果已记录。");
    }
  }

  function handleChoiceSubmitAndNext(review: FlashcardReview, result?: ReviewResult) {
    setSubmittedChoices((current) => ({ ...current, [review.id]: true }));
    setRevealedAnswers((current) => ({ ...current, [review.id]: true }));
    setSubmittedResults((current) => ({ ...current, [review.id]: result }));

    if (!result) {
      setMessage("已显示答案；这道题暂时无法自动判断，请手动记录结果。");
      return;
    }

    if (activeAnswerMode === "editable") {
      setMessage(
        result === "mastered"
          ? "回答正确；如需调整可点“修改答案”，确认后再进入下一题。"
          : "回答错误；可查看逐项解析，也可以修改答案后重新提交。",
      );
      return;
    }

    updatePracticeSession((current) =>
      completePracticeQuestion(current, review.question_id, result),
    );
    if (activeAnswerMode === "repeat") {
      setRepeatAttemptCount((count) => count + 1);
    }
    setMessage(result === "mastered" ? "回答正确，查看解析后点下一题。" : "回答错误，查看解析后点下一题。");
    void persistReviewResult(review, result, {
      lock: false,
      failurePrefix: "后台记录失败：",
    });
  }

  function handleChoiceFeedbackNext(review: FlashcardReview) {
    if (activeAnswerMode === "editable") {
      const result = submittedResults[review.id];

      if (!result) {
        return;
      }

      updatePracticeSession((current) =>
        completePracticeQuestion(current, review.question_id, result),
      );
      void persistReviewResult(review, result, {
        lock: false,
        failurePrefix: "后台记录失败：",
      });
    }

    if (activeAnswerMode === "repeat") {
      advanceRepeatReview(review);
      return;
    }

    retireVisibleReview(review);
    setMessage("");
  }

  function handleEditChoice(review: FlashcardReview) {
    setSubmittedChoices((current) => ({ ...current, [review.id]: false }));
    setRevealedAnswers((current) => ({ ...current, [review.id]: false }));
    setSubmittedResults((current) => {
      const next = { ...current };
      delete next[review.id];
      return next;
    });
    setMessage("已恢复作答，可重新选择并提交；本轮以最后一次答案为准。");
  }

  function handleImageUnavailable(review: FlashcardReview) {
    if (unavailableImageIdsRef.current.has(review.question_id)) {
      return;
    }

    unavailableImageIdsRef.current.add(review.question_id);
    updatePracticeSession((current) =>
      removeUnavailablePracticeQuestion(current, review.question_id),
    );
    setMissingImageCount((count) => count + 1);
    retireVisibleReview(review);
    setMessage("原题图片加载失败，已自动跳过本题，不记录作答结果。");
  }

  function renderDefaultPracticeEntry() {
    return (
      <>
        <MobileSection>
          <div className="rounded-lg border border-slate-900 bg-slate-950 p-4 text-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
            <div className="gap-4 md:flex md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black text-emerald-400">普通刷题</p>
                <p className="mt-1 text-xl font-black">
                  {exam408ChoiceTotal} 道 408 选择题
                </p>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  接着上次进度，提交后立即看对错和逐项解析。
                  {exam408MissingImageTotal > 0
                    ? ` 已排除 ${exam408MissingImageTotal} 道缺图题。`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => resetRound({ type: "exam408-choice" })}
                disabled={exam408ChoiceTotal === 0}
                className="mt-3 min-h-11 w-full rounded-xl bg-emerald-500 px-5 text-sm font-black text-white disabled:bg-white/10 disabled:text-white/40 md:mt-0 md:w-auto"
              >
                开始 / 继续
              </button>
            </div>
          </div>
        </MobileSection>

        <MobileSection>
          <SectionHeader
            title="题库专项"
            subtitle="视频里的每日一题、高频错题、二刷错题和考点刷题都从你的题库生成。"
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                resetRound({
                  type: "daily-choice",
                  date: todayIsoDate(),
                })
              }
              disabled={dailyChoiceSelection.available.length === 0}
              className="rounded-lg bg-emerald-50 p-4 text-left ring-1 ring-emerald-100 disabled:opacity-50"
            >
              <span className="block text-sm font-black text-emerald-800">每日一题</span>
              <span className="mt-1 block text-xs leading-5 text-emerald-700">
                每天固定同一道题
              </span>
            </button>
            <button
              type="button"
              onClick={() => resetRound({ type: "high-frequency-choice" })}
              disabled={highFrequencySelection.available.length === 0}
              className="rounded-lg bg-amber-50 p-4 text-left ring-1 ring-amber-100 disabled:opacity-50"
            >
              <span className="block text-sm font-black text-amber-900">个人高频错题</span>
              <span className="mt-1 block text-xs leading-5 text-amber-700">
                {highFrequencySelection.available.length} 道反复不稳题
              </span>
            </button>
            <Link
              href="/knowledge-map"
              className="rounded-lg bg-white p-4 ring-1 ring-slate-100"
            >
              <span className="block text-sm font-black text-slate-950">按考点刷题</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                按科目、章节和考频选题
              </span>
            </Link>
            <Link
              href="/review"
              className="rounded-lg bg-white p-4 ring-1 ring-slate-100"
            >
              <span className="block text-sm font-black text-slate-950">二刷错题</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                回填仍错、进步或掌握
              </span>
            </Link>
          </div>
          <div className="mt-3">
            <Link
              href="/collections"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-3 text-sm font-black text-blue-700 ring-1 ring-blue-100"
            >
              题目分组 / PDF
            </Link>
          </div>
        </MobileSection>

        <MobileSection>
          <SectionHeader title="按科目刷题" subtitle="入口只统计已经拆出 A/B/C/D 选项的 408 选择题。" />
          <div className="grid gap-3">
            {exam408SubjectCounts.map((option) => (
              <button
                key={option.subject}
                type="button"
                onClick={() => resetRound({ type: "exam408-choice", subject: option.subject })}
                disabled={option.count === 0}
                className="text-left disabled:opacity-55"
              >
                <StudyCard>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950">{option.subject}</p>
                      {option.missingImageCount > 0 ? (
                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          自动跳过缺图 {option.missingImageCount} 题
                        </p>
                      ) : null}
                    </div>
                    <StudyBadge tone={option.count > 0 ? "green" : "amber"}>
                      {option.count > 0 ? `${option.count} 题` : "暂无可刷"}
                    </StudyBadge>
                  </div>
                </StudyCard>
              </button>
            ))}
          </div>
        </MobileSection>

        {exam408ChoiceTotal === 0 ? (
          <MobileSection>
            <StudyCard>
              <p className="text-sm font-black text-slate-950">先导入 408 选择题</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {exam408MissingImageTotal > 0
                  ? `当前 ${exam408MissingImageTotal} 道选择题缺少可用原图，已经自动跳过。`
                  : "当前没有可刷的 408 选择题。先导入一道带选项和答案的专业课错题，这里就会出现刷题入口。"}
              </p>
              <Link
                href="/import"
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
              >
                去导入
              </Link>
            </StudyCard>
          </MobileSection>
        ) : null}
      </>
    );
  }

  function renderSummary() {
    const gradedTotal = completedCounts.mastered + completedCounts.wrong_again;
    const accuracy =
      gradedTotal > 0 ? Math.round((completedCounts.mastered / gradedTotal) * 100) : 0;

    return (
      <MobileSection>
        <StudyDashboardCard>
          <p className="text-sm font-bold text-white/75">本轮刷题完成</p>
          <p className="mt-2 text-3xl font-black tracking-normal">
            {activeAnswerMode === "open-book"
              ? `本轮回顾 ${openBookViewedCount} 题`
              : `本轮完成 ${completedTotal} 题`}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">又错</p>
              <p className="mt-1 text-2xl font-black">{completedCounts.wrong_again}</p>
            </div>
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">已掌握</p>
              <p className="mt-1 text-2xl font-black">{completedCounts.mastered}</p>
            </div>
            <div className="rounded-lg bg-white/12 p-3">
              <p className="text-xs text-white/70">正确率</p>
              <p className="mt-1 text-2xl font-black">
                {gradedTotal > 0 ? `${accuracy}%` : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/80">
            {activeAnswerMode === "open-book"
              ? "开卷回顾不写入对错；需要检验掌握度时，可再用修改模式或快速回填。"
              : "本章建议：把又错的题回到详情页补充卡点，下一轮优先处理同类错因。"}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveFilter(null);
                setActiveAnswerMode("standard");
                setInitialCount(0);
                setMessage("");
              }}
              className="min-h-12 rounded-lg bg-white px-4 text-sm font-black text-blue-700"
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

  if (activeFilter && queue.length > 0) {
    return (
      <MobilePageShell className="fixed inset-0 z-40 flex h-dvh min-h-0 flex-col space-y-0 overflow-hidden bg-slate-50 pb-[env(safe-area-inset-bottom)]">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">
                {getPracticeScopeLabel(activeFilter)}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {practiceAnswerModeLabels[activeAnswerMode]} ·{" "}
                {activeAnswerMode === "repeat"
                  ? `已作答 ${repeatAttemptCount} 次 · 本组 ${queue.length} 题`
                  : `本轮 ${progress}% · 剩余 ${
                      practiceSession?.remainingQuestionIds.length ?? queue.length
                    } 题`}
                {missingImageCount > 0 ? ` · 缺图跳过 ${missingImageCount} 题` : ""}
              </p>
            </div>
            <button
              type="button"
              data-swipe-ignore
              onClick={() => {
                setActiveFilter(null);
                setActiveAnswerMode("standard");
                setQueue([]);
                setActiveReviewId("");
                setMessage("");
              }}
              className="min-h-9 shrink-0 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700"
            >
              退出本轮
            </button>
          </div>
        </header>

        {message ? (
          <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-4 py-2 text-center text-xs font-semibold leading-5 text-amber-800">
            {message}
          </div>
        ) : null}

        <div className="mx-auto min-h-0 w-full max-w-4xl flex-1">
          <ReviewFlashcardDeck
            reviews={queue}
            activeReviewId={activeReviewId}
            onActiveReviewChange={handleActiveReviewChange}
            focusMode
            loopNavigation={activeAnswerMode === "repeat"}
            onAdvance={(review) => {
              if (activeAnswerMode === "open-book") {
                handleOpenBookNext(review);
                return true;
              }

              if (activeAnswerMode === "repeat" && submittedChoices[review.id]) {
                advanceRepeatReview(review);
                return true;
              }

              if (activeAnswerMode === "editable" && submittedChoices[review.id]) {
                handleChoiceFeedbackNext(review);
                return true;
              }

              const resultRecorded =
                !practiceSession?.remainingQuestionIds.includes(review.question_id);

              if (!submittedChoices[review.id] || !resultRecorded) {
                return false;
              }

              handleChoiceFeedbackNext(review);
              return true;
            }}
            renderCard={(review) => (
              <ReviewFlashcard
                review={review}
                today={todayIsoDate()}
                selectedChoices={selectedChoices[review.id] ?? []}
                submittedChoice={Boolean(submittedChoices[review.id])}
                answerRevealed={
                  activeAnswerMode === "open-book" ||
                  activeAnswerMode === "quick-fill" ||
                  Boolean(revealedAnswers[review.id])
                }
                draftAnswer={draftAnswers[review.id] ?? ""}
                processing={processingReviewId === review.id}
                processingLocked={Boolean(processingReviewId)}
                focusMode
                practiceMode={activeAnswerMode}
                onImageUnavailable={() => handleImageUnavailable(review)}
                onToggleChoice={toggleChoice}
                onSubmitChoice={(result) => handleChoiceSubmitAndNext(review, result)}
                onNextAfterFeedback={() => handleChoiceFeedbackNext(review)}
                onEditAnswer={() => handleEditChoice(review)}
                onOpenBookNext={() => handleOpenBookNext(review)}
                onRevealAnswer={() =>
                  setRevealedAnswers((current) => ({ ...current, [review.id]: true }))
                }
                onDraftAnswer={(value) =>
                  setDraftAnswers((current) => ({ ...current, [review.id]: value }))
                }
                onSkip={() => handleSkipReview(review)}
                onReview={(result) => handleReview(review, result)}
              />
            )}
          />
        </div>
      </MobilePageShell>
    );
  }

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        title="408 选择题刷题"
        subtitle="按四门专业课连续刷题，提交后立即看对错和解析，再进入下一题。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="408" value={exam408ChoiceTotal} helper="可刷选择题" />
          <SprintStatCard label="科目" value={exam408SubjectCounts.filter((item) => item.count > 0).length} helper="可刷范围" />
          <SprintStatCard label="进度" value={`${progress}%`} helper="本轮完成" tone="purple" />
        </div>
      </MobileSection>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取 408 刷题数据..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {!isLoading &&
      (!activeFilter || (activeFilter && queue.length === 0 && initialCount === 0))
        ? renderDefaultPracticeEntry()
        : null}

      {activeFilter && queue.length === 0 && initialCount > 0 ? renderSummary() : null}
    </MobilePageShell>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <MobilePageShell>
          <MobileSection>
            <LoadingState label="正在读取 408 刷题数据..." />
          </MobileSection>
        </MobilePageShell>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
