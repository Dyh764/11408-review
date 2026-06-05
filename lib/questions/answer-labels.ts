import type { AnswerSource, AnswerStatus } from "@/lib/types";

export function getAnswerStatusLabel(status: AnswerStatus | null | undefined) {
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
    return "blue" as const;
  }

  if (status === "needs_fix") {
    return "red" as const;
  }

  return "amber" as const;
}

export function getAnswerSourceLabel(source: AnswerSource | null | undefined) {
  if (source === "manual") {
    return "手动编辑";
  }

  if (source === "ai_enhanced") {
    return "AI 增强";
  }

  if (source === "unknown") {
    return "来源未知";
  }

  return "ChatGPT 导入";
}
