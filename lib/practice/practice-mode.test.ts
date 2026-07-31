import assert from "node:assert/strict";
import { test } from "node:test";
import { canUseQuestionInAnswerMode } from "./practice-mode.ts";

const validQuestion = {
  subject: "操作系统",
  question_text: "进程映像由哪些部分组成？",
  choices: [
    { label: "A", text: "程序" },
    { label: "B", text: "程序、数据和 PCB" },
  ],
  standard_answer: "B",
  answer_explanation: "B 项完整描述了进程映像。",
  image_path: null,
  source_info: null,
};

test("professional answer modes only enable questions that can complete the real interaction", () => {
  for (const mode of ["editable", "repeat", "open-book", "quick-fill"] as const) {
    assert.equal(canUseQuestionInAnswerMode(validQuestion, mode), true);
  }

  assert.equal(
    canUseQuestionInAnswerMode(
      { ...validQuestion, standard_answer: null, answer_explanation: null },
      "quick-fill",
    ),
    false,
  );
  assert.equal(
    canUseQuestionInAnswerMode(
      { ...validQuestion, standard_answer: null, answer_explanation: "可直接回顾解析" },
      "open-book",
    ),
    true,
  );
});

test("professional answer modes exclude questions with missing required images", () => {
  const sourceInfo = {
    type: "题库",
    name: "王道做题本",
    section: "",
    part: "",
    volume: "",
    paper: "",
    page: "",
    problem_number: "",
    raw: "",
    image_required: true,
  };

  assert.equal(
    canUseQuestionInAnswerMode(
      { ...validQuestion, source_info: sourceInfo, image_path: null },
      "open-book",
    ),
    false,
  );
  assert.equal(
    canUseQuestionInAnswerMode(
      { ...validQuestion, source_info: sourceInfo, image_path: "assets/figure.png" },
      "open-book",
    ),
    true,
  );
});
