import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAnswerChoiceLabels } from "./answer-choice.ts";

test("parses single and multiple answer labels", () => {
  assert.deepEqual(parseAnswerChoiceLabels("答案：A"), { labels: ["A"], isMultiple: false });
  assert.deepEqual(parseAnswerChoiceLabels("答案：A、C"), { labels: ["A", "C"], isMultiple: true });
  assert.deepEqual(parseAnswerChoiceLabels("答案：AC"), { labels: ["A", "C"], isMultiple: true });
  assert.deepEqual(parseAnswerChoiceLabels("答案：A 和 C"), { labels: ["A", "C"], isMultiple: true });
});

test("returns empty labels when answer cannot be identified", () => {
  assert.deepEqual(parseAnswerChoiceLabels("详见解析"), { labels: [], isMultiple: false });
});
