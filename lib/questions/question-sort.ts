import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  ReviewPriority,
  ReviewResult,
} from "../types";

export type ChapterListSortableQuestion = {
  id: string;
  difficulty?: Difficulty | string | null;
  mastery_status?: MasteryStatus | string | null;
  question_text_status?: QuestionTextStatus | string | null;
  answer_status?: AnswerStatus | string | null;
  needs_manual_check?: boolean | null;
  review_priority?: ReviewPriority | string | null;
  review_result?: ReviewResult | string | null;
  priority_score?: number | null;
  scheduled_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ChapterListSortOptions = {
  dueTodayIds?: Set<string>;
  today?: string;
};

export function getDifficultyWeight(difficulty?: string | null) {
  const value = difficulty?.trim();

  if (value === "困难" || value === "较难" || value === "压轴") {
    return 3;
  }

  if (value === "中等") {
    return 2;
  }

  if (value === "简单" || value === "基础" || value === "容易") {
    return 1;
  }

  return 0;
}

function isDueTodayOrOverdue(question: ChapterListSortableQuestion, options: ChapterListSortOptions) {
  if (options.dueTodayIds?.has(question.id)) {
    return true;
  }

  return Boolean(options.today && question.scheduled_date && question.scheduled_date <= options.today);
}

function getStatusWeight(question: ChapterListSortableQuestion, options: ChapterListSortOptions) {
  if (question.question_text_status === "needs_fix" || question.answer_status === "needs_fix") {
    return 5;
  }

  if (question.needs_manual_check) {
    return 4;
  }

  if (isDueTodayOrOverdue(question, options)) {
    return 3;
  }

  if (question.answer_status === "ai_unverified") {
    return 2;
  }

  return 0;
}

function getRiskWeight(question: ChapterListSortableQuestion) {
  const mastery = question.mastery_status?.trim() ?? "";

  if (question.review_result === "wrong_again") {
    return 4;
  }

  if (question.review_result === "still_wrong") {
    return 3;
  }

  if (mastery.includes("不会") || mastery.includes("需复习") || mastery.includes("不熟")) {
    return 2;
  }

  if (mastery.includes("已掌握") || mastery === "完全掌握") {
    return -2;
  }

  return 0;
}

function getPriorityScore(question: ChapterListSortableQuestion) {
  if (typeof question.priority_score === "number" && Number.isFinite(question.priority_score)) {
    return question.priority_score;
  }

  if (question.review_priority === "high") {
    return 60;
  }

  if (question.review_priority === "medium") {
    return 30;
  }

  if (question.review_priority === "low") {
    return -10;
  }

  return 0;
}

function stableDateValue(question: ChapterListSortableQuestion) {
  return question.updated_at ?? question.created_at ?? "";
}

export function sortQuestionsForChapterList<T extends ChapterListSortableQuestion>(
  questions: T[],
  options: ChapterListSortOptions = {},
): T[] {
  return questions
    .map((question, index) => ({ question, index }))
    .sort((aEntry, bEntry) => {
    const a = aEntry.question;
    const b = bEntry.question;
    const difficultyDelta = getDifficultyWeight(b.difficulty) - getDifficultyWeight(a.difficulty);
    if (difficultyDelta !== 0) return difficultyDelta;

    const statusDelta = getStatusWeight(b, options) - getStatusWeight(a, options);
    if (statusDelta !== 0) return statusDelta;

    const riskDelta = getRiskWeight(b) - getRiskWeight(a);
    if (riskDelta !== 0) return riskDelta;

    const priorityDelta = getPriorityScore(b) - getPriorityScore(a);
    if (priorityDelta !== 0) return priorityDelta;

    const stableDateDelta = stableDateValue(b).localeCompare(stableDateValue(a));
    if (stableDateDelta !== 0) return stableDateDelta;

    return aEntry.index - bEntry.index;
  })
    .map((entry) => entry.question);
}
