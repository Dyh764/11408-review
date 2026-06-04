import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAnalysisUpdatePayload } from "./analysis-update.ts";

const analysis = {
  question_text: "AI 新题干",
  question_text_status: "ai_unverified" as const,
  subject: "数据结构" as const,
  chapter: "树",
  knowledge_point: "递归遍历",
  mistake_types: ["递归"],
  solution_summary: "先定义递归出口。",
  one_sentence_tip: "出口先写清楚。",
  review_priority: "high" as const,
  confidence: "medium" as const,
  needs_manual_check: true,
};

test("preserves verified question text unless overwrite is explicitly allowed", () => {
  const payload = buildAnalysisUpdatePayload(
    {
      question_text: "人工核对题干",
      question_text_status: "verified",
    },
    analysis,
    false,
  );

  assert.equal(payload.question_text, "人工核对题干");
  assert.equal(payload.question_text_status, "verified");
  assert.equal(payload.chapter, "树");
  assert.equal(payload.needs_manual_check, true);
});

test("overwrites question text when explicitly allowed", () => {
  const payload = buildAnalysisUpdatePayload(
    {
      question_text: "人工核对题干",
      question_text_status: "verified",
    },
    analysis,
    true,
  );

  assert.equal(payload.question_text, "AI 新题干");
  assert.equal(payload.question_text_status, "ai_unverified");
});
