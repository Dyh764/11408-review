import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRoundExposureSummary,
  buildQuestionQualityIssues,
  buildQuestionQualitySummary,
  buildWeaknessTrends,
  selectTodayLiftFocus,
  selectHomeFocusTrend,
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

test("selectHomeFocusTrend keeps the homepage to one meaningful focus", () => {
  const quietTrend = {
    topic: "single quiet topic",
    subject: "math",
    chapter: "chapter",
    score: 4,
    questionCount: 1,
    recentWrongCount: 0,
    repeatedWrongCount: 0,
    masteredCount: 0,
    qualityIssueCount: 0,
    trend: "flat" as const,
    recommendation: "保持正常复习节奏。",
    actionHref: "/practice?topic=single",
  };
  const riskyTrend = {
    ...quietTrend,
    topic: "risky topic",
    questionCount: 2,
    recentWrongCount: 1,
    repeatedWrongCount: 1,
    recommendation: "最近仍在反复错，建议今天先开一轮专项复盘。",
  };

  assert.equal(selectHomeFocusTrend([quietTrend]), null);
  assert.equal(selectHomeFocusTrend([quietTrend, riskyTrend])?.topic, "risky topic");
});

test("selectTodayLiftFocus returns three questions one weak topic and one inbox issue", () => {
  const questions: AnalyticsQuestion[] = [
    {
      ...baseQuestion,
      id: "weak-unmastered",
      knowledge_point: "矩阵秩",
      review_priority: "high",
      mastery_status: "瀹屽叏娌℃€濊矾",
    },
    {
      ...baseQuestion,
      id: "recent-wrong",
      knowledge_point: "矩阵秩",
      review_priority: "medium",
    },
    {
      ...baseQuestion,
      id: "inbox",
      knowledge_point: "",
      question_text_status: "needs_fix",
      standard_answer: "",
    },
    {
      ...baseQuestion,
      id: "stable",
      knowledge_point: "稳定知识点",
      review_priority: "low",
      mastery_status: "瀹屽叏鎺屾彙",
    },
  ];
  const reviews: AnalyticsReviewResult[] = [
    { question_id: "recent-wrong", review_result: "wrong_again", completed_at: "2026-06-12T10:00:00.000Z" },
    { question_id: "weak-unmastered", review_result: "still_wrong", completed_at: "2026-06-11T10:00:00.000Z" },
  ];

  const focus = selectTodayLiftFocus(questions, reviews, { today: "2026-06-12" });

  assert.deepEqual(
    focus.questions.map((question) => question.id),
    ["weak-unmastered", "inbox", "recent-wrong"],
  );
  assert.equal(focus.weakTopic?.topic, "矩阵秩");
  assert.equal(focus.inboxIssue?.questionId, "inbox");
  assert.equal(focus.emptyMessage, "暂无明显薄弱点，先完成错题复习");
});

test("buildQuestionQualityIssues hides AI-only verification issues by default", () => {
  const issues = buildQuestionQualityIssues([
    {
      ...baseQuestion,
      id: "chatgpt-confirmed",
      question_text_status: "ai_unverified",
      answer_status: "ai_unverified",
      answer_source: "chatgpt_import",
    },
  ]);

  assert.deepEqual(issues, []);

  const withAiIssues = buildQuestionQualityIssues(
    [
      {
        ...baseQuestion,
        id: "chatgpt-confirmed",
        question_text_status: "ai_unverified",
        answer_status: "ai_unverified",
        answer_source: "chatgpt_import",
      },
    ],
    { includeAiUnverified: true },
  );

  assert.equal(withAiIssues.length, 1);
  assert.equal(withAiIssues[0].type, "ai_unverified");
  assert.equal(withAiIssues[0].severity, "low");
});

test("buildQuestionQualitySummary groups immediate issues by question", () => {
  const summary = buildQuestionQualitySummary([
    {
      ...baseQuestion,
      id: "needs-fix",
      chapter: "",
      knowledge_point: null,
      question_text_status: "needs_fix",
      answer_status: "needs_fix",
      question_text: "broken formula $x_n",
      standard_answer: "",
      answer_explanation: "",
      choices: [{ label: "A", text: "" }],
    },
    {
      ...baseQuestion,
      id: "ai-only",
      question_text_status: "ai_unverified",
      answer_status: "ai_unverified",
      answer_source: "chatgpt_import",
    },
  ]);

  assert.equal(summary.affectedQuestionCount, 1);
  assert.equal(summary.topIssues.length, 1);
  assert.equal(summary.topIssues[0].questionId, "needs-fix");
  assert.ok(summary.topIssues[0].issueTypes.includes("question_needs_fix"));
  assert.ok(summary.topIssues[0].issueTypes.includes("answer_needs_fix"));
  assert.ok(summary.topIssues[0].issueTypes.includes("missing_answer"));
  assert.ok(summary.topIssues[0].issueTypes.includes("missing_chapter"));
  assert.ok(summary.topIssues[0].issueTypes.includes("missing_knowledge_point"));
  assert.ok(summary.topIssues[0].issueTypes.includes("choices_invalid"));
  assert.ok(summary.topIssues[0].issueTypes.includes("math_suspect"));
  assert.equal(summary.severeIssueCount, 1);
  assert.equal(summary.needsFixCount, 1);
  assert.equal(summary.uncategorizedCount, 1);
  assert.equal(summary.aiUnverifiedCount, 1);
});

test("buildQuestionQualitySummary can include AI-only cards after immediate issues", () => {
  const summary = buildQuestionQualitySummary(
    [
      {
        ...baseQuestion,
        id: "missing-answer",
        standard_answer: "",
      },
      {
        ...baseQuestion,
        id: "ai-only",
        question_text_status: "ai_unverified",
        answer_status: "ai_unverified",
        answer_source: "chatgpt_import",
      },
    ],
    { includeAiUnverified: true },
  );

  assert.deepEqual(
    summary.topIssues.map((card) => card.questionId),
    ["missing-answer", "ai-only"],
  );
  assert.equal(summary.topIssues[1].isAiOnly, true);
});

test("buildQuestionQualityIssues classifies immediate missing and fix problems", () => {
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

  assert.ok(issues.some((issue) => `${issue.questionId}:${issue.type}` === "needs-fix:question_needs_fix"));
  assert.ok(issues.some((issue) => `${issue.questionId}:${issue.type}` === "needs-fix:answer_needs_fix"));
  assert.ok(issues.some((issue) => `${issue.questionId}:${issue.type}` === "needs-fix:missing_answer"));
  assert.ok(issues.some((issue) => `${issue.questionId}:${issue.type}` === "uncategorized:missing_chapter"));
  assert.ok(issues.some((issue) => `${issue.questionId}:${issue.type}` === "uncategorized:missing_knowledge_point"));
  assert.equal(issues.find((issue) => issue.questionId === "needs-fix")?.severity, "high");
  assert.equal(issues.find((issue) => issue.questionId === "needs-fix")?.actionHref, "/questions/needs-fix");
  assert.ok(!issues.some((issue) => issue.type === "ai_unverified"));
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
