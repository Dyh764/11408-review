import type { ChoiceOption } from "../types";

export type QuestionImageSignals = {
  image_code?: string | null;
  image_path?: string | null;
  signedImageUrl?: string | null;
  question_text?: string | null;
  user_note?: string | null;
  choices?: ChoiceOption[] | null;
};

export type PracticeImageAvailability = "available" | "not_required" | "missing";

const imageDependencyPattern =
  /如图|见图|下图|上图|图中|图示|所示图|根据.{0,8}图|由.{0,8}图|如表|下表|上表|表中|拓扑图|时序图|流程图|结构图|示意图|波形图|状态图|存储器芯片图/;

function hasRequiredImageCode(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && !["none", "null", "无", "不需要", "false"].includes(normalized));
}

function noteImageCode(value: string | null | undefined) {
  return value?.match(/(?:^|\n)\s*image_code\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
}

export function questionDependsOnImage(question: QuestionImageSignals) {
  if (
    hasRequiredImageCode(question.image_code) ||
    hasRequiredImageCode(noteImageCode(question.user_note))
  ) {
    return true;
  }

  const searchableText = [
    question.question_text,
    ...(question.choices ?? []).map((choice) => choice.text),
  ]
    .filter(Boolean)
    .join("\n");

  return imageDependencyPattern.test(searchableText);
}

export function getPracticeImageAvailability(
  question: QuestionImageSignals,
): PracticeImageAvailability {
  if (question.signedImageUrl?.trim()) {
    return "available";
  }

  if (question.image_path?.trim() || questionDependsOnImage(question)) {
    return "missing";
  }

  return "not_required";
}

export function canUseQuestionInPractice(question: QuestionImageSignals) {
  return getPracticeImageAvailability(question) !== "missing";
}
