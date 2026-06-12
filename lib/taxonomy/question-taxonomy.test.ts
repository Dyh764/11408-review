import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuestionDirectory,
  getDisplayChapter,
  getDisplaySubject,
  higherMathChapterOrder,
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
  question_text: null,
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
  assert.equal(getDisplaySubject({ ...baseQuestion, chapter: "暂未识别" }), "待整理 / 未分类");
});

test("higher math chapters are fixed to exam outline buckets", () => {
  assert.deepEqual(higherMathChapterOrder, [
    "函数、极限、连续",
    "一元函数微分学",
    "一元函数积分学",
    "向量代数与空间解析几何",
    "多元函数微分学",
    "多元函数积分学",
    "无穷级数",
    "常微分方程",
    "待整理 / 未分类",
  ]);

  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "无穷级数 / 幂级数",
      knowledge_point: "函数展开成幂级数，求和函数",
    }),
    "无穷级数",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "高等数学-多元函数积分学",
      knowledge_point: "三重积分、柱坐标、雅可比",
    }),
    "多元函数积分学",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "全微分判定",
      knowledge_point: "偏导与全微分",
    }),
    "多元函数微分学",
  );
  assert.equal(
    getDisplayChapter({ ...baseQuestion, chapter: "暂未识别", knowledge_point: "暂未识别" }),
    "待整理 / 未分类",
  );
});

test("question directory groups by subject then fixed chapter with uncategorized fallback", () => {
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
    [
      "高等数学",
      "线性代数",
      "概率论与数理统计",
      "数据结构",
      "计算机组成原理",
      "操作系统",
      "计算机网络",
      "待整理 / 未分类",
    ],
  );
  assert.equal(directory[0].totalCount, 1);
  assert.equal(directory[0].hardCount, 1);
  assert.equal(directory[0].needsAttentionCount, 1);
  assert.equal(directory[0].chapters[0].chapter, "函数、极限、连续");
  assert.equal(directory[3].masteredCount, 1);
  assert.equal(directory[7].chapters[0].chapter, "待整理 / 未分类");
  assert.equal(directory[7].needsAttentionCount, 1);
});
