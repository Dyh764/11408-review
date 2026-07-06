import assert from "node:assert/strict";
import { test } from "node:test";
import { filterPracticeQuestions, type PracticeQuestion } from "./practice-catalog.ts";

const baseQuestion: PracticeQuestion = {
  id: "q",
  subject: "数学",
  chapter: "极限",
  knowledge_point: "等价无穷小",
  difficulty: "中等",
  mastery_status: "有一点思路",
  question_text_status: "verified",
  answer_status: "verified",
  needs_manual_check: false,
  review_priority: "medium",
  mistake_types: [],
  priority_score: 40,
};

test("filterPracticeQuestions recognizes real UTF-8 408 subjects", () => {
  const questions = [
    { ...baseQuestion, id: "math", subject: "数学", choices: [{ label: "A", text: "1" }], priority_score: 100 },
    { ...baseQuestion, id: "ds", subject: "数据结构", choices: [{ label: "A", text: "1" }], priority_score: 80 },
    {
      ...baseQuestion,
      id: "co",
      subject: "计算机组成原理",
      choices: [{ label: "A", text: "1" }],
      priority_score: 70,
    },
    { ...baseQuestion, id: "os", subject: "操作系统", choices: [{ label: "A", text: "1" }], priority_score: 60 },
    { ...baseQuestion, id: "net", subject: "计算机网络", choices: [{ label: "A", text: "1" }], priority_score: 50 },
    { ...baseQuestion, id: "os-text", subject: "操作系统", choices: [], priority_score: 90 },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "exam408-choice" }).map((question) => question.id),
    ["ds", "co", "os", "net"],
  );
  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "exam408-choice", subject: "操作系统" }).map(
      (question) => question.id,
    ),
    ["os"],
  );
});
