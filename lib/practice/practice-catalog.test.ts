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

test("filterPracticeQuestions can start a round from a weakness topic", () => {
  const questions = [
    { ...baseQuestion, id: "topic-high", knowledge_point: "矩阵秩", priority_score: 100 },
    { ...baseQuestion, id: "topic-low", knowledge_point: "矩阵秩", priority_score: 10 },
    { ...baseQuestion, id: "chapter-match", chapter: "矩阵秩", knowledge_point: "", priority_score: 80 },
    { ...baseQuestion, id: "other", knowledge_point: "特征值", priority_score: 90 },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "topic", topic: "矩阵秩" }).map(
      (question) => question.id,
    ),
    ["topic-high", "chapter-match", "topic-low"],
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

test("filterPracticeQuestions builds a four-course choice-only round", () => {
  const questions = [
    { ...baseQuestion, id: "math-choice", subject: "数学", choices: [{ label: "A", text: "1" }], priority_score: 100 },
    { ...baseQuestion, id: "ds-choice", subject: "数据结构", choices: [{ label: "A", text: "1" }], priority_score: 60 },
    { ...baseQuestion, id: "os-text", subject: "操作系统", choices: [], priority_score: 90 },
    { ...baseQuestion, id: "net-choice", subject: "计算机网络", choices: [{ label: "A", text: "1" }], priority_score: 80 },
    { ...baseQuestion, id: "co-choice", subject: "计算机组成原理", choices: [{ label: "A", text: "1" }], priority_score: 70 },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "exam408-choice" }).map((question) => question.id),
    ["net-choice", "co-choice", "ds-choice"],
  );
  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "exam408-choice", subject: "数据结构" }).map(
      (question) => question.id,
    ),
    ["ds-choice"],
  );
});

test("filterPracticeQuestions orders practice rounds from oldest to newest question time", () => {
  const questions = [
    {
      ...baseQuestion,
      id: "newest",
      subject: "数据结构",
      choices: [{ label: "A", text: "1" }],
      created_at: "2026-06-03T00:00:00.000Z",
      priority_score: 100,
    },
    {
      ...baseQuestion,
      id: "oldest",
      subject: "数据结构",
      choices: [{ label: "A", text: "1" }],
      created_at: "2026-06-01T00:00:00.000Z",
      priority_score: 10,
    },
    {
      ...baseQuestion,
      id: "middle",
      subject: "数据结构",
      choices: [{ label: "A", text: "1" }],
      created_at: "2026-06-02T00:00:00.000Z",
      priority_score: 50,
    },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "exam408-choice", subject: "数据结构" })
      .map((question) => question.id),
    ["oldest", "middle", "newest"],
  );
});

test("filterPracticeQuestions narrows a four-course choice round to one chapter", () => {
  const questions = [
    {
      ...baseQuestion,
      id: "os-intro-high",
      subject: "操作系统",
      chapter: "操作系统概述",
      choices: [{ label: "A", text: "1" }],
      priority_score: 80,
    },
    {
      ...baseQuestion,
      id: "os-intro-low",
      subject: "操作系统",
      chapter: "操作系统概述",
      choices: [{ label: "A", text: "1" }],
      priority_score: 20,
    },
    {
      ...baseQuestion,
      id: "os-process",
      subject: "操作系统",
      chapter: "进程与线程",
      choices: [{ label: "A", text: "1" }],
      priority_score: 100,
    },
    {
      ...baseQuestion,
      id: "network-intro",
      subject: "计算机网络",
      chapter: "操作系统概述",
      choices: [{ label: "A", text: "1" }],
      priority_score: 90,
    },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, {
      type: "exam408-choice",
      subject: "操作系统",
      chapter: "操作系统概述",
    }).map((question) => question.id),
    ["os-intro-high", "os-intro-low"],
  );
});

