import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuestionDirectory,
  getDisplaySubject,
  type TaxonomyQuestion,
} from "./question-taxonomy.ts";

const baseQuestion: TaxonomyQuestion = {
  id: "q",
  subject: "数学",
  chapter: null,
  knowledge_point: null,
  difficulty: null,
  mastery_status: "有一点思路",
  question_text_status: "verified",
  answer_status: "verified",
  needs_manual_check: false,
  review_priority: "medium",
};

test("math subject is split into common exam subjects by chapter or knowledge point", () => {
  assert.equal(
    getDisplaySubject({ ...baseQuestion, chapter: "极限与连续", knowledge_point: "等价无穷小" }),
    "高等数学",
  );
  assert.equal(
    getDisplaySubject({ ...baseQuestion, chapter: "矩阵", knowledge_point: "特征值" }),
    "线性代数",
  );
  assert.equal(
    getDisplaySubject({ ...baseQuestion, chapter: "随机变量", knowledge_point: "分布函数" }),
    "概率论与数理统计",
  );
  assert.equal(getDisplaySubject({ ...baseQuestion, chapter: "暂未识别" }), "数学未分类");
});

test("question directory groups by subject then chapter with uncategorized fallback", () => {
  const directory = buildQuestionDirectory([
    { ...baseQuestion, id: "limit", chapter: "极限", difficulty: "压轴", needs_manual_check: true },
    {
      ...baseQuestion,
      id: "tree",
      subject: "数据结构",
      chapter: "树",
      difficulty: "中等",
      mastery_status: "完全掌握",
    },
    {
      ...baseQuestion,
      id: "unknown",
      subject: "数学",
      chapter: null,
      question_text_status: "needs_fix",
    },
  ]);

  assert.deepEqual(
    directory.map((subject) => subject.subject),
    ["高等数学", "数据结构", "数学未分类"],
  );
  assert.equal(directory[0].totalCount, 1);
  assert.equal(directory[0].hardCount, 1);
  assert.equal(directory[0].needsAttentionCount, 1);
  assert.equal(directory[0].chapters[0].chapter, "极限");
  assert.equal(directory[1].masteredCount, 1);
  assert.equal(directory[2].chapters[0].chapter, "未分类 / 待整理");
  assert.equal(directory[2].needsAttentionCount, 1);
});
