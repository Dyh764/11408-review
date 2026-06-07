import type { Difficulty } from "@/lib/types";

type GroupableQuestion = {
  subject: string;
  difficulty?: Difficulty | string | null;
  created_at: string;
};

export type QuestionSubjectGroup<T extends GroupableQuestion> = {
  subject: string;
  count: number;
  items: T[];
};

const difficultyRank = new Map<string, number>([
  ["基础", 0],
  ["中等", 1],
  ["较难", 2],
  ["压轴", 3],
]);

function getDifficultyRank(difficulty?: string | null) {
  return difficulty ? difficultyRank.get(difficulty) ?? 4 : 4;
}

export function groupQuestionsBySubjectAndDifficulty<T extends GroupableQuestion>(
  questions: T[],
): QuestionSubjectGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const question of questions) {
    const subject = question.subject || "未标科目";
    const items = groups.get(subject) ?? [];
    items.push(question);
    groups.set(subject, items);
  }

  return Array.from(groups, ([subject, items]) => ({
    subject,
    count: items.length,
    items: [...items].sort(
      (a, b) =>
        getDifficultyRank(a.difficulty) - getDifficultyRank(b.difficulty) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  }));
}
