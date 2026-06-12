import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRoundExposureSummary,
  buildQuestionQualityIssues,
  buildWeaknessTrends,
  type AnalyticsQuestion,
  type AnalyticsReviewResult,
} from "./learning-insights.ts";

const baseQuestion: AnalyticsQuestion = {
  id: "q-base",
  subject: "数学",
  chapter: "线性代数",
  knowledge_point: "矩阵秩",
  question_text: "题干",
  standard_answer: "答案",
  answer_explanation: "解析",
  question_text_status: "verified",
  answer_status: "verified",
  needs_manual_check: false,
  review_priority: "medium",
  mastery_status: "有一点思路",
  mistake_types: ["概念混淆"],
  created_at: "2026-06-10T00:00:00.000Z",
};

test("buildWeaknessTrends ranks repeated wrong topics ahead of mastered topics", () => {
  const questions: AnalyticsQuestion[] = [
    {
      ...baseQuestion,
      id: "rank-1",
      knowledge_point: "矩阵秩",
      review_priority: "high",
      needs_manual_check: true,
    },
    {
      ...baseQuestion,
      id: "series-1",
      chapter: "级数",
      knowledge_point: "幂级数收敛半径",
      review_priority: "low",
    },
  ];
  const reviews: AnalyticsReviewResult[] = [
    {
      question_id: "rank-1",
      review_result: "wrong_again",
      completed_at: "2026-06-12T10:00:00.000Z",
    },
    {
      question_id: "rank-1",
      review_result: "still_wrong",
      completed_at: "2026-06-11T10:00:00.000Z",
    },
    {
      question_id: "series-1",
      review_result: "mastered",
      completed_at: "2026-06-12T11:00:00.000Z",
    },
  ];

  const trends = buildWeaknessTrends(questions, reviews, {
    today: "2026-06-12",
    limit: 2,
  });

  assert.deepEqual(
    trends.map((trend) => trend.topic),
    ["矩阵秩", "幂级数收敛半径"],
  );
  assert.equal(trends[0].trend, "up");
  assert.equal(trends[0].repeatedWrongCount, 2);
  assert.match(trends[0].actionHref, /\/practice\?topic=/);
  assert.equal(trends[1].trend, "down");
});

test("buildQuestionQualityIssues classifies missing answers and verification problems", () => {
  const issues = buildQuestionQualityIssues([
    {
      ...baseQuestion,
      id: "needs-fix",
      question_text_status: "needs_fix",
      answer_status: "needs_fix",
      standard_answer: "",
      answer_explanation: "",
    },
    {
      ...baseQuestion,
      id: "uncategorized",
      chapter: "",
      knowledge_point: null,
      question_text_status: "ai_unverified",
      answer_status: "ai_unverified",
    },
  ]);

  assert.deepEqual(
    issues.slice(0, 4).map((issue) => `${issue.questionId}:${issue.type}`),
    [
      "needs-fix:question_needs_fix",
      "needs-fix:answer_needs_fix",
      "needs-fix:missing_answer",
      "uncategorized:missing_knowledge_point",
    ],
  );
  assert.equal(issues[0].severity, "high");
  assert.equal(issues[0].actionHref, "/questions/needs-fix");
  assert.equal(issues.at(-1)?.type, "ai_unverified");
});

test("buildRoundExposureSummary summarizes the current completed review round", () => {
  const summary = buildRoundExposureSummary([
    { question: { ...baseQuestion, id: "q1", knowledge_point: "矩阵秩" }, result: "wrong_again" },
    { question: { ...baseQuestion, id: "q2", knowledge_point: "矩阵秩" }, result: "still_wrong" },
    { question: { ...baseQuestion, id: "q3", knowledge_point: "极限定义" }, result: "mastered" },
  ]);

  assert.equal(summary.exposedTopics[0].topic, "矩阵秩");
  assert.equal(summary.exposedTopics[0].wrongCount, 2);
  assert.equal(summary.masteredCount, 1);
  assert.match(summary.nextActionHref, /\/practice\?topic=/);
});