test("filterPracticeQuestions returns one stable daily question for the same date", () => {
  const questions = [
    {
      ...baseQuestion,
      id: "daily-1",
      subject: "数据结构",
      choices: [{ label: "A", text: "1" }],
      created_at: "2026-06-01T00:00:00.000Z",
    },
    {
      ...baseQuestion,
      id: "daily-2",
      subject: "操作系统",
      choices: [{ label: "A", text: "1" }],
      created_at: "2026-06-02T00:00:00.000Z",
    },
    {
      ...baseQuestion,
      id: "daily-3",
      subject: "计算机网络",
      choices: [{ label: "A", text: "1" }],
      created_at: "2026-06-03T00:00:00.000Z",
    },
  ];

  const first = filterPracticeQuestions(questions, {
    type: "daily-choice",
    date: "2026-07-28",
  });
  const second = filterPracticeQuestions(questions, {
    type: "daily-choice",
    date: "2026-07-28",
  });

  assert.equal(first.length, 1);
  assert.equal(second[0]?.id, first[0]?.id);
});

test("filterPracticeQuestions builds a personal high-frequency wrong-question round", () => {
  const questions = [
    {
      ...baseQuestion,
      id: "priority-high",
      subject: "数据结构",
      choices: [{ label: "A", text: "1" }],
      review_priority: "high",
      mastery_status: "计算错误",
    },
    {
      ...baseQuestion,
      id: "unstable",
      subject: "操作系统",
      choices: [{ label: "A", text: "1" }],
      review_priority: "medium",
      mastery_status: "做对但不稳",
    },
    {
      ...baseQuestion,
      id: "mastered",
      subject: "计算机网络",
      choices: [{ label: "A", text: "1" }],
      review_priority: "low",
      mastery_status: "完全掌握",
    },
    {
      ...baseQuestion,
      id: "math",
      subject: "数学",
      choices: [{ label: "A", text: "1" }],
      review_priority: "high",
    },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, { type: "high-frequency-choice" }).map(
      (question) => question.id,
    ),
    ["priority-high", "unstable"],
  );
});

test("VIP practice filters real book, exam and supplement sources without mistaking book edition years for exams", () => {
  const sourceBase = {
    type: "",
    name: "",
    section: "",
    part: "",
    volume: "",
    paper: "",
    page: "",
    problem_number: "",
    raw: "",
  };
  const questions = [
    {
      ...baseQuestion,
      id: "book",
      subject: "操作系统",
      choices: [{ label: "A", text: "1" }],
      difficulty: "中等",
      source_info: {
        ...sourceBase,
        type: "题库",
        name: "王道《操作系统》选择题做题本",
        volume: "2027",
        collection_role: "practice_bank" as const,
      },
    },
    {
      ...baseQuestion,
      id: "exam",
      subject: "操作系统",
      choices: [{ label: "A", text: "1" }],
      difficulty: "较难",
      source_info: {
        ...sourceBase,
        type: "真题",
        name: "2024 年 408 真题",
      },
    },
    {
      ...baseQuestion,
      id: "supplement",
      subject: "操作系统",
      choices: [{ label: "A", text: "1" }],
      difficulty: "中等",
      source_info: {
        ...sourceBase,
        type: "补充习题",
        name: "自建补充题库",
        collection_role: "practice_bank" as const,
      },
    },
  ];

  assert.deepEqual(
    filterPracticeQuestions(questions, {
      type: "exam408-choice",
      sourceRange: "book",
      difficulty: "中等",
    }).map((question) => question.id),
    ["book"],
  );
  assert.deepEqual(
    filterPracticeQuestions(questions, {
      type: "exam408-choice",
      sourceRange: "exam",
    }).map((question) => question.id),
    ["exam"],
  );
  assert.deepEqual(
    filterPracticeQuestions(questions, {
      type: "exam408-choice",
      sourceRange: "supplement",
    }).map((question) => question.id),
    ["supplement"],
  );
});
