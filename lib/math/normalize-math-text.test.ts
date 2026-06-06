import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeMathText } from "./normalize-math-text.ts";

test("wraps and normalizes obvious half-LaTeX fragments", () => {
  assert.equal(
    normalizeMathText("若 sum_{n=1}^{infty} u_n 收敛"),
    "若 $\\sum_{n=1}^{\\infty} u_n$ 收敛",
  );
  assert.equal(normalizeMathText("计算 frac{1}{n} 与 sqrt{x}"), "计算 $\\frac{1}{n}$ 与 $\\sqrt{x}$");
});

test("does not double-normalize already valid LaTeX", () => {
  assert.equal(
    normalizeMathText("若 $\\sum_{n=1}^{\\infty} u_n$ 收敛"),
    "若 $\\sum_{n=1}^{\\infty} u_n$ 收敛",
  );
});
