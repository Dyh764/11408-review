import assert from "node:assert/strict";
import { test } from "node:test";
import { sortQuestionsForChapterList } from "./question-sort.ts";

const baseQuestion = {
  id: "base",
  difficulty: null,
  mastery_status: "有一点思路",
  question_text_status: "verified",
  answer_status: "verified",
  needs_manual_check: false,
  review_priority: "medium",
  priority_score: 0,
  created_at: "2026-01-01T00:00:00.000Z",
};

test("sortQuestionsForChapterList orders difficult questions before medium, simple, and unlabeled", () => {
  const sorted = sortQuestionsForChapterList([
    { ...baseQuestion, id: "medium", difficulty: "中等" },
    { ...baseQuestion, id: "unlabeled", difficulty: null },
    { ...baseQuestion, id: "simple", difficulty: "基础" },
    { ...baseQuestion, id: "hard", difficulty: "困难" },
    { ...baseQuestion, id: "also-hard", difficulty: "较难" },
  ]);

  assert.deepEqual(sorted.map((question) => question.id), [
    "hard",
    "also-hard",
    "medium",
    "simple",
    "unlabeled",
  ]);
});

test("sortQuestionsForChapterList prioritizes fix, manual-check, due, risk, score, then stable date", () => {
  const sorted = sortQuestionsForChapterList(
    [
      { ...baseQuestion, id: "score-low", difficulty: "中等", priority_score: 10 },
      { ...baseQuestion, id: "score-high", difficulty: "中等", priority_score: 90 },
      { ...baseQuestion, id: "mastered", difficulty: "中等", mastery_status: "完全掌握", priority_score: 100 },
      { ...baseQuestion, id: "due", difficulty: "中等", priority_score: 20 },
      { ...baseQuestion, id: "manual", difficulty: "中等", needs_manual_check: true },
      { ...baseQuestion, id: "fix", difficulty: "中等", question_text_status: "needs_fix" },
      { ...baseQuestion, id: "wrong", difficulty: "中等", review_result: "wrong_again" },
      { ...baseQuestion, id: "older", difficulty: "中等", created_at: "2025-12-01T00:00:00.000Z" },
    ],
    { dueTodayIds: new Set(["due"]) },
  );

  assert.deepEqual(sorted.map((question) => question.id), [
    "fix",
    "manual",
    "due",
    "wrong",
    "score-high",
    "score-low",
    "older",
    "mastered",
  ]);
});
