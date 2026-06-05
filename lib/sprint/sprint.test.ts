import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSprintItems, type SprintQuestionInput } from "./sprint.ts";

const baseQuestion: SprintQuestionInput = {
  id: "q-base",
  subject: "数学",
  chapter: "函数",
  knowledge_point: "极限",
  difficulty: null,
  image_path: "users/user-1/questions/q-base.jpg",
  question_text: "求函数极限。",
  source: "upload",
  question_text_status: "ai_unverified",
  mastery_status: "有一点思路",
  mistake_types: [],
  standard_answer: null,
  answer_explanation: null,
  key_steps: [],
  answer_status: "ai_unverified",
  answer_source: "unknown",
  one_sentence_tip: null,
  review_priority: "medium",
  needs_manual_check: false,
  created_at: "2026-05-01T00:00:00.000Z",
  signedImageUrl: null,
};

test("prioritizes wrong-again and still-wrong reviews before generic weak questions", () => {
  const items = buildSprintItems({
    now: new Date("2026-06-04T08:00:00+08:00"),
    questions: [
      { ...baseQuestion, id: "weak", knowledge_point: "普通薄弱点", review_priority: "high" },
      { ...baseQuestion, id: "wrong-again", knowledge_point: "反复错" },
      { ...baseQuestion, id: "still-wrong", knowledge_point: "仍不会" },
    ],
    reviews: [
      {
        id: "r1",
        question_id: "still-wrong",
        scheduled_date: "2026-06-01",
        completed_at: "2026-06-01T12:00:00.000Z",
        review_result: "still_wrong",
      },
      {
        id: "r2",
        question_id: "wrong-again",
        scheduled_date: "2026-06-02",
        completed_at: "2026-06-02T12:00:00.000Z",
        review_result: "wrong_again",
      },
    ],
    stats: [],
  });

  assert.equal(items[0].question.id, "wrong-again");
  assert.equal(items[0].reasons[0], "复习后又错");
  assert.equal(items[1].question.id, "still-wrong");
});

test("includes manual-check, no-idea, overdue, unstable and 30-day unmastered reasons", () => {
  const items = buildSprintItems({
    now: new Date("2026-06-04T08:00:00+08:00"),
    questions: [
      {
        ...baseQuestion,
        id: "risk",
        mastery_status: "完全没思路",
        question_text_status: "needs_fix",
        needs_manual_check: true,
        created_at: "2026-04-20T00:00:00.000Z",
      },
    ],
    reviews: [
      {
        id: "r-overdue",
        question_id: "risk",
        scheduled_date: "2026-06-01",
        completed_at: null,
        review_result: null,
      },
    ],
    stats: [],
  });

  assert.deepEqual(items[0].reasons.slice(0, 5), [
    "完全没思路",
    "逾期 3 天",
    "needs_manual_check",
    "题干需修正",
    "超过 30 天仍未掌握",
  ]);
});
