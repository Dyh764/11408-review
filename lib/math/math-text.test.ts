import assert from "node:assert/strict";
import { test } from "node:test";
import { splitMathText } from "./math-text.ts";

test("splits inline and block LaTeX without dropping normal text", () => {
  const parts = splitMathText("若 $a_n$ 收敛\n$$\\sum_{n=1}^{\\infty} u_n$$\n继续复盘");

  assert.deepEqual(parts, [
    { type: "text", value: "若 " },
    { type: "inlineMath", value: "a_n" },
    { type: "text", value: " 收敛\n" },
    { type: "blockMath", value: "\\sum_{n=1}^{\\infty} u_n" },
    { type: "text", value: "\n继续复盘" },
  ]);
});

test("keeps malformed LaTeX delimiters as plain text", () => {
  assert.deepEqual(splitMathText("这里有 $\\frac{1}{n} 但没闭合"), [
    { type: "text", value: "这里有 $\\frac{1}{n} 但没闭合" },
  ]);
});
