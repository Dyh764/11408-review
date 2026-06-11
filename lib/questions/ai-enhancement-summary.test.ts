import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAiEnhancementSummary } from "./ai-enhancement-summary.ts";

test("summarizes changed AI enhancement fields without exposing protected fields", () => {
  const summary = buildAiEnhancementSummary(
    {
      chapter: "幂级数",
      knowledge_point: "幂级数",
      mistake_types: ["计算粗心"],
      solution_summary: "先求通项。",
      one_sentence_tip: "先看通项。",
      review_priority: "medium",
      confidence: "low",
      needs_manual_check: true,
    },
    {
      chapter: "幂级数",
      knowledge_point: "幂级数收敛半径、比值法",
      mistake_types: ["计算粗心", "概念混淆"],
      solution_summary: "先用比值法求收敛半径。",
      one_sentence_tip: "先判断收敛半径再看端点。",
      review_priority: "high",
      confidence: "medium",
      needs_manual_check: false,
    },
  );

  assert.equal(summary.changedCount, 7);
  assert.ok(summary.items.includes("知识点：从“幂级数”改为“幂级数收敛半径、比值法”"));
  assert.ok(summary.items.includes("错因：新增“概念混淆”"));
  assert.ok(summary.items.includes("一句话提醒：已更新"));
  assert.match(summary.title, /AI 已优化 7 项/);
});

test("reports no visible AI enhancement change when fields stay equivalent", () => {
  const summary = buildAiEnhancementSummary(
    {
      chapter: "幂级数",
      knowledge_point: "幂级数",
      mistake_types: ["概念混淆"],
      solution_summary: "先看定义。",
      one_sentence_tip: "先看定义。",
      review_priority: "medium",
      confidence: "medium",
      needs_manual_check: true,
    },
    {
      chapter: "幂级数",
      knowledge_point: "幂级数",
      mistake_types: ["概念混淆"],
      solution_summary: "先看定义。",
      one_sentence_tip: "先看定义。",
      review_priority: "medium",
      confidence: "medium",
      needs_manual_check: true,
    },
  );

  assert.equal(summary.changedCount, 0);
  assert.deepEqual(summary.items, []);
  assert.equal(summary.title, "AI 已检查题卡，未发现需要明显修改的字段。");
});
