import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  ReviewPriority,
} from "../types";

export type DisplaySubject =
  | "高等数学"
  | "线性代数"
  | "概率论与数理统计"
  | "数学未分类"
  | "数据结构"
  | "计算机组成原理"
  | "操作系统"
  | "计算机网络";

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
  "数学未分类",
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

export function getDisplaySubject(question: TaxonomyQuestion): DisplaySubject {
  if (question.subject !== "数学") {
    return subjectOrder.includes(question.subject as DisplaySubject)
      ? (question.subject as DisplaySubject)
      : "数学未分类";
  }

  const text = `${question.chapter ?? ""} ${question.knowledge_point ?? ""}`;
  const matched = mathSubjectRules.find((rule) => includesAnyKeyword(text, rule.keywords));

  return matched?.subject ?? "数学未分类";
}

function getDisplayChapter(question: TaxonomyQuestion) {
  const chapter = question.chapter?.trim();
  return chapter && chapter.length > 0 ? chapter : "未分类 / 待整理";
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

  return Array.from(subjectMap, ([subject, subjectQuestions]) => {
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
      chapters: Array.from(chapterMap, ([chapter, chapterQuestions]) => ({
        chapter,
        ...summarize(chapterQuestions),
        questions: chapterQuestions,
      })).sort((a, b) => b.needsAttentionCount - a.needsAttentionCount || b.totalCount - a.totalCount),
    };
  }).sort(
    (a, b) =>
      subjectOrder.indexOf(a.subject) - subjectOrder.indexOf(b.subject) ||
      b.needsAttentionCount - a.needsAttentionCount,
  );
}
