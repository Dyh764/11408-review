import type {
  AnswerSource,
  AnswerStatus,
  Confidence,
  QuestionSource,
  QuestionTextStatus,
  ReviewPriority,
} from "@/lib/types";

export function getQuestionTextStatusLabel(status: QuestionTextStatus | null | undefined) {
  if (status === "verified") {
    return "题目已核对";
  }

  if (status === "needs_fix") {
    return "题目需修正";
  }

  return "题目待核对";
}

export function getQuestionTextStatusShortLabel(status: QuestionTextStatus | null | undefined) {
  if (status === "verified") {
    return "已核对";
  }

  if (status === "needs_fix") {
    return "需修正";
  }

  return "待核对";
}

export function getQuestionTextStatusTone(status: QuestionTextStatus | null | undefined) {
  if (status === "verified") {
    return "green" as const;
  }

  if (status === "needs_fix") {
    return "red" as const;
  }

  return "amber" as const;
}

export function getAnswerStatusLabel(status: AnswerStatus | null | undefined) {
  if (status === "verified") {
    return "答案已核对";
  }

  if (status === "needs_fix") {
    return "答案需修正";
  }

  return "答案待核对";
}

export function getAnswerStatusShortLabel(status: AnswerStatus | null | undefined) {
  if (status === "verified") {
    return "已核对";
  }

  if (status === "needs_fix") {
    return "需修正";
  }

  return "待核对";
}

export function getAnswerStatusTone(status: AnswerStatus | null | undefined) {
  if (status === "verified") {
    return "green" as const;
  }

  if (status === "needs_fix") {
    return "red" as const;
  }

  return "amber" as const;
}

export function getAnswerSourceLabel(source: AnswerSource | null | undefined) {
  if (source === "manual") {
    return "手动录入";
  }

  if (source === "ai_enhanced") {
    return "AI 增强";
  }

  if (source === "unknown") {
    return "来源未知";
  }

  return "ChatGPT 整理";
}

export function getQuestionSourceLabel(source: QuestionSource | null | undefined) {
  if (source === "pending_chatgpt") {
    return "待 ChatGPT 整理";
  }

  if (source === "ai_analysis") {
    return "AI 自动分析";
  }

  if (source === "manual") {
    return "手动录入";
  }

  if (source === "upload") {
    return "拍照上传";
  }

  return "ChatGPT 整理";
}

export function getReviewPriorityLabel(priority: ReviewPriority | string | null | undefined) {
  if (priority === "high") {
    return "高优先级";
  }

  if (priority === "low") {
    return "低优先级";
  }

  return "中优先级";
}

export function getConfidenceLabel(confidence: Confidence | string | null | undefined) {
  if (confidence === "high") {
    return "可信度高";
  }

  if (confidence === "medium") {
    return "可信度中";
  }

  return "可信度低";
}
