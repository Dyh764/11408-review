import assert from "node:assert/strict";
import { test } from "node:test";

import { buildHomeActionCards } from "./home-actions.ts";
import type { AnalyticsQuestion, AnalyticsReviewResult, TodayLiftFocus } from "./learning-insights.ts";

function question(overrides: Partial<AnalyticsQuestion>): AnalyticsQuestion {
  return {
    id: overrides.id ?? "q-1",
    subject: overrides.subject ?? "操作系统",
    chapter: overrides.chapter ?? "进程与线程",
    knowledge_point: overrides.knowledge_point ?? "进程调度",
    question_text_status: overrides.question_text_status ?? "verified",
    answer_status: overrides.answer_status ?? "verified",
    needs_manual_check: overrides.needs_manual_check ?? false,
    review_priority: overrides.review_priority ?? "medium",
    mastery_status: overrides.mastery_status ?? "有一点思路",
    created_at: overrides.created_at ?? "2026-06-20T10:00:00.000Z",
    ...overrides,
  };
}

test("buildHomeActionCards prioritizes inbox, weak topic, recent wrong question, and review", () => {
  const focus: TodayLiftFocus = {
    questions: [
      question({
        id: "q-focus",
        subject: "操作系统",
        chapter: "进程与线程",
        knowledge_point: "同步与互斥",
      }),
    ],
    weakTopic: {
      topic: "同步与互斥",
      subject: "操作系统",
      chapter: "进程与线程",
      score: 35,
      questionCount: 4,
      recentWrongCount: 2,
      repeatedWrongCount: 2,
      masteredCount: 0,
      qualityIssueCount: 1,
      trend: "up",
      recommendation: "最近仍在反复错，建议今天先开一轮专项复盘。",
      actionHref: "/practice?topic=%E5%90%8C%E6%AD%A5",
    },
    inboxIssue: {
      questionId: "q-inbox",
      severity: "high",
      labels: ["题干需修正"],
      details: ["题干信息不完整"],
      issueTypes: ["question_needs_fix"],
      actionHref: "/questions/q-inbox",
      isAiOnly: false,
    },
    emptyMessage: "暂无明显薄弱点",
  };
  const reviews: AnalyticsReviewResult[] = [
    { question_id: "q-review", review_result: null, completed_at: null },
  ];

  const cards = buildHomeActionCards({
    focus,
    questions: [question({ id: "q-review", review_priority: "high" }), ...focus.questions],
    reviews,
  });

  assert.ok(cards.length >= 2 && cards.length <= 4);
  assert.equal(cards[0].id, "inbox-q-inbox");
  assert.ok(cards.some((card) => card.id === "weak-topic"));
  assert.ok(cards.some((card) => card.id === "recent-q-focus"));
  assert.ok(cards.some((card) => card.id === "review"));
  assert.deepEqual(
    cards.map((card) => card.priority),
    [...cards.map((card) => card.priority)].sort((a, b) => b - a),
  );
});

test("buildHomeActionCards empty state falls back to actionable entries and no static bulletin copy", () => {
  const cards = buildHomeActionCards({
    focus: {
      questions: [],
      weakTopic: null,
      inboxIssue: null,
      emptyMessage: "暂无明显薄弱点",
    },
    questions: [],
    reviews: [],
  });

  assert.equal(cards.length, 2);
  assert.deepEqual(
    cards.map((card) => card.id),
    ["import", "questions"],
  );
  assert.equal(
    cards.some((card) => `${card.title}${card.description}`.includes("公告栏")),
    false,
  );
});
