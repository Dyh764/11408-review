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
    "函数、极限与连续",
    "一元函数微分学",
    "一元函数积分学",
    "常微分方程",
    "中值定理",
    "多元函数微分学",
    "二重积分",
    "三重积分",
    "曲线积分",
    "曲面积分",
    "无穷级数",
    "向量代数与空间解析几何",
    "数一专项",
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
    "三重积分",
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

test("higher math integral taxonomy splits old multi-variable integral data into concrete chapters", () => {
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "高等数学-多元函数积分学",
      knowledge_point: "三重积分、柱坐标、空间区域",
    }),
    "三重积分",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "多元函数积分学",
      knowledge_point: "二重积分、极坐标",
    }),
    "二重积分",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "多元函数积分学",
      knowledge_point: "空间第二类曲线积分、斯托克斯公式",
    }),
    "曲面积分",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "高等数学-多元函数积分学",
      knowledge_point: "格林公式",
    }),
    "曲线积分",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "多元函数积分学",
      knowledge_point: "椭球区域三重积分、雅可比",
    }),
    "三重积分",
  );
});

test("question text integral symbols decide between double and triple integral when metadata is mixed", () => {
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "多元函数积分学",
      knowledge_point: "二重积分、三重积分综合",
      question_text: "计算 $\\iiint_{\\Omega} f(x,y,z)\\,dV$。",
    }),
    "三重积分",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "多元函数积分学",
      knowledge_point: "二重积分、三重积分综合",
      question_text: "计算 $\\iint_D f(x,y)\\,dA$。",
    }),
    "二重积分",
  );
});

test("old multi-variable integral chapter does not force every question into one directory", () => {
  const directory = buildQuestionDirectory([
    {
      ...baseQuestion,
      id: "double",
      chapter: "多元函数积分学",
      knowledge_point: "二重积分、极坐标",
    },
    {
      ...baseQuestion,
      id: "triple",
      chapter: "多元函数积分学",
      knowledge_point: "三重积分、柱坐标、空间区域",
    },
    {
      ...baseQuestion,
      id: "line",
      chapter: "多元函数积分学",
      knowledge_point: "格林公式、路径无关",
    },
    {
      ...baseQuestion,
      id: "surface",
      chapter: "多元函数积分学",
      knowledge_point: "斯托克斯公式、通量",
    },
  ]);
  const higherMath = directory.find((subject) => subject.subject === "高等数学");
  const nonEmptyChapters = higherMath?.chapters
    .filter((chapter) => chapter.totalCount > 0)
    .map((chapter) => chapter.chapter);

  assert.deepEqual(nonEmptyChapters, ["二重积分", "三重积分", "曲线积分", "曲面积分"]);
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
  assert.equal(directory[0].chapters[0].chapter, "函数、极限与连续");
  assert.equal(directory[3].masteredCount, 1);
  assert.equal(directory[7].chapters[0].chapter, "待整理 / 未分类");
  assert.equal(directory[7].needsAttentionCount, 1);
});
