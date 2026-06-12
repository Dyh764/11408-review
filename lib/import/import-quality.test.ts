import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyInboxDefaults,
  getImportQualityReport,
} from "./import-quality.ts";
import type {
  ImportParseResult,
  ImportQuestionCard,
} from "./import-schema.ts";

function cardFromRow(row: Record<string, unknown>): ImportQuestionCard {
  return {
    subject: (row.subject as ImportQuestionCard["subject"]) ?? "数学",
    chapter: typeof row.chapter === "string" && row.chapter ? row.chapter : undefined,
    knowledge_point:
      typeof row.knowledge_point === "string" && row.knowledge_point
        ? row.knowledge_point
        : undefined,
    difficulty: row.difficulty as ImportQuestionCard["difficulty"],
    question_text: row.question_text as string,
    choices: Array.isArray(row.choices)
      ? (row.choices as ImportQuestionCard["choices"]).filter(
          (choice) => typeof choice.label === "string" && typeof choice.text === "string",
        )
      : [],
    question_text_status: "ai_unverified",
    mastery_status: (row.mastery_status as ImportQuestionCard["mastery_status"]) ?? "有一点思路",
    user_note: row.user_note as string,
    mistake_types: (row.mistake_types as string[]) ?? [],
    standard_answer: row.standard_answer as string,
    answer_explanation: row.answer_explanation as string,
    key_steps: (row.key_steps as string[]) ?? [],
    review_priority: (row.review_priority as ImportQuestionCard["review_priority"]) ?? "medium",
    needs_manual_check: Boolean(row.needs_manual_check),
    source: "chatgpt_import",
    answer_status: (row.answer_status as ImportQuestionCard["answer_status"]) ?? "ai_unverified",
    answer_source:
      (row.answer_source as ImportQuestionCard["answer_source"]) ?? "chatgpt_import",
  };
}

function parseSingle(row: Record<string, unknown>): ImportParseResult {
  return {
    cards: [{ index: 1, card: cardFromRow(row), raw: row }],
    errors: [],
  };
}

const validRow = {
  subject: "数学",
  chapter: "级数",
  knowledge_point: "幂级数收敛半径",
  difficulty: "中等",
  question_text: "若 $\\sum a_n x^n$ 的收敛半径为 $R$，求 $R$。",
  choices: [
    { label: "A", text: "$1$" },
    { label: "B", text: "$2$" },
  ],
  mastery_status: "有一点思路",
  user_note: "比值法没拆清楚。",
  mistake_types: ["概念混淆"],
  standard_answer: "答案：B",
  answer_explanation: "过程：使用比值法。",
  key_steps: ["写出比值"],
  review_priority: "high",
  needs_manual_check: false,
  answer_status: "verified",
  answer_source: "chatgpt_import",
};

test("import quality report flags missing fields and recommends inbox without blocking import", () => {
  const parsed = parseSingle({
    ...validRow,
    chapter: "",
    knowledge_point: "",
    difficulty: "",
    standard_answer: "B",
    answer_explanation: "使用比值法。",
  });

  const report = getImportQualityReport(parsed);

  assert.equal(report.totalCount, 1);
  assert.equal(report.importableCount, 1);
  assert.equal(report.inboxRecommendedCount, 1);
  assert.equal(report.seriousCount, 0);
  assert.deepEqual(
    report.rows[0].issues.map((issue) => issue.label),
    [
      "缺少章节",
      "缺少知识点",
      "缺少难度",
      "标准答案建议以“答案：”开头",
      "解析建议以“过程：”开头",
      "建议进入待整理",
    ],
  );
});

test("import quality report blocks rows with parser errors and detects formula risks", () => {
  const parsed: ImportParseResult = {
    cards: [
      {
        index: 1,
        card: cardFromRow({ ...validRow, question_text: "未闭合公式 $x_n", choices: "A. 错误" }),
        raw: { ...validRow, question_text: "未闭合公式 $x_n", choices: "A. 错误" },
      },
    ],
    errors: [{ index: 2, message: "每条错题卡必须是 JSON object。" }],
  };

  const report = getImportQualityReport(parsed);

  assert.equal(report.totalCount, 2);
  assert.equal(report.importableCount, 1);
  assert.equal(report.seriousCount, 1);
  assert.ok(report.rows[0].issues.some((issue) => issue.label === "公式可能未闭合"));
  assert.ok(report.rows[0].issues.some((issue) => issue.label === "choices 格式异常"));
  assert.ok(report.rows[1].issues.some((issue) => issue.severity === "error"));
});

test("applyInboxDefaults reuses existing fields instead of requiring a schema change", () => {
  const card = parseSingle({
    ...validRow,
    chapter: "",
    standard_answer: "B",
  }).cards[0].card as ImportQuestionCard;

  const inboxCard = applyInboxDefaults(card, ["缺少章节", "标准答案格式异常"]);

  assert.equal(inboxCard.chapter, "待整理");
  assert.equal(inboxCard.needs_manual_check, true);
  assert.equal(inboxCard.question_text_status, "needs_fix");
  assert.equal(inboxCard.answer_status, "needs_fix");
  assert.equal(inboxCard.review_priority, "high");
  assert.deepEqual(inboxCard.mistake_types, [
    "概念混淆",
    "待整理：缺少章节",
    "待整理：标准答案格式异常",
  ]);
});

test("import quality report suggests common ChatGPT taxonomy mappings", () => {
  const parsed = parseSingle({
    ...validRow,
    subject: "数学",
    chapter: "高等数学-多元函数积分学",
    difficulty: "较难",
  });

  const report = getImportQualityReport(parsed);
  const labels = report.rows[0].issues.map((issue) => issue.label);

  assert.ok(labels.includes("检测到 difficulty = 较难：建议自动映射为 困难。"));
  assert.ok(labels.includes("检测到 subject = 数学 且 chapter 包含高等数学：建议映射为 subject = 高等数学。"));
  assert.ok(
    labels.includes(
      "检测到 chapter = 高等数学-多元函数积分学：建议拆成 subject = 高等数学，chapter = 多元函数积分学。",
    ),
  );
});

test("import quality report shows automatic enum mapping notes", () => {
  const parsed = parseSingle({
    ...validRow,
    subject: "高等数学",
    chapter: "多元函数积分学",
    difficulty: "困难",
    mastery_status: "已理解但需复习",
    review_priority: "高",
    confidence: "高",
  });
  parsed.cards[0].card = {
    ...parsed.cards[0].card,
    subject: "数学",
    chapter: "高等数学-多元函数积分学",
    difficulty: "较难",
    mastery_status: "做对但不稳",
    review_priority: "high",
    confidence: "high",
  };

  const report = getImportQualityReport(parsed);
  const labels = report.rows[0].issues.map((issue) => issue.label);

  assert.ok(
    labels.includes(
      "已自动映射 subject = 高等数学：导入为 subject = 数学，chapter = 高等数学-多元函数积分学。",
    ),
  );
  assert.ok(labels.includes("已自动映射 difficulty = 困难 -> 较难。"));
  assert.ok(labels.includes("已自动映射 mastery_status = 已理解但需复习 -> 做对但不稳。"));
  assert.ok(labels.includes("已自动映射 review_priority = 高 -> high。"));
  assert.ok(labels.includes("已自动映射 confidence = 高 -> high。"));
});
