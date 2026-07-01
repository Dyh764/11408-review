import assert from "node:assert/strict";
import { test } from "node:test";
import { exportQuestionCard, buildShareCardImageModel } from "./question-card.ts";

const baseQuestion = {
  subject: "数学",
  chapter: "极限",
  knowledge_point: "等价无穷小",
  difficulty: "中等",
  question_text: "求 $\\lim_{x\\to0}\\frac{\\sin x}{x}$",
  mistake_types: ["概念不清", "会但不稳"],
  one_sentence_tip: "先找等价无穷小，再代换。",
  standard_answer: "答案：1",
  answer_explanation: "过程：$\\sin x \\sim x$。",
  choices: [
    { label: "A", text: "1" },
    { label: "B", text: "0" },
  ],
};

test("exportQuestionCard returns the public share JSON fields only", () => {
  const card = exportQuestionCard(baseQuestion);

  assert.deepEqual(Object.keys(card), [
    "question_text",
    "knowledge_point",
    "difficulty",
    "mistake_types",
    "one_sentence_tip",
    "choices",
    "answer",
    "explanation",
  ]);
  assert.equal(card.question_text, baseQuestion.question_text);
  assert.deepEqual(card.choices, baseQuestion.choices);
  assert.equal(card.answer, baseQuestion.standard_answer);
  assert.equal(card.explanation, baseQuestion.answer_explanation);
  assert.deepEqual(card.mistake_types, ["概念不清", "会但不稳"]);
});

test("exportQuestionCard uses stable fallbacks for incomplete questions", () => {
  const card = exportQuestionCard({
    ...baseQuestion,
    question_text: "",
    knowledge_point: "",
    difficulty: null,
    mistake_types: null,
    one_sentence_tip: "",
    standard_answer: "",
    answer_explanation: null,
    choices: null,
  });

  assert.equal(card.question_text, "暂无题干");
  assert.equal(card.knowledge_point, "待整理知识点");
  assert.equal(card.difficulty, "未标注");
  assert.deepEqual(card.mistake_types, []);
  assert.deepEqual(card.choices, []);
  assert.equal(card.one_sentence_tip, "先回看题干和错因，再整理一句话提示。");
  assert.equal(card.answer, "暂无答案");
  assert.equal(card.explanation, "暂无解析");
});

test("buildShareCardImageModel clamps text for a 1080x1350 PNG card", () => {
  const model = buildShareCardImageModel({
    ...baseQuestion,
    question_text: `${baseQuestion.question_text} `.repeat(120),
    mistake_types: ["计算错误", "思路错误", "概念不清", "会但不稳", "额外标签"],
  });

  assert.equal(model.width, 1080);
  assert.equal(model.height, 1350);
  assert.equal(model.mistakeTypes.length, 4);
  assert.ok(model.questionText.length <= 760);
  assert.deepEqual(model.choices, baseQuestion.choices);
  assert.equal(model.theme, "purple");
});
