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

test("treats escaped dollar delimiters from imported JSON as real math", () => {
  assert.deepEqual(splitMathText("\\$1^\\infty\\$ 型极限；取对数"), [
    { type: "inlineMath", value: "1^\\infty" },
    { type: "text", value: " 型极限；取对数" },
  ]);
});

test("wraps common bare math fragments without showing raw LaTeX", () => {
  assert.deepEqual(splitMathText("求极限 lim_{n->\\infty} tan^n(π/4 + 2/n)。"), [
    { type: "text", value: "求极限 " },
    { type: "inlineMath", value: "\\lim_{n->\\infty}" },
    { type: "text", value: " " },
    { type: "inlineMath", value: "\\tan^n(π/4 + 2/n)" },
    { type: "text", value: "。" },
  ]);
});

test("keeps bare trigonometric arguments inside the generated math segment", () => {
  const parts = splitMathText("求极限 lim_{n->\\infty} tan^n(\\pi/4 + 2/n)。");
  const renderedMath = parts
    .filter((part) => part.type === "inlineMath")
    .map((part) => part.value)
    .join(" ");
  const renderedText = parts
    .filter((part) => part.type === "text")
    .map((part) => part.value)
    .join(" ");

  assert.match(renderedMath, /\\tan\^n\(\\pi\/4 \+ 2\/n\)/);
  assert.doesNotMatch(renderedText, /\\pi/);
});
