import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getConfidenceLabel,
  getAnswerSourceLabel,
  getAnswerStatusLabel,
  getQuestionSourceLabel,
  getQuestionTextStatusLabel,
  getReviewPriorityLabel,
} from "./meta-labels.ts";

test("maps question text status enum values to user-facing labels", () => {
  assert.equal(getQuestionTextStatusLabel("ai_unverified"), "题目待核对");
  assert.equal(getQuestionTextStatusLabel("verified"), "题目已核对");
  assert.equal(getQuestionTextStatusLabel("needs_fix"), "题目需修正");
});

test("maps answer metadata enum values to user-facing labels", () => {
  assert.equal(getAnswerStatusLabel("ai_unverified"), "答案待核对");
  assert.equal(getAnswerStatusLabel("verified"), "答案已核对");
  assert.equal(getAnswerStatusLabel("needs_fix"), "答案需修正");
  assert.equal(getAnswerSourceLabel("chatgpt_import"), "ChatGPT 整理");
  assert.equal(getAnswerSourceLabel("manual"), "手动录入");
  assert.equal(getAnswerSourceLabel("ai_enhanced"), "AI 增强");
  assert.equal(getAnswerSourceLabel("unknown"), "来源未知");
});

test("maps question source enum values to user-facing labels", () => {
  assert.equal(getQuestionSourceLabel("chatgpt_import"), "ChatGPT 整理");
  assert.equal(getQuestionSourceLabel("pending_chatgpt"), "待 ChatGPT 整理");
  assert.equal(getQuestionSourceLabel("ai_analysis"), "AI 自动分析");
  assert.equal(getQuestionSourceLabel("manual"), "手动录入");
});

test("maps priority and confidence enum values to user-facing labels", () => {
  assert.equal(getReviewPriorityLabel("high"), "高优先级");
  assert.equal(getReviewPriorityLabel("medium"), "中优先级");
  assert.equal(getReviewPriorityLabel("low"), "低优先级");
  assert.equal(getConfidenceLabel("high"), "可信度高");
  assert.equal(getConfidenceLabel("medium"), "可信度中");
  assert.equal(getConfidenceLabel("low"), "可信度低");
});
