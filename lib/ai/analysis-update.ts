import type { QuestionTextStatus } from "@/lib/types";

type ExistingQuestionText = {
  question_text: string | null;
  question_text_status: QuestionTextStatus;
};

type AnalysisPayload = {
  question_text: string;
  question_text_status: QuestionTextStatus;
  subject: string;
  chapter: string;
  knowledge_point: string;
  mistake_types: string[];
  solution_summary: string;
  one_sentence_tip: string;
  review_priority: string;
  confidence: string;
  needs_manual_check: boolean;
};

export function buildAnalysisUpdatePayload(
  question: ExistingQuestionText,
  analysis: AnalysisPayload,
  allowOverwriteQuestionText: boolean,
) {
  const shouldPreserveVerifiedText =
    question.question_text_status === "verified" && !allowOverwriteQuestionText;

  return {
    question_text: shouldPreserveVerifiedText ? question.question_text : analysis.question_text,
    question_text_status: shouldPreserveVerifiedText
      ? question.question_text_status
      : analysis.question_text_status,
    subject: analysis.subject,
    chapter: analysis.chapter,
    knowledge_point: analysis.knowledge_point,
    mistake_types: analysis.mistake_types,
    solution_summary: analysis.solution_summary,
    one_sentence_tip: analysis.one_sentence_tip,
    review_priority: analysis.review_priority,
    confidence: analysis.confidence,
    needs_manual_check: analysis.needs_manual_check,
    source: "ai_analysis",
    analyzed_at: new Date().toISOString(),
  };
}
