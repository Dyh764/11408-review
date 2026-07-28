import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuestionBankSubjectInsights,
  extractQuestionBankExamYear,
  type QuestionBankInsightQuestion,
} from "./question-bank-insights.ts";

function question(
  overrides: Partial<QuestionBankInsightQuestion> = {},
): QuestionBankInsightQuestion {
  return {
    id: "q",
    subject: "数据结构",
    chapter: "线性表",
    knowledge_point: "顺序表",
    mastery_status: "有一点思路",
    choices: [{ label: "A", text: "选项" }],
    difficulty: "中等",
    source_info: null,
    ...overrides,
  };
}

test("extractQuestionBankExamYear only reads an explicit source year", () => {
  assert.equal(
    extractQuestionBankExamYear(
      question({
        source_info: {
          type: "真题",
          name: "2024 年 408 真题",
          section: "",
          part: "",
          volume: "",
          paper: "",
          page: "",
          problem_number: "",
          raw: "",
        },
      }),
    ),
    "2024",
  );
  assert.equal(extractQuestionBankExamYear(question()), "");
});

test("buildQuestionBankSubjectInsights calculates real chapter coverage and mastery", () => {
  const insights = buildQuestionBankSubjectInsights([
    question({
      id: "q1",
      mastery_status: "完全掌握",
      source_info: {
        type: "真题",
        name: "",
        section: "",
        part: "",
        volume: "",
        paper: "2022 年全国统考",
        page: "",
        problem_number: "",
        raw: "",
      },
    }),
    question({
      id: "q2",
      difficulty: "较难",
      source_info: {
        type: "真题",
        name: "",
        section: "",
        part: "",
        volume: "",
        paper: "2023 年全国统考",
        page: "",
        problem_number: "",
        raw: "",
      },
    }),
    question({
      id: "q3",
      chapter: "树",
      choices: [],
    }),
  ]);

  const dataStructure = insights.find((item) => item.subject === "数据结构");
  const linearList = dataStructure?.chapters.find(
    (item) => item.chapter === "线性表",
  );

  assert.equal(dataStructure?.total, 3);
  assert.equal(dataStructure?.masteryPercent, 33);
  assert.deepEqual(dataStructure?.examYears, ["2022", "2023"]);
  assert.equal(linearList?.total, 2);
  assert.equal(linearList?.choiceCount, 2);
  assert.equal(linearList?.examQuestionCount, 2);
  assert.equal(linearList?.frequencyLevel, 2);
  assert.deepEqual(linearList?.difficultyCounts, { 中等: 1, 较难: 1 });
});
