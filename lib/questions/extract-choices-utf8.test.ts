import assert from "node:assert/strict";
import { test } from "node:test";
import { splitQuestionTextAndChoices } from "./extract-choices.ts";

test("splitQuestionTextAndChoices extracts normal Chinese imported choices", () => {
  const result = splitQuestionTextAndChoices(
    "下列关于二叉树的说法正确的是（ ）。A. 空树也是二叉树 B. 二叉树每个结点都有两个孩子 C. 二叉树只能顺序存储 D. 二叉树不能遍历",
  );

  assert.equal(result.questionText, "下列关于二叉树的说法正确的是（ ）。");
  assert.deepEqual(result.choices, [
    { label: "A", text: "空树也是二叉树" },
    { label: "B", text: "二叉树每个结点都有两个孩子" },
    { label: "C", text: "二叉树只能顺序存储" },
    { label: "D", text: "二叉树不能遍历" },
  ]);
});
