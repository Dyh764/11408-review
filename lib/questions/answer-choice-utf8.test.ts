import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAnswerChoiceLabels } from "./answer-choice.ts";

test("parseAnswerChoiceLabels handles common imported 408 answer formats", () => {
  assert.deepEqual(parseAnswerChoiceLabels("答案：B"), { labels: ["B"], isMultiple: false });
  assert.deepEqual(parseAnswerChoiceLabels("正确答案：AC"), { labels: ["A", "C"], isMultiple: true });
  assert.deepEqual(parseAnswerChoiceLabels("标准答案为 D。"), { labels: ["D"], isMultiple: false });
  assert.deepEqual(parseAnswerChoiceLabels("本题选 A、D"), { labels: ["A", "D"], isMultiple: true });
  assert.deepEqual(parseAnswerChoiceLabels("C"), { labels: ["C"], isMultiple: false });
});

test("parseAnswerChoiceLabels does not extract incidental option letters from explanations", () => {
  assert.deepEqual(parseAnswerChoiceLabels("解析里提到 A 类地址和 B 类地址"), {
    labels: [],
    isMultiple: false,
  });
});
