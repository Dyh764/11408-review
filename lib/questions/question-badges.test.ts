import assert from "node:assert/strict";
import { test } from "node:test";
import { buildQuestionBadges } from "./question-badges.ts";

const baseQuestion = {
  id: "q",
  difficulty: "中等难度",
  question_text_status: "verified",
  answer_status: "verified",
  needs_manual_check: false,
  choices: [],
};

test("buildQuestionBadges normalizes duplicate difficulty and attention labels", () => {
  const badges = buildQuestionBadges({
    ...baseQuestion,
    question_text_status: "needs_fix",
    answer_status: "needs_fix",
    needs_manual_check: true,
  }, {
    reviewStatus: "overdue",
    questionKind: "文字题",
    extraLabels: ["已逾期", "中等", "需要核对", "需核对", "需要修正", "薄弱章节"],
  });

  assert.deepEqual(badges.map((badge) => badge.label), [
    "已逾期",
    "中等",
    "需修正",
    "文字题",
  ]);
});

test("buildQuestionBadges keeps at most four badges in fixed priority order", () => {
  const badges = buildQuestionBadges({
    ...baseQuestion,
    difficulty: "困难",
    choices: [{ label: "A", text: "1" }],
    needs_manual_check: true,
  }, {
    reviewStatus: "due_today",
    questionKind: "选择题",
    extraLabels: ["高优先级", "今日重点", "需要核对"],
  });

  assert.deepEqual(badges.map((badge) => badge.label), [
    "今日待复习",
    "困难",
    "需核对",
    "选择题",
  ]);
  assert.equal(badges.length, 4);
});
