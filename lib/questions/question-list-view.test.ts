import assert from "node:assert/strict";
import { test } from "node:test";
import { groupQuestionsBySubjectAndDifficulty } from "./question-list-view.ts";

const baseQuestion = {
  id: "q",
  subject: "数学",
  difficulty: null,
  created_at: "2026-06-01T08:00:00.000Z",
};

test("groups questions by subject even when there is only one subject", () => {
  const groups = groupQuestionsBySubjectAndDifficulty([
    { ...baseQuestion, id: "math-1", subject: "数学" },
    { ...baseQuestion, id: "math-2", subject: "数学" },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].subject, "数学");
  assert.equal(groups[0].count, 2);
});

test("sorts each subject by difficulty then newest created time", () => {
  const groups = groupQuestionsBySubjectAndDifficulty([
    {
      ...baseQuestion,
      id: "math-medium-old",
      subject: "数学",
      difficulty: "中等",
      created_at: "2026-06-01T08:00:00.000Z",
    },
    {
      ...baseQuestion,
      id: "math-basic",
      subject: "数学",
      difficulty: "基础",
      created_at: "2026-06-02T08:00:00.000Z",
    },
    {
      ...baseQuestion,
      id: "math-unmarked",
      subject: "数学",
      difficulty: null,
      created_at: "2026-06-07T08:00:00.000Z",
    },
    {
      ...baseQuestion,
      id: "math-medium-new",
      subject: "数学",
      difficulty: "中等",
      created_at: "2026-06-06T08:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    groups[0].items.map((question) => question.id),
    ["math-basic", "math-medium-new", "math-medium-old", "math-unmarked"],
  );
});

test("keeps subject groups independent while preserving subject encounter order", () => {
  const groups = groupQuestionsBySubjectAndDifficulty([
    { ...baseQuestion, id: "math", subject: "数学", difficulty: "压轴" },
    { ...baseQuestion, id: "network", subject: "计算机网络", difficulty: "基础" },
  ]);

  assert.deepEqual(
    groups.map((group) => group.subject),
    ["数学", "计算机网络"],
  );
});
