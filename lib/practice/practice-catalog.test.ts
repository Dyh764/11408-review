import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPracticeCatalog,
  filterPracticeQuestions,
  type PracticeQuestion,
} from "./practice-catalog.ts";

const baseQuestion: PracticeQuestion = {
  id: "q",
  subject: "数学",
  chapter: "极限",
  knowledge_point: "等价无穷小",
  difficulty: "中等",
  mastery_status: "有一点思路",
  question_text_status: "verified",
  answer_status: "verified",
  needs_manual_check: false,
  review_priority: "medium",
  mistake_types: [],
  priority_score: 40,
};

test("buildPracticeCatalog groups chapter and mistake review entries with counts", () => {
  const catalog = buildPracticeCatalog([
    { ...baseQuestion, id: "limit-1", chapter: "极限", mistake_types: ["概念混淆"] },
    { ...baseQuestion, id: "limit-2", chapter: "极限", mistake_types: [] },
    {
      ...baseQuestion,
      id: "tree-1",
      subject: "数据结构",
      chapter: "树",
      mistake_types: ["条件漏看", "概念混淆"],
      priority_score: 90,
    },
  ]);

  assert.deepEqual(
    catalog.chapterOptions.map((item) => `${item.subject}/${item.chapter}/${item.count}`),
    ["数据结构/树/1", "数学/极限/2"],
  );
  assert.deepEqual(
    catalog.mistakeOptions.map((item) => `${item.mistakeType}/${item.count}`),
    ["概念混淆/2", "条件漏看/1", "未标注错因/1"],
  );
});

test("filterPracticeQuestions narrows by chapter or mistake type and sorts by priority", () => {
  const questions = [
    { ...baseQuestion, id: "low", chapter: "极限", mistake_types: ["概念混淆"], priority_score: 10 },
    { ...baseQuestion, id: "high", chapter: "极限", mistake_types: ["概念混淆"], priority_score: 100 },
    { ...baseQuestion, id: "other", chapter: "导数", mistake_types: ["计算错误"], priority_score: 90 },
    { ...baseQuestion, id: "blank", chapter: "极限", mistake_types: [], priority_score: 80 },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "chapter", subject: "数学", chapter: "极限" })
      .map((question) => question.id),
    ["high", "blank", "low"],
  );
  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "mistake", mistakeType: "概念混淆" })
      .map((question) => question.id),
    ["high", "low"],
  );
  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "mistake", mistakeType: "未标注错因" })
      .map((question) => question.id),
    ["blank"],
  );
});
