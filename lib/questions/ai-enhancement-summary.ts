import type { Confidence, ReviewPriority } from "@/lib/types";

export type AiEnhancementSnapshot = {
  chapter: string | null;
  knowledge_point: string | null;
  mistake_types: string[] | null;
  solution_summary: string | null;
  one_sentence_tip: string | null;
  review_priority: ReviewPriority | string | null;
  confidence: Confidence | string | null;
  needs_manual_check: boolean;
};

export type AiEnhancementSummary = {
  changedCount: number;
  title: string;
  items: string[];
};

const priorityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const confidenceLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeList(value: string[] | null | undefined) {
  return Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));
}

function formatValue(value: string) {
  return value || "空";
}

function fromTo(label: string, before: string, after: string) {
  return `${label}：从“${formatValue(before)}”改为“${formatValue(after)}”`;
}

function summarizeList(before: string[], after: string[]) {
  const added = after.filter((item) => !before.includes(item));
  const removed = before.filter((item) => !after.includes(item));

  if (added.length > 0 && removed.length === 0) {
    return `错因：新增“${added.join("、")}”`;
  }

  if (removed.length > 0 && added.length === 0) {
    return `错因：移除“${removed.join("、")}”`;
  }

  return fromTo("错因", before.join("、"), after.join("、"));
}

export function buildAiEnhancementSummary(
  before: AiEnhancementSnapshot,
  after: AiEnhancementSnapshot,
): AiEnhancementSummary {
  const items: string[] = [];

  const textPairs: Array<[keyof AiEnhancementSnapshot, string, "full" | "updated"]> = [
    ["chapter", "章节", "full"],
    ["knowledge_point", "知识点", "full"],
    ["solution_summary", "思路摘要", "updated"],
    ["one_sentence_tip", "一句话提醒", "updated"],
  ];

  for (const [key, label, mode] of textPairs) {
    const beforeText = normalizeText(before[key] as string | null | undefined);
    const afterText = normalizeText(after[key] as string | null | undefined);

    if (beforeText !== afterText) {
      items.push(mode === "full" ? fromTo(label, beforeText, afterText) : `${label}：已更新`);
    }
  }

  const beforeMistakes = normalizeList(before.mistake_types);
  const afterMistakes = normalizeList(after.mistake_types);
  if (beforeMistakes.join("\n") !== afterMistakes.join("\n")) {
    items.push(summarizeList(beforeMistakes, afterMistakes));
  }

  const beforePriority = normalizeText(before.review_priority);
  const afterPriority = normalizeText(after.review_priority);
  if (beforePriority !== afterPriority) {
    items.push(
      fromTo(
        "复习优先级",
        priorityLabels[beforePriority] ?? beforePriority,
        priorityLabels[afterPriority] ?? afterPriority,
      ),
    );
  }

  const beforeConfidence = normalizeText(before.confidence);
  const afterConfidence = normalizeText(after.confidence);
  if (beforeConfidence !== afterConfidence) {
    items.push(
      fromTo(
        "AI 置信度",
        confidenceLabels[beforeConfidence] ?? beforeConfidence,
        confidenceLabels[afterConfidence] ?? afterConfidence,
      ),
    );
  }

  if (before.needs_manual_check !== after.needs_manual_check) {
    items.push(
      fromTo(
        "人工核对",
        before.needs_manual_check ? "需要核对" : "无需核对",
        after.needs_manual_check ? "需要核对" : "无需核对",
      ),
    );
  }

  return {
    changedCount: items.length,
    title:
      items.length > 0
        ? `AI 已优化 ${items.length} 项：`
        : "AI 已检查题卡，未发现需要明显修改的字段。",
    items,
  };
}
