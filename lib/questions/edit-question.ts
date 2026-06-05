import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  Subject,
} from "@/lib/types";

export type QuestionEditForm = {
  question_text: string;
  question_text_status: QuestionTextStatus;
  subject: Subject;
  chapter: string;
  knowledge_point: string;
  difficulty: Difficulty | "";
  mastery_status: MasteryStatus;
  user_note: string;
  mistake_types: string;
  solution_summary: string;
  standard_answer: string;
  answer_explanation: string;
  key_steps: string;
  answer_status: AnswerStatus;
  one_sentence_tip: string;
};

export type QuestionUpdatePayload = {
  question_text: string | null;
  question_text_status: QuestionTextStatus;
  subject: Subject;
  chapter: string | null;
  knowledge_point: string | null;
  difficulty: Difficulty | null;
  mastery_status: MasteryStatus;
  user_note: string | null;
  mistake_types: string[];
  solution_summary: string | null;
  standard_answer: string | null;
  answer_explanation: string | null;
  key_steps: string[];
  answer_status: AnswerStatus;
  answer_source: "manual";
  one_sentence_tip: string | null;
};

function nullableTrim(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseMistakeTypes(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，;；\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function buildQuestionUpdatePayload(form: QuestionEditForm): QuestionUpdatePayload {
  return {
    question_text: nullableTrim(form.question_text),
    question_text_status: form.question_text_status,
    subject: form.subject,
    chapter: nullableTrim(form.chapter),
    knowledge_point: nullableTrim(form.knowledge_point),
    difficulty: form.difficulty || null,
    mastery_status: form.mastery_status,
    user_note: nullableTrim(form.user_note),
    mistake_types: parseMistakeTypes(form.mistake_types),
    solution_summary: nullableTrim(form.solution_summary),
    standard_answer: nullableTrim(form.standard_answer),
    answer_explanation: nullableTrim(form.answer_explanation),
    key_steps: parseMistakeTypes(form.key_steps),
    answer_status: form.answer_status,
    answer_source: "manual",
    one_sentence_tip: nullableTrim(form.one_sentence_tip),
  };
}
