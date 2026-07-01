import type { ChoiceOption } from "../types";

export type ShareQuestionInput = {
  subject?: string | null;
  chapter?: string | null;
  knowledge_point?: string | null;
  difficulty?: string | null;
  question_text?: string | null;
  choices?: ChoiceOption[] | null;
  mistake_types?: string[] | null;
  one_sentence_tip?: string | null;
  standard_answer?: string | null;
  answer_explanation?: string | null;
};

export type ExportedQuestionCard = {
  question_text: string;
  knowledge_point: string;
  difficulty: string;
  mistake_types: string[];
  one_sentence_tip: string;
  choices: ChoiceOption[];
  answer: string;
  explanation: string;
};

export type ShareCardImageModel = {
  width: 1080;
  height: 1350;
  theme: "purple";
  subject: string;
  knowledgePoint: string;
  questionText: string;
  choices: ChoiceOption[];
  mistakeTypes: string[];
  oneSentenceTip: string;
  difficulty: string;
};

function clean(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function clampText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function normalizeChoices(choices: ChoiceOption[] | null | undefined): ChoiceOption[] {
  return (choices ?? [])
    .map((choice) => ({
      label: clean(choice.label).toUpperCase(),
      text: clean(choice.text),
    }))
    .filter((choice) => choice.label && choice.text);
}

export function exportQuestionCard(question: ShareQuestionInput): ExportedQuestionCard {
  return {
    question_text: clean(question.question_text) || "暂无题干",
    knowledge_point: clean(question.knowledge_point) || "待整理知识点",
    difficulty: clean(question.difficulty) || "未标注",
    mistake_types: (question.mistake_types ?? []).map((item) => item.trim()).filter(Boolean),
    one_sentence_tip:
      clean(question.one_sentence_tip) || "先回看题干和错因，再整理一句话提示。",
    choices: normalizeChoices(question.choices),
    answer: clean(question.standard_answer) || "暂无答案",
    explanation: clean(question.answer_explanation) || "暂无解析",
  };
}

export function buildShareCardImageModel(question: ShareQuestionInput): ShareCardImageModel {
  const exported = exportQuestionCard(question);

  return {
    width: 1080,
    height: 1350,
    theme: "purple",
    subject: clean(question.subject) || "错题本",
    knowledgePoint: clampText(exported.knowledge_point, 90),
    questionText: clampText(exported.question_text, 760),
    choices: exported.choices,
    mistakeTypes: exported.mistake_types.slice(0, 4),
    oneSentenceTip: clampText(exported.one_sentence_tip, 120),
    difficulty: exported.difficulty,
  };
}
