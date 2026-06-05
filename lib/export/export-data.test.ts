import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCsvExport,
  buildJsonExport,
  buildMarkdownExport,
  exportFileName,
  type ExportDataset,
} from "./export-data.ts";

const dataset: ExportDataset = {
  exported_at: "2026-06-04T10:00:00.000Z",
  user_id: "user-1",
  questions: [
    {
      id: "q1",
      user_id: "user-1",
      subject: "数学",
      chapter: "二重积分",
      knowledge_point: "极坐标换元",
      difficulty: "中等",
      image_path: "users/user-1/questions/q1.jpg",
      question_text: "求二重积分。",
      question_text_status: "verified",
      mastery_status: "完全没思路",
      user_note: "区域没画对",
      mistake_types: ["审题", "积分区域"],
      solution_summary: "先画区域，再换元。",
      standard_answer: "最终答案",
      answer_explanation: "完整解析",
      key_steps: ["画区域", "换元"],
      answer_status: "verified",
      answer_source: "chatgpt_import",
      one_sentence_tip: "先画图再换元。",
      review_priority: "high",
      confidence: "high",
      needs_manual_check: false,
      created_at: "2026-06-01T12:00:00.000Z",
      analyzed_at: "2026-06-01T12:10:00.000Z",
    },
  ],
  reviews: [
    {
      id: "r1",
      user_id: "user-1",
      question_id: "q1",
      scheduled_date: "2026-06-04",
      completed_at: null,
      review_result: null,
      created_at: "2026-06-01T12:00:00.000Z",
    },
  ],
  reports: [],
  knowledge_stats: [
    {
      id: "k1",
      user_id: "user-1",
      subject: "数学",
      chapter: "二重积分",
      knowledge_point: "极坐标换元",
      wrong_count: 1,
      no_idea_count: 1,
      stuck_count: 0,
      repeated_wrong_count: 0,
      failed_review_count: 0,
      overdue_review_count: 0,
      mastered_count: 0,
      weakness_score: 7,
      updated_at: "2026-06-04T10:00:00.000Z",
    },
  ],
};

test("builds dated export file names", () => {
  assert.equal(
    exportFileName("json", new Date("2026-06-04T10:00:00+08:00"), "Asia/Shanghai"),
    "11408-review-export-2026-06-04.json",
  );
});

test("builds JSON export as a complete backup payload", () => {
  const json = JSON.parse(buildJsonExport(dataset)) as ExportDataset;

  assert.equal(json.questions[0].image_path, "users/user-1/questions/q1.jpg");
  assert.equal(json.reviews[0].question_id, "q1");
  assert.equal(json.knowledge_stats[0].weakness_score, 7);
});

test("builds readable markdown grouped by subject and chapter", () => {
  const markdown = buildMarkdownExport(dataset);

  assert.match(markdown, /# 11408 错题导出/);
  assert.match(markdown, /## 数学 - 二重积分/);
  assert.match(markdown, /- 题目图片：users\/user-1\/questions\/q1.jpg/);
  assert.match(markdown, /- 复习记录：2026-06-04 未完成/);
});

test("builds CSV with Excel-friendly core question columns", () => {
  const csv = buildCsvExport(dataset);

  assert.match(csv, /^id,subject,chapter,knowledge_point,difficulty,mastery_status/);
  assert.match(csv, /q1,数学,二重积分,极坐标换元,中等,完全没思路/);
});
