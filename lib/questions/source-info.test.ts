import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuestionSourceStats,
  getQuestionSourceInfo,
  normalizeQuestionSourceInfo,
} from "./source-info.ts";

test("normalizeQuestionSourceInfo returns a complete unmarked fallback", () => {
  assert.deepEqual(normalizeQuestionSourceInfo(null), {
    type: "未标来源",
    name: "未标来源",
    section: "",
    volume: "",
    paper: "",
    page: "",
    problem_number: "",
    raw: "未标来源",
  });
});

test("normalizeQuestionSourceInfo converts string sources into structured source info", () => {
  const source = normalizeQuestionSourceInfo("李林6套卷-第2套-高数");

  assert.equal(source.type, "模拟卷");
  assert.equal(source.name, "李林6套卷");
  assert.equal(source.paper, "第2套");
  assert.equal(source.section, "高等数学");
  assert.equal(source.raw, "李林6套卷-第2套-高数");
});

test("getQuestionSourceInfo reads source_info and falls back without reusing ingestion source", () => {
  assert.equal(
    getQuestionSourceInfo({ source: "chatgpt_import", source_info: null }).name,
    "未标来源",
  );
  assert.equal(
    getQuestionSourceInfo({ source_info: { type: "真题", name: "数一真题", raw: "2024数一" } }).name,
    "数一真题",
  );
});

test("buildQuestionSourceStats groups source info without inventing wrong-rate fields", () => {
  const stats = buildQuestionSourceStats([
    {
      id: "q1",
      source_info: { type: "练习册", name: "武忠祥严选题", section: "高等数学", raw: "武忠祥" },
      chapter: "三重积分",
      mistake_types: ["积分限设置错误"],
      created_at: "2026-06-18T08:00:00.000Z",
    },
    {
      id: "q2",
      source_info: { type: "练习册", name: "武忠祥严选题", section: "高等数学", raw: "武忠祥" },
      chapter: "无穷级数",
      mistake_types: ["换元漏雅可比", "积分限设置错误"],
      created_at: "2026-06-17T08:00:00.000Z",
    },
    {
      id: "q3",
      source_info: null,
      chapter: "",
      mistake_types: [],
      created_at: "2026-06-16T08:00:00.000Z",
    },
  ]);

  assert.equal(stats.length, 2);
  assert.equal(stats[0].name, "武忠祥严选题");
  assert.equal(stats[0].total_questions, 2);
  assert.equal(stats[0].wrong_questions, 2);
  assert.deepEqual(stats[0].weak_chapters, ["三重积分", "无穷级数"]);
  assert.deepEqual(stats[0].frequent_mistake_types, ["积分限设置错误", "换元漏雅可比"]);
  assert.equal(stats[0].latest_added_at, "2026-06-18T08:00:00.000Z");
  assert.equal("wrong_rate" in stats[0], false);
  assert.equal(stats[1].name, "未标来源");
});
