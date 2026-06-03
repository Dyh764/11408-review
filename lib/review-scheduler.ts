import type { MasteryStatus, ReviewResult } from "@/lib/types";

export type ReviewInsert = {
  user_id: string;
  question_id: string;
  scheduled_date: string;
};

type BuildReviewPlanInput = {
  userId: string;
  questionId: string;
  masteryStatus: MasteryStatus;
  baseDate?: Date;
  existingScheduledDates?: string[];
};

type BuildAdjustmentInput = {
  userId: string;
  questionId: string;
  reviewResult: ReviewResult;
  baseDate?: Date;
  existingScheduledDates?: string[];
};

const initialOffsetsByMastery: Record<MasteryStatus, number[]> = {
  完全没思路: [0, 1, 3, 7, 14, 30],
  有一点思路: [1, 3, 7, 15, 30],
  思路对但卡住: [1, 3, 7, 15],
  计算错误: [3, 7, 14],
  做对但不稳: [5, 15, 30],
  完全掌握: [],
};

const adjustmentOffsetsByResult: Record<ReviewResult, number[]> = {
  still_wrong: [1, 3, 7],
  improved: [],
  mastered: [],
  wrong_again: [1, 3, 7, 14],
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildUniqueReviewRows(
  userId: string,
  questionId: string,
  offsets: number[],
  baseDate: Date,
  existingScheduledDates: string[],
): ReviewInsert[] {
  const seen = new Set(existingScheduledDates);

  return offsets.reduce<ReviewInsert[]>((rows, offset) => {
    const scheduledDate = toIsoDate(addDays(baseDate, offset));

    if (seen.has(scheduledDate)) {
      return rows;
    }

    seen.add(scheduledDate);
    rows.push({
      user_id: userId,
      question_id: questionId,
      scheduled_date: scheduledDate,
    });

    return rows;
  }, []);
}

export function buildInitialReviewPlan({
  userId,
  questionId,
  masteryStatus,
  baseDate = new Date(),
  existingScheduledDates = [],
}: BuildReviewPlanInput): ReviewInsert[] {
  return buildUniqueReviewRows(
    userId,
    questionId,
    initialOffsetsByMastery[masteryStatus],
    baseDate,
    existingScheduledDates,
  );
}

export function buildReviewAdjustmentPlan({
  userId,
  questionId,
  reviewResult,
  baseDate = new Date(),
  existingScheduledDates = [],
}: BuildAdjustmentInput): ReviewInsert[] {
  return buildUniqueReviewRows(
    userId,
    questionId,
    adjustmentOffsetsByResult[reviewResult],
    baseDate,
    existingScheduledDates,
  );
}

export function shouldCancelPendingHighFrequencyReviews(reviewResult: ReviewResult) {
  return reviewResult === "mastered";
}

export function shouldIncrementRepeatedWrongCount(reviewResult: ReviewResult) {
  return reviewResult === "wrong_again";
}
