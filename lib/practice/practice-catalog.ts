import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  ReviewPriority,
} from "../types";
import { sortQuestionsForChapterList } from "../questions/question-sort.ts";

export type PracticeQuestion = {
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
  mistake_types: string[] | null;
  priority_score?: number | null;
  created_at?: string | null;
};

export type PracticeChapterOption = {
  subject: string;
  chapter: string;
  count: number;
  needsAttentionCount: number;
  priorityScore: number;
};

export type PracticeMistakeOption = {
  mistakeType: string;
  count: number;
};

export type PracticeFilter =
  | { type: "chapter"; subject: string; chapter: string }
  | { type: "mistake"; mistakeType: string }
  | { type: "topic"; topic: string };

const untaggedMistakeType = "未标注错因";

function priorityValue(question: PracticeQuestion) {
  if (typeof question.priority_score === "number") {
    return question.priority_score;
  }

  let score = 0;

  if (question.review_priority === "high") score += 60;
  if (question.review_priority === "medium") score += 30;
  if (question.needs_manual_check) score += 20;
  if (question.question_text_status === "needs_fix") score += 20;
  if (question.answer_status === "needs_fix") score += 20;
  if (question.difficulty === "压轴" || question.difficulty === "较难") score += 10;

  return score;
}

function needsAttention(question: PracticeQuestion) {
  return (
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    question.review_priority === "high"
  );
}

function chapterLabel(question: PracticeQuestion) {
  return question.chapter?.trim() || "未分类 / 待整理";
}

function mistakeLabels(question: PracticeQuestion) {
  const labels = question.mistake_types?.map((item) => item.trim()).filter(Boolean) ?? [];
  return labels.length > 0 ? labels : [untaggedMistakeType];
}

export function buildPracticeCatalog(questions: PracticeQuestion[]) {
  const chapterMap = new Map<string, PracticeChapterOption>();
  const mistakeMap = new Map<string, number>();

  for (const question of questions) {
    const subject = question.subject?.trim() || "未分类";
    const chapter = chapterLabel(question);
    const chapterKey = `${subject}\n${chapter}`;
    const currentChapter = chapterMap.get(chapterKey) ?? {
      subject,
      chapter,
      count: 0,
      needsAttentionCount: 0,
      priorityScore: 0,
    };

    currentChapter.count += 1;
    currentChapter.priorityScore = Math.max(currentChapter.priorityScore, priorityValue(question));
    if (needsAttention(question)) {
      currentChapter.needsAttentionCount += 1;
    }
    chapterMap.set(chapterKey, currentChapter);

    for (const mistakeType of mistakeLabels(question)) {
      mistakeMap.set(mistakeType, (mistakeMap.get(mistakeType) ?? 0) + 1);
    }
  }

  return {
    chapterOptions: Array.from(chapterMap.values()).sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        b.needsAttentionCount - a.needsAttentionCount ||
        b.count - a.count,
    ),
    mistakeOptions: Array.from(mistakeMap, ([mistakeType, count]) => ({ mistakeType, count }))
      .sort((a, b) => b.count - a.count || a.mistakeType.localeCompare(b.mistakeType, "zh-CN")),
  };
}

export function filterPracticeQuestions<T extends PracticeQuestion>(
  questions: T[],
  filter: PracticeFilter,
) {
  return sortQuestionsForChapterList(
    questions.filter((question) => {
      if (filter.type === "chapter") {
        return question.subject === filter.subject && chapterLabel(question) === filter.chapter;
      }

      if (filter.type === "topic") {
        const topic = filter.topic.trim();
        return question.knowledge_point?.trim() === topic || chapterLabel(question) === topic;
      }

      return mistakeLabels(question).includes(filter.mistakeType);
    }),
  );
}
