import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractChoicesFromQuestionText,
  normalizeChoices,
  splitQuestionTextAndChoices,
} from "./extract-choices.ts";

test("normalizes explicit choices and trims invalid rows", () => {
  assert.deepEqual(
    normalizeChoices([
      { label: "a", text: "  选项 A  " },
      { label: "B", text: "" },
      { label: "E", text: "跳过" },
      { label: "C", text: "$\\sum u_n$ 收敛" },
    ]),
    [
      { label: "A", text: "选项 A" },
      { label: "C", text: "$\\sum u_n$ 收敛" },
    ],
  );
});

test("extracts A/B/C/D choices from question text only when multiple markers exist", () => {
  const result = splitQuestionTextAndChoices(
    "设数列为正项数列，下列选项正确的是（ ）。A. 若级数收敛 B．若交错级数收敛 C、若子级数收敛 D：若部分和有界",
  );

  assert.equal(result.questionText, "设数列为正项数列，下列选项正确的是（ ）。");
  assert.deepEqual(result.choices, [
    { label: "A", text: "若级数收敛" },
    { label: "B", text: "若交错级数收敛" },
    { label: "C", text: "若子级数收敛" },
    { label: "D", text: "若部分和有界" },
  ]);
});

test("does not split ordinary text that contains isolated option letters", () => {
  const result = splitQuestionTextAndChoices("集合 A 与集合 B 的关系是什么？");

  assert.equal(result.questionText, "集合 A 与集合 B 的关系是什么？");
  assert.deepEqual(result.choices, []);
});

test("prefers explicit choices over parsing question text", () => {
  assert.deepEqual(
    extractChoicesFromQuestionText("题干 A. 旧选项 B. 旧选项", [
      { label: "B", text: "显式选项" },
    ]),
    [{ label: "B", text: "显式选项" }],
  );
});
