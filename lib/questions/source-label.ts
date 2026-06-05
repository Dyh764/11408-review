import type { QuestionSource, QuestionTextStatus } from "@/lib/types";
import { getQuestionSourceLabel as getQuestionSourceEnumLabel } from "@/lib/questions/meta-labels";

type SourceLabelInput = {
  source?: QuestionSource | null;
  question_text_status: QuestionTextStatus;
  needs_manual_check?: boolean;
  user_note?: string | null;
  solution_summary?: string | null;
};

export function getQuestionSourceLabel(question: SourceLabelInput) {
  if (
    question.source === "pending_chatgpt" ||
    (question.question_text_status === "needs_fix" &&
      question.user_note?.includes("待 ChatGPT 整理"))
  ) {
    return "待 ChatGPT 整理";
  }

  if (question.source) {
    return getQuestionSourceEnumLabel(question.source);
  }

  if (question.question_text_status === "verified") {
    return "已核对";
  }

  if (question.needs_manual_check) {
    return "需核对";
  }

  if (question.solution_summary) {
    return "AI 自动分析";
  }

  return "手动录入";
}
