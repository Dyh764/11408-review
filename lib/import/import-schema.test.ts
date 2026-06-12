import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseImportJsonText,
  sanitizeImportJsonText,
} from "./import-schema.ts";

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    subject: "数学",
    chapter: "高等数学",
    knowledge_point: "多元函数积分学",
    difficulty: "中等",
    question_text: "计算 $\\int_0^1 x^2 dx$。",
    choices: [],
    mastery_status: "思路对但卡住",
    user_note: "积分区域没有画清楚。",
    mistake_types: ["积分区域"],
    solution_summary: "先画区域再定限。",
    standard_answer: "答案：$\\frac{1}{3}$",
    answer_explanation: "过程：直接积分。",
    key_steps: ["写出积分限", "计算原函数"],
    one_sentence_tip: "先画图再计算。",
    review_priority: "high",
    confidence: "medium",
    needs_manual_check: true,
    answer_status: "ai_unverified",
    answer_source: "chatgpt_import",
    ...overrides,
  };
}

test("parses standard valid JSON without repair", () => {
  const input = JSON.stringify([validRow()]);

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 1);
  assert.equal(result.sanitizedText, undefined);
  assert.equal(result.cards[0].card.question_text, "计算 $\\int_0^1 x^2 dx$。");
});

test("repairs curly quotes before parsing JSON", () => {
  const input = `[
    {
      “subject”: “数学”,
      “chapter”: “高等数学”,
      “knowledge_point”: “极限”,
      “difficulty”: “中等”,
      “question_text”: “求极限 $x \\to 0$。”,
      “mastery_status”: “有一点思路”,
      “user_note”: “容易忘记等价无穷小。”,
      “mistake_types”: [“等价无穷小”],
      “needs_manual_check”: true
    }
  ]`;

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 1);
  assert.ok(result.repairNotices?.includes("检测到中文弯引号：已尝试转换。"));
});

test("repairs single-backslash LaTeX commands inside JSON strings", () => {
  const input = String.raw`[
    {
      "subject": "数学",
      "chapter": "高等数学",
      "knowledge_point": "多元函数积分学",
      "difficulty": "中等",
      "question_text": "$\Omega$ 与 $\frac{x^2}{a^2}$，且 $\leq 1$，计算 $\iiint_\Omega f(x,y,z)dV$。",
      "mastery_status": "思路对但卡住",
      "user_note": "不会处理 $\nabla$ 和 $\times$。",
      "mistake_types": ["LaTeX"],
      "standard_answer": "答案：$\bar{x}+\vec{y}$",
      "answer_explanation": "过程：用 $\left\{x\mid x\in\Omega\right\}$。",
      "key_steps": ["写出 $\alpha+\theta$", "计算 $\sum_{n=1}^{\infty} a_n$"],
      "needs_manual_check": true
    }
  ]`;

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 1);
  assert.ok(result.repairNotices?.includes("检测到 LaTeX 单反斜杠：已尝试转义。"));
  assert.equal(
    result.cards[0].card.question_text,
    "$\\Omega$ 与 $\\frac{x^2}{a^2}$，且 $\\leq 1$，计算 $\\iiint_\\Omega f(x,y,z)dV$。",
  );
  assert.equal(result.cards[0].card.user_note, "不会处理 $\\nabla$ 和 $\\times$。");
  assert.deepEqual(result.cards[0].card.key_steps, [
    "写出 $\\alpha+\\theta$",
    "计算 $\\sum_{n=1}^{\\infty} a_n$",
  ]);
});

test("keeps curly quotes inside ordinary Chinese text parseable during LaTeX repair", () => {
  const input = String.raw`[
    {
      "subject": "数学",
      "chapter": "高等数学",
      "knowledge_point": "极限",
      "difficulty": "中等",
      "question_text": "他说“先看 $\Omega$”，再求极限。",
      "mastery_status": "有一点思路",
      "user_note": "不要破坏普通中文。",
      "mistake_types": [],
      "needs_manual_check": true
    }
  ]`;

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].card.question_text, '他说"先看 $\\Omega$"，再求极限。');
});


test("does not double-escape already valid LaTeX backslashes", () => {
  const input = JSON.stringify([
    validRow({
      question_text: "$\\Omega$ 与 $\\frac{x^2}{a^2}$",
      standard_answer: "答案：$\\leq 1$",
    }),
  ]);

  const sanitized = sanitizeImportJsonText(input);
  const result = parseImportJsonText(input);

  assert.equal(sanitized, input);
  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].card.question_text, "$\\Omega$ 与 $\\frac{x^2}{a^2}$");
  assert.equal(result.cards[0].card.standard_answer, "答案：$\\leq 1$");
});

test("returns a specific parse failure message when repair still cannot parse JSON", () => {
  const result = parseImportJsonText(`[{"subject": "数学", "question_text": "$\\Omega$"`);

  assert.equal(result.cards.length, 0);
  assert.match(
    result.errors[0].message,
    /JSON 解析失败，可能原因：引号不是英文双引号、LaTeX 反斜杠未转义、数组逗号缺失、括号未闭合。/,
  );
});
