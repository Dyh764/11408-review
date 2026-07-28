import type { ChoiceOption, QuestionSourceInfo } from "../types";

export const questionBankSubjects = [
  "数据结构",
  "计算机组成原理",
  "操作系统",
  "计算机网络",
] as const;

export type QuestionBankInsightQuestion = {
  id: string;
  subject: string;
  chapter?: string | null;
  knowledge_point?: string | null;
  mastery_status?: string | null;
  choices?: ChoiceOption[] | null;
  difficulty?: string | null;
  source_info?: QuestionSourceInfo | null;
};

export type QuestionBankChapterInsight = {
  chapter: string;
  total: number;
  choiceCount: number;
  masteredCount: number;
  masteryPercent: number;
  examQuestionCount: number;
  examYears: string[];
  frequencyLevel: number;
  difficultyCounts: Record<string, number>;
};

export type QuestionBankSubjectInsight = {
  subject: string;
  total: number;
  choiceCount: number;
  masteredCount: number;
  masteryPercent: number;
  examQuestionCount: number;
  examYears: string[];
  chapters: QuestionBankChapterInsight[];
};

function sourceInfoText(sourceInfo?: QuestionSourceInfo | null) {
  if (!sourceInfo) {
    return "";
  }

  return [
    sourceInfo.raw,
    sourceInfo.name,
    sourceInfo.paper,
    sourceInfo.volume,
    sourceInfo.section,
    sourceInfo.part,
  ]
    .filter(Boolean)
    .join(" ");
}

export function extractQuestionBankExamYear(
  question: QuestionBankInsightQuestion,
) {
  return sourceInfoText(question.source_info).match(/(?:19|20)\d{2}/)?.[0] ?? "";
}

function isMastered(question: QuestionBankInsightQuestion) {
  return question.mastery_status === "完全掌握";
}

function chapterLabel(question: QuestionBankInsightQuestion) {
  return question.chapter?.trim() || "未分类 / 待整理";
}

function masteryPercent(masteredCount: number, total: number) {
  return total > 0 ? Math.round((masteredCount / total) * 100) : 0;
}

function buildChapterInsight(
  chapter: string,
  questions: QuestionBankInsightQuestion[],
): QuestionBankChapterInsight {
  const examYears = Array.from(
    new Set(questions.map(extractQuestionBankExamYear).filter(Boolean)),
  ).sort();
  const masteredCount = questions.filter(isMastered).length;
  const examQuestionCount = questions.filter((question) =>
    Boolean(extractQuestionBankExamYear(question)),
  ).length;
  const difficultyCounts = questions.reduce<Record<string, number>>(
    (counts, question) => {
      const difficulty = question.difficulty?.trim() || "未标难度";
      counts[difficulty] = (counts[difficulty] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return {
    chapter,
    total: questions.length,
    choiceCount: questions.filter((question) => (question.choices?.length ?? 0) > 0)
      .length,
    masteredCount,
    masteryPercent: masteryPercent(masteredCount, questions.length),
    examQuestionCount,
    examYears,
    frequencyLevel: Math.min(3, examYears.length),
    difficultyCounts,
  };
}

export function buildQuestionBankSubjectInsights(
  questions: QuestionBankInsightQuestion[],
): QuestionBankSubjectInsight[] {
  return questionBankSubjects.map((subject) => {
    const subjectQuestions = questions.filter(
      (question) => question.subject === subject,
    );
    const chapterGroups = new Map<string, QuestionBankInsightQuestion[]>();

    for (const question of subjectQuestions) {
      const chapter = chapterLabel(question);
      const group = chapterGroups.get(chapter) ?? [];
      group.push(question);
      chapterGroups.set(chapter, group);
    }

    const masteredCount = subjectQuestions.filter(isMastered).length;
    const examYears = Array.from(
      new Set(subjectQuestions.map(extractQuestionBankExamYear).filter(Boolean)),
    ).sort();

    return {
      subject,
      total: subjectQuestions.length,
      choiceCount: subjectQuestions.filter(
        (question) => (question.choices?.length ?? 0) > 0,
      ).length,
      masteredCount,
      masteryPercent: masteryPercent(masteredCount, subjectQuestions.length),
      examQuestionCount: subjectQuestions.filter((question) =>
        Boolean(extractQuestionBankExamYear(question)),
      ).length,
      examYears,
      chapters: Array.from(chapterGroups, ([chapter, items]) =>
        buildChapterInsight(chapter, items),
      ).sort(
        (a, b) =>
          b.examYears.length - a.examYears.length ||
          b.total - a.total ||
          a.chapter.localeCompare(b.chapter, "zh-CN"),
      ),
    };
  });
}
