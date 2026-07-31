import { parseAnswerChoiceLabels } from "../questions/answer-choice.ts";
import { questionDependsOnImage } from "../questions/question-image.ts";
import type { ChoiceOption, QuestionSourceInfo } from "../types.ts";

export type PracticeAnswerMode =
  | "standard"
  | "editable"
  | "repeat"
  | "open-book"
  | "quick-fill";

export const practiceAnswerModeOptions: Array<{
  key: Exclude<PracticeAnswerMode, "standard">;
  label: string;
  description: string;
}> = [
  {
    key: "editable",
    label: "修改模式",
    description: "提交后可改选，再以最后一次答案计入本轮",
  },
  {
    key: "repeat",
    label: "多刷模式",
    description: "题目不退出队列，可循环反复作答",
  },
  {
    key: "open-book",
    label: "开卷模式",
    description: "不作答直接看答案，用于快速回顾",
  },
  {
    key: "quick-fill",
    label: "快速回填",
    description: "对照答案，一键标记做对或做错",
  },
];

export const practiceAnswerModeLabels: Record<PracticeAnswerMode, string> = {
  standard: "普通刷题",
  editable: "修改模式",
  repeat: "多刷模式",
  "open-book": "开卷模式",
  "quick-fill": "快速回填",
};

export function parsePracticeAnswerMode(value: string | null | undefined): PracticeAnswerMode {
  return value === "editable" ||
    value === "repeat" ||
    value === "open-book" ||
    value === "quick-fill"
    ? value
    : "standard";
}

export type PracticeModeQuestion = {
  subject: string;
  question_text?: string | null;
  choices?: ChoiceOption[] | null;
  standard_answer?: string | null;
  answer_explanation?: string | null;
  image_path?: string | null;
  source_info?: QuestionSourceInfo | null;
};

const practiceSubjects = new Set([
  "数据结构",
  "计算机组成原理",
  "操作系统",
  "计算机网络",
]);

export function canUseQuestionInAnswerMode(
  question: PracticeModeQuestion,
  mode: PracticeAnswerMode,
) {
  const hasQuestion =
    practiceSubjects.has(question.subject) &&
    Boolean(question.question_text?.trim()) &&
    (question.choices?.length ?? 0) > 0;
  const hasRequiredImage =
    !questionDependsOnImage(question) || Boolean(question.image_path?.trim());

  if (!hasQuestion || !hasRequiredImage || mode === "standard") {
    return hasQuestion && hasRequiredImage;
  }

  if (mode === "open-book") {
    return Boolean(
      question.standard_answer?.trim() || question.answer_explanation?.trim(),
    );
  }

  return parseAnswerChoiceLabels(question.standard_answer).labels.length > 0;
}
