import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuestionDirectory,
  filterVisibleQuestionDirectory,
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
    "曲线曲面积分",
    "无穷级数",
    "向量代数与空间解析几何",
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
    "曲线曲面积分",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      chapter: "高等数学-多元函数积分学",
      knowledge_point: "格林公式",
    }),
    "曲线曲面积分",
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

test("line and surface integral formulas are unified under the concise chapter", () => {
  for (const knowledge_point of ["斯托克斯公式", "高斯公式", "空间第二类曲线积分"]) {
    assert.equal(
      getDisplayChapter({
        ...baseQuestion,
        chapter: "多元函数积分学",
        knowledge_point,
      }),
      "曲线曲面积分",
    );
  }
});

test("triple and double integral keywords keep their own concise chapters", () => {
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
      knowledge_point: "椭球区域三重积分、雅可比",
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

  assert.deepEqual(nonEmptyChapters, ["二重积分", "三重积分", "曲线曲面积分"]);
});

test("higher math directory does not generate removed special-purpose chapters", () => {
  const directory = buildQuestionDirectory([
    {
      ...baseQuestion,
      id: "line",
      chapter: "多元函数积分学",
      knowledge_point: "曲线积分、路径无关",
    },
    {
      ...baseQuestion,
      id: "surface",
      chapter: "多元函数积分学",
      knowledge_point: "曲面积分、高斯公式",
    },
    {
      ...baseQuestion,
      id: "gradient",
      chapter: "数一专项",
      knowledge_point: "方向导数、梯度",
    },
  ]);
  const higherMath = directory.find((subject) => subject.subject === "高等数学");
  const chapters = higherMath?.chapters.map((chapter) => chapter.chapter) ?? [];

  assert.ok(!chapters.includes("数一专项"));
  assert.ok(!chapters.includes("曲线积分"));
  assert.ok(!chapters.includes("曲面积分"));
  assert.ok(chapters.includes("曲线曲面积分"));
  assert.equal(
    higherMath?.chapters.find((chapter) => chapter.chapter === "待整理 / 未分类")?.totalCount,
    0,
  );
  assert.deepEqual(
    higherMath?.chapters.filter((chapter) => chapter.totalCount > 0).map((chapter) => chapter.chapter),
    ["多元函数微分学", "曲线曲面积分"],
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
  assert.equal(directory[0].chapters[0].chapter, "函数、极限与连续");
  assert.equal(directory[3].masteredCount, 1);
  assert.equal(directory[7].chapters[0].chapter, "待整理 / 未分类");
  assert.equal(directory[7].needsAttentionCount, 1);
});

test("source directory view hides empty subjects and keeps 408 subject order", () => {
  const directory = buildQuestionDirectory([
    {
      ...baseQuestion,
      id: "os-1",
      subject: "操作系统",
      chapter: "进程与线程",
      knowledge_point: "CPU 调度",
    },
    {
      ...baseQuestion,
      id: "net-1",
      subject: "计算机网络",
      chapter: "网络层",
      knowledge_point: "IPv4",
    },
  ]);

  const visible = filterVisibleQuestionDirectory(directory, { hideEmptySubjects: true });

  assert.deepEqual(
    visible.map((subject) => subject.subject),
    ["操作系统", "计算机网络"],
  );
  assert.equal(visible.some((subject) => subject.totalCount === 0), false);
});

test("408 chapters follow reference catalog aliases instead of raw import text", () => {
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      subject: "操作系统",
      chapter: "2.2 CPU 调度",
      knowledge_point: "时间片轮转",
    }),
    "进程与线程",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      subject: "计算机网络",
      chapter: "4.3 IP",
      knowledge_point: "IPv4 分片",
    }),
    "网络层",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      subject: "计算机组成原理",
      chapter: "5.3 数据通路的功能和基本结构",
      knowledge_point: "数据通路",
    }),
    "中央处理器",
  );
  assert.equal(
    getDisplayChapter({
      ...baseQuestion,
      subject: "数据结构",
      chapter: "7.5 散列(Hash)表",
      knowledge_point: "哈希冲突",
    }),
    "查找",
  );
});

test("408 subject directories use the user-provided chapter order only", () => {
  const directory = buildQuestionDirectory([]);

  assert.deepEqual(
    directory.find((subject) => subject.subject === "操作系统")?.chapters.map((chapter) => chapter.chapter),
    ["计算机系统概述", "进程与线程", "内存管理", "文件管理", "输入/输出管理", "待整理 / 未分类"],
  );
  assert.deepEqual(
    directory.find((subject) => subject.subject === "计算机网络")?.chapters.map((chapter) => chapter.chapter),
    ["计算机网络体系结构", "物理层", "数据链路层", "网络层", "传输层", "应用层", "待整理 / 未分类"],
  );
  assert.deepEqual(
    directory.find((subject) => subject.subject === "计算机组成原理")?.chapters.map((chapter) => chapter.chapter),
    ["计算机系统概述", "数据的表示和运算", "存储系统", "指令系统", "中央处理器", "总线", "输入/输出系统", "待整理 / 未分类"],
  );
  assert.deepEqual(
    directory.find((subject) => subject.subject === "数据结构")?.chapters.map((chapter) => chapter.chapter),
    ["绪论", "线性表", "栈、队列和数组", "串", "树与二叉树", "图", "查找", "排序", "待整理 / 未分类"],
  );
});
