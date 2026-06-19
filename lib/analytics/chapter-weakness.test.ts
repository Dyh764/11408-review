import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeChapterWeakness } from "./chapter-weakness.ts";

test("analyzeChapterWeakness summarizes frequent 408 knowledge points and mistake types", () => {
  const result = analyzeChapterWeakness([
    {
      knowledge_point: "并发与并行",
      mistake_types: ["概念混淆", "选项陷阱"],
      one_sentence_tip: "先区分宏观同时推进和微观真正同时执行。",
      answer_explanation: "过程：并发强调宏观同时推进，并行强调微观同时执行。",
    },
    {
      knowledge_point: "并发与并行",
      mistake_types: ["概念混淆", "关键词没抓住"],
      one_sentence_tip: "看到同时两个字先判断宏观还是微观。",
      answer_explanation: "过程：题干里的同时不是一定并行。",
    },
    {
      knowledge_point: "操作系统基本特征",
      mistake_types: ["记忆不牢"],
      one_sentence_tip: "共享、虚拟、并发、异步要成组记。",
      answer_explanation: "过程：虚拟是把一个物理实体映射成多个逻辑实体。",
    },
  ]);

  assert.equal(result.total_questions, 3);
  assert.deepEqual(result.frequent_knowledge_points.slice(0, 2), [
    { label: "并发与并行", count: 2 },
    { label: "操作系统基本特征", count: 1 },
  ]);
  assert.deepEqual(result.frequent_mistake_types.slice(0, 2), [
    { label: "概念混淆", count: 2 },
    { label: "选项陷阱", count: 1 },
  ]);
  assert.ok(result.weakness_summary.some((item) => item.includes("并发与并行")));
  assert.ok(result.next_review_suggestions.some((item) => item.includes("概念边界")));
  assert.match(result.one_sentence_diagnosis, /概念边界|高频错因/);
});

test("analyzeChapterWeakness does not invent detail when chapter data is sparse", () => {
  const result = analyzeChapterWeakness([
    {
      knowledge_point: "",
      mistake_types: [],
      one_sentence_tip: "",
      answer_explanation: "",
    },
  ]);

  assert.equal(result.total_questions, 1);
  assert.deepEqual(result.frequent_knowledge_points, []);
  assert.deepEqual(result.frequent_mistake_types, []);
  assert.deepEqual(result.weakness_summary, ["本章错题数量较少，暂时只能做初步判断。"]);
  assert.deepEqual(result.next_review_suggestions, ["先补齐本章错题的知识点、错因和解析，再做稳定的章节判断。"]);
});
