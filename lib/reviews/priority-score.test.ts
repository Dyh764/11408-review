import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateReviewPriorityScore,
  explainReviewPriorityScore,
  sortDueReviewsByPriority,
  type PriorityReviewInput,
} from "./priority-score.ts";

const baseReview: PriorityReviewInput = {
  id: "base",
  scheduled_date: "2026-06-11",
  questions: {
    difficulty: "中等",
    mastery_status: "有一点思路",
    question_text_status: "verified",
    answer_status: "verified",
    needs_manual_check: false,
    review_priority: "medium",
    mistake_types: [],
  },
};

test("priority score gives overdue and repeated-wrong items a clear lead", () => {
  const normal = calculateReviewPriorityScore(baseReview, "2026-06-11");
  const risky = calculateReviewPriorityScore(
    {
      ...baseReview,
      id: "risky",
      scheduled_date: "2026-06-04",
      review_result: "wrong_again",
      questions: {
        ...baseReview.questions,
        difficulty: "压轴",
        question_text_status: "needs_fix",
        answer_status: "needs_fix",
        needs_manual_check: true,
        review_priority: "high",
        mistake_types: ["连续做错", "概念混淆"],
      },
    },
    "2026-06-11",
  );

  assert.ok(risky.total > normal.total + 100);
  assert.ok(risky.reasons.some((reason) => reason.includes("逾期")));
  assert.ok(risky.reasons.some((reason) => reason.includes("又错")));
  assert.ok(risky.reasons.some((reason) => reason.includes("需要修正")));
});

test("priority score discounts mastered low-risk questions", () => {
  const mastered = calculateReviewPriorityScore(
    {
      ...baseReview,
      questions: {
        ...baseReview.questions,
        mastery_status: "完全掌握",
        review_priority: "low",
      },
    },
    "2026-06-11",
  );
  const unstable = calculateReviewPriorityScore(
    {
      ...baseReview,
      questions: {
        ...baseReview.questions,
        mastery_status: "做对但不稳",
        review_priority: "high",
      },
    },
    "2026-06-11",
  );

  assert.ok(mastered.total < unstable.total);
  assert.ok(mastered.reasons.some((reason) => reason.includes("已掌握降权")));
});

test("sortDueReviewsByPriority orders highest score first and keeps stable fallback", () => {
  const sorted = sortDueReviewsByPriority(
    [
      { ...baseReview, id: "today-medium", scheduled_date: "2026-06-11" },
      {
        ...baseReview,
        id: "old-high",
        scheduled_date: "2026-06-01",
        questions: { ...baseReview.questions, review_priority: "high" },
      },
      { ...baseReview, id: "today-basic", scheduled_date: "2026-06-11", questions: { ...baseReview.questions, difficulty: "基础" } },
    ],
    "2026-06-11",
  );

  assert.deepEqual(
    sorted.map((review) => review.id),
    ["old-high", "today-medium", "today-basic"],
  );
});

test("explains priority as user-facing level and reasons without requiring raw score display", () => {
  const explanation = explainReviewPriorityScore(
    {
      ...baseReview,
      id: "explain",
      scheduled_date: "2026-06-01",
      review_result: "wrong_again",
      questions: {
        ...baseReview.questions,
        difficulty: "较难",
        needs_manual_check: true,
        question_text_status: "needs_fix",
        review_priority: "high",
      },
    },
    "2026-06-11",
  );

  assert.equal(explanation.level, "今日重点");
  assert.ok(explanation.score >= 100);
  assert.ok(explanation.reasons.includes("已逾期"));
  assert.ok(explanation.reasons.includes("又错过"));
  assert.ok(explanation.reasons.includes("需要核对"));
  assert.ok(explanation.reasons.includes("需要修正"));
  assert.ok(explanation.reasons.includes("困难题"));
});
