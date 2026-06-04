import type { Confidence, MockAnalysis, QuestionTextStatus, ReviewPriority, Subject } from "@/lib/types";

const subjects: Subject[] = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];
const questionTextStatuses: Array<Extract<QuestionTextStatus, "ai_unverified" | "needs_fix">> = [
  "ai_unverified",
  "needs_fix",
];
const reviewPriorities: ReviewPriority[] = ["low", "medium", "high"];
const confidences: Confidence[] = ["low", "medium", "high"];

export const questionAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "question_text",
    "question_text_status",
    "subject",
    "chapter",
    "knowledge_point",
    "mistake_types",
    "solution_summary",
    "one_sentence_tip",
    "review_priority",
    "confidence",
    "needs_manual_check",
  ],
  properties: {
    question_text: { type: "string" },
    question_text_status: {
      type: "string",
      enum: questionTextStatuses,
    },
    subject: {
      type: "string",
      enum: subjects,
    },
    chapter: { type: "string" },
    knowledge_point: { type: "string" },
    mistake_types: {
      type: "array",
      items: { type: "string" },
    },
    solution_summary: { type: "string" },
    one_sentence_tip: { type: "string" },
    review_priority: {
      type: "string",
      enum: reviewPriorities,
    },
    confidence: {
      type: "string",
      enum: confidences,
    },
    needs_manual_check: { type: "boolean" },
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateQuestionAnalysis(value: unknown): MockAnalysis | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    typeof value.question_text !== "string" ||
    !questionTextStatuses.includes(value.question_text_status as never) ||
    !subjects.includes(value.subject as never) ||
    typeof value.chapter !== "string" ||
    typeof value.knowledge_point !== "string" ||
    !isStringArray(value.mistake_types) ||
    typeof value.solution_summary !== "string" ||
    typeof value.one_sentence_tip !== "string" ||
    !reviewPriorities.includes(value.review_priority as never) ||
    !confidences.includes(value.confidence as never) ||
    typeof value.needs_manual_check !== "boolean"
  ) {
    return null;
  }

  return {
    question_text: value.question_text,
    question_text_status: value.question_text_status as MockAnalysis["question_text_status"],
    subject: value.subject as Subject,
    chapter: value.chapter,
    knowledge_point: value.knowledge_point,
    mistake_types: value.mistake_types,
    solution_summary: value.solution_summary,
    one_sentence_tip: value.one_sentence_tip,
    review_priority: value.review_priority as ReviewPriority,
    confidence: value.confidence as Confidence,
    needs_manual_check: value.needs_manual_check,
  };
}

export function buildNeedsFixAnalysis(subject: Subject, reason: string): MockAnalysis {
  return {
    question_text: "",
    question_text_status: "needs_fix",
    subject,
    chapter: "",
    knowledge_point: "",
    mistake_types: ["题目条件识别错误"],
    solution_summary: reason,
    one_sentence_tip: "请先核对原图和题干，再重新分析。",
    review_priority: "medium",
    confidence: "low",
    needs_manual_check: true,
  };
}
