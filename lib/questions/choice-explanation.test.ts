import assert from "node:assert/strict";
import { test } from "node:test";
import { parseChoiceExplanations } from "./choice-explanation.ts";

test("splits semicolon-delimited A/B/C/D explanations", () => {
  const result = parseChoiceExplanations(
    "过程：A 错在把程序当成进程；B 错在缺少运行状态；C 正确，是程序和数据的组合；D 错在忽略数据。",
  );

  assert.equal(result.complete, true);
  assert.equal(result.explanationsByLabel.A, "错在把程序当成进程");
  assert.match(result.explanationsByLabel.C, /正确/);
  assert.match(result.explanationsByLabel.D, /忽略数据/);
});

test("supports colon, dot, option-prefix, and newline formats", () => {
  const result = parseChoiceExplanations(
    "过程：A：第一项错误\nB. 第二项错误\n选项C正确\n选项 D 项：第四项错误",
  );

  assert.equal(result.complete, true);
  assert.equal(result.explanationsByLabel.A, "第一项错误");
  assert.equal(result.explanationsByLabel.B, "第二项错误");
  assert.equal(result.explanationsByLabel.C, "正确");
  assert.equal(result.explanationsByLabel.D, "第四项错误");
});

test("keeps incomplete legacy explanations on the general fallback path", () => {
  const result = parseChoiceExplanations("过程：根据进程映像的定义可知答案为 C。");

  assert.equal(result.complete, false);
  assert.deepEqual(result.explanationsByLabel, {});
});

test("only requires the labels actually rendered by the question", () => {
  const result = parseChoiceExplanations("过程：A：错误；B：正确。", ["A", "B"]);

  assert.equal(result.complete, true);
  assert.deepEqual(result.explanationsByLabel, {
    A: "错误",
    B: "正确",
  });
});
