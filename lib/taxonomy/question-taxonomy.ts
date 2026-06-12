import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  ReviewPriority,
} from "../types";
import { sortQuestionsForChapterList } from "../questions/question-sort.ts";

export type DisplaySubject =
  | "高等数学"
  | "线性代数"
  | "概率论与数理统计"
  | "数据结构"
  | "计算机组成原理"
  | "操作系统"
  | "计算机网络"
  | "待整理 / 未分类";

export type TaxonomyQuestion = {
  id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  difficulty: Difficulty | string | null;
  mastery_status: MasteryStatus | string | null;
  question_text_status: QuestionTextStatus | string | null;
  answer_status: AnswerStatus | string | null;
  needs_manual_check: boolean;
  review_priority: ReviewPriority | string | null;
  question_text?: string | null;
  priority_score?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuestionChapterGroup<T extends TaxonomyQuestion> = {
  chapter: string;
  totalCount: number;
  hardCount: number;
  masteredCount: number;
  needsAttentionCount: number;
  questions: T[];
};

export type QuestionSubjectDirectory<T extends TaxonomyQuestion> = {
  subject: DisplaySubject;
  totalCount: number;
  dueTodayCount: number;
  hardCount: number;
  masteredCount: number;
  needsAttentionCount: number;
  masteryRate: number;
  chapters: QuestionChapterGroup<T>[];
};

const subjectOrder: DisplaySubject[] = [
  "高等数学",
  "线性代数",
  "概率论与数理统计",
  "数据结构",
  "计算机组成原理",
  "操作系统",
  "计算机网络",
  "待整理 / 未分类",
];

export const higherMathChapterOrder = [
  "函数、极限、连续",
  "一元函数微分学",
  "一元函数积分学",
  "向量代数与空间解析几何",
  "多元函数微分学",
  "多元函数积分学",
  "无穷级数",
  "常微分方程",
  "待整理 / 未分类",
] as const;

type HigherMathChapter = (typeof higherMathChapterOrder)[number];

const higherMathChapterRules: Array<{ chapter: HigherMathChapter; keywords: string[] }> = [
  {
    chapter: "无穷级数",
    keywords: ["无穷级数", "数项级数", "正项级数", "交错级数", "幂级数", "函数项级数", "求和函数", "收敛半径", "收敛域", "泰勒级数", "傅里叶级数"],
  },
  {
    chapter: "多元函数积分学",
    keywords: ["二重积分", "三重积分", "曲线积分", "曲面积分", "格林公式", "高斯公式", "斯托克斯公式", "形心", "质心", "柱坐标", "球坐标", "雅可比", "对称性", "椭球", "空间区域"],
  },
  {
    chapter: "多元函数微分学",
    keywords: ["多元函数微分", "偏导", "全微分", "方向导数", "梯度", "条件极值", "拉格朗日乘数", "隐函数", "全微分判定"],
  },
  {
    chapter: "常微分方程",
    keywords: ["微分方程", "可分离变量", "齐次方程", "一阶线性", "二阶常系数", "特征方程", "通解", "特解"],
  },
  {
    chapter: "函数、极限、连续",
    keywords: ["极限", "无穷小", "无穷大", "等价无穷小", "连续", "间断点", "渐近线"],
  },
  {
    chapter: "一元函数微分学",
    keywords: ["导数", "微分", "中值定理", "洛必达", "单调性", "凹凸性", "拐点", "极值", "最值", "曲率"],
  },
  {
    chapter: "一元函数积分学",
    keywords: ["不定积分", "定积分", "反常积分", "变限积分", "换元积分", "分部积分", "面积", "旋转体体积"],
  },
  {
    chapter: "向量代数与空间解析几何",
    keywords: ["向量代数", "空间解析几何", "向量", "平面", "直线", "距离", "夹角", "法向量", "方向向量"],
  },
];

const mathSubjectRules: Array<{ subject: DisplaySubject; keywords: string[] }> = [
  {
    subject: "线性代数",
    keywords: ["行列式", "矩阵", "向量", "线性方程组", "特征值", "特征向量", "二次型", "秩"],
  },
  {
    subject: "概率论与数理统计",
    keywords: ["概率", "随机", "分布", "期望", "方差", "统计", "估计", "假设检验"],
  },
  {
    subject: "高等数学",
    keywords: [
      "函数",
      "极限",
      "连续",
      "导数",
      "微分",
      "积分",
      "级数",
      "多元",
      "微分方程",
      "无穷小",
    ],
  },
];

function includesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeChapterText(chapter: string) {
  return chapter
    .trim()
    .replace(/^高等数学[-/：:\s]*/, "")
    .replace(/^数学[-/：:\s]*/, "");
}

function getQuestionText(question: TaxonomyQuestion) {
  return [
    normalizeChapterText(question.chapter ?? ""),
    question.knowledge_point ?? "",
    question.question_text ?? "",
  ].join(" ");
}

function classifyHigherMathChapter(question: TaxonomyQuestion): HigherMathChapter {
  const text = getQuestionText(question);
  const exact = higherMathChapterOrder.find(
    (chapter) => chapter !== "待整理 / 未分类" && text.includes(chapter),
  );

  if (exact) {
    return exact;
  }

  const matched = higherMathChapterRules.find((rule) => includesAnyKeyword(text, rule.keywords));
  return matched?.chapter ?? "待整理 / 未分类";
}

export function getDisplaySubject(question: TaxonomyQuestion): DisplaySubject {
  if (question.subject !== "数学") {
    return subjectOrder.includes(question.subject as DisplaySubject)
      ? (question.subject as DisplaySubject)
      : "待整理 / 未分类";
  }

  const text = getQuestionText(question);
  if (classifyHigherMathChapter(question) !== "待整理 / 未分类") {
    return "高等数学";
  }

  const matched = mathSubjectRules.find((rule) => includesAnyKeyword(text, rule.keywords));

  return matched?.subject ?? "待整理 / 未分类";
}

export function getDisplayChapter(question: TaxonomyQuestion) {
  const subject = getDisplaySubject(question);

  if (subject === "高等数学") {
    return classifyHigherMathChapter(question);
  }

  if (subject === "待整理 / 未分类") {
    return "待整理 / 未分类";
  }

  const chapter = question.chapter?.trim();
  return chapter && chapter.length > 0 ? chapter : "待整理 / 未分类";
}

function isHard(question: TaxonomyQuestion) {
  return question.difficulty === "较难" || question.difficulty === "压轴" || question.difficulty === "困难";
}

function isMastered(question: TaxonomyQuestion) {
  return question.mastery_status === "完全掌握";
}

function needsAttention(question: TaxonomyQuestion) {
  return (
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    question.review_priority === "high"
  );
}

function summarize<T extends TaxonomyQuestion>(questions: T[]) {
  const totalCount = questions.length;
  const masteredCount = questions.filter(isMastered).length;

  return {
    totalCount,
    hardCount: questions.filter(isHard).length,
    masteredCount,
    needsAttentionCount: questions.filter(needsAttention).length,
    masteryRate: totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0,
  };
}

export function buildQuestionDirectory<T extends TaxonomyQuestion>(
  questions: T[],
  dueTodayIds: Set<string> = new Set(),
): QuestionSubjectDirectory<T>[] {
  const subjectMap = new Map<DisplaySubject, T[]>();

  for (const question of questions) {
    const subject = getDisplaySubject(question);
    const subjectQuestions = subjectMap.get(subject) ?? [];
    subjectQuestions.push(question);
    subjectMap.set(subject, subjectQuestions);
  }

  return subjectOrder.map((subject) => {
    const subjectQuestions = subjectMap.get(subject) ?? [];
    const chapterMap = new Map<string, T[]>();

    for (const question of subjectQuestions) {
      const chapter = getDisplayChapter(question);
      const chapterQuestions = chapterMap.get(chapter) ?? [];
      chapterQuestions.push(question);
      chapterMap.set(chapter, chapterQuestions);
    }

    const summary = summarize(subjectQuestions);

    return {
      subject,
      ...summary,
      dueTodayCount: subjectQuestions.filter((question) => dueTodayIds.has(question.id)).length,
      chapters: Array.from(
        subject === "高等数学"
          ? new Map(
              higherMathChapterOrder.map((chapter) => [
                chapter,
                chapterMap.get(chapter) ?? [],
              ]),
            )
          : chapterMap,
        ([chapter, chapterQuestions]) => ({
        chapter,
        ...summarize(chapterQuestions),
        questions: sortQuestionsForChapterList(chapterQuestions, { dueTodayIds }),
      })).sort((a, b) => {
        const chapterOrderA = subject === "高等数学"
          ? higherMathChapterOrder.indexOf(a.chapter as HigherMathChapter)
          : -1;
        const chapterOrderB = subject === "高等数学"
          ? higherMathChapterOrder.indexOf(b.chapter as HigherMathChapter)
          : -1;

        if (chapterOrderA !== -1 || chapterOrderB !== -1) {
          return (chapterOrderA === -1 ? 999 : chapterOrderA) - (chapterOrderB === -1 ? 999 : chapterOrderB);
        }

        return b.needsAttentionCount - a.needsAttentionCount || b.totalCount - a.totalCount;
      }),
    };
  });
}
