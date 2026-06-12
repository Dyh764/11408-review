import type { ImportParseResult, ImportQuestionCard, ImportParsedCard } from "./import-schema";

export type ImportQualitySeverity = "error" | "warning" | "info";

export type ImportQualityIssue = {
  severity: ImportQualitySeverity;
  label: string;
  detail?: string;
};

export type ImportQualityRow = {
  index: number;
  importable: boolean;
  recommendedInbox: boolean;
  issues: ImportQualityIssue[];
};

export type ImportQualityReport = {
  totalCount: number;
  importableCount: number;
  inboxRecommendedCount: number;
  seriousCount: number;
  rows: ImportQualityRow[];
};

const inboxChapter = "待整理";
const maxStemLength = 900;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawString(raw: unknown, field: string) {
  return isRecord(raw) && typeof raw[field] === "string" ? raw[field].trim() : "";
}

function hasInvalidChoices(raw: unknown) {
  if (!isRecord(raw) || raw.choices === undefined || raw.choices === null) {
    return false;
  }

  return (
    !Array.isArray(raw.choices) ||
    raw.choices.some((choice) => {
      if (!isRecord(choice)) {
        return true;
      }

      return typeof choice.label !== "string" || typeof choice.text !== "string";
    })
  );
}

function hasUnclosedDollar(text: string) {
  const markers = text.match(/(?<!\\)\${1,2}/g) ?? [];
  return markers.length % 2 === 1;
}

function hasBareLatex(text: string) {
  return /\\(?:frac|sum|int|lim|sqrt|alpha|beta|theta|infty|left|right)\b/.test(text) &&
    !/(?<!\\)\$/.test(text);
}

function hasMojibakeRisk(text: string) {
  return /�|Ã|Â|鈥|锛|绋|闂|涓/.test(text);
}

function allText(card: ImportQuestionCard) {
  return [
    card.question_text,
    card.user_note,
    card.standard_answer,
    card.answer_explanation,
    card.solution_summary,
    card.one_sentence_tip,
    ...card.key_steps,
    ...card.choices.map((choice) => `${choice.label} ${choice.text}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function addIssue(issues: ImportQualityIssue[], severity: ImportQualitySeverity, label: string, detail?: string) {
  issues.push({ severity, label, detail });
}

function inspectCard(item: ImportParsedCard): ImportQualityRow {
  const { card, raw } = item;
  const issues: ImportQualityIssue[] = [];
  const text = allText(card);
  const rawQuestionText = rawString(raw, "question_text");

  if (!card.question_text?.trim()) {
    addIssue(issues, "error", "缺少题干");
  }

  if (!card.chapter?.trim()) {
    addIssue(issues, "warning", "缺少章节");
  }

  if (!card.knowledge_point?.trim()) {
    addIssue(issues, "warning", "缺少知识点");
  }

  if (!card.difficulty) {
    addIssue(issues, "warning", "缺少难度");
  }

  if (hasInvalidChoices(raw)) {
    addIssue(issues, "warning", "choices 格式异常");
  }

  if (card.choices.length > 0 && !card.standard_answer?.trim()) {
    addIssue(issues, "error", "选择题缺少标准答案");
  }

  if (card.standard_answer?.trim() && !card.standard_answer.trim().startsWith("答案：")) {
    addIssue(issues, "warning", "标准答案建议以“答案：”开头");
  }

  if (card.answer_explanation?.trim() && !card.answer_explanation.trim().startsWith("过程：")) {
    addIssue(issues, "warning", "解析建议以“过程：”开头");
  }

  if (hasBareLatex(text)) {
    addIssue(issues, "warning", "存在裸露 LaTeX 风险");
  }

  if (hasUnclosedDollar(text)) {
    addIssue(issues, "warning", "公式可能未闭合");
  }

  if (hasMojibakeRisk(text)) {
    addIssue(issues, "warning", "可能存在乱码");
  }

  if (rawQuestionText.length > maxStemLength) {
    addIssue(issues, "info", "题干较长，注意移动端换行");
  }

  const hasWarning = issues.some((issue) => issue.severity === "warning");

  if (hasWarning) {
    addIssue(issues, "info", "建议进入待整理");
  }

  return {
    index: item.index,
    importable: !issues.some((issue) => issue.severity === "error"),
    recommendedInbox: hasWarning,
    issues,
  };
}

export function getImportQualityReport(result: ImportParseResult): ImportQualityReport {
  const rows: ImportQualityRow[] = [
    ...result.cards.map(inspectCard),
    ...result.errors.map((error) => ({
      index: error.index,
      importable: false,
      recommendedInbox: false,
      issues: [{ severity: "error" as const, label: "严重错误", detail: error.message }],
    })),
  ].sort((a, b) => a.index - b.index);

  return {
    totalCount: rows.length,
    importableCount: rows.filter((row) => row.importable).length,
    inboxRecommendedCount: rows.filter((row) => row.recommendedInbox).length,
    seriousCount: rows.filter((row) => !row.importable).length,
    rows,
  };
}

export function applyInboxDefaults(card: ImportQuestionCard, reasons: string[] = []): ImportQuestionCard {
  const reasonTags = reasons
    .map((reason) => reason.trim())
    .filter(Boolean)
    .map((reason) => `待整理：${reason}`);
  const existingTags = new Set(card.mistake_types);
  const nextTags = [...card.mistake_types];

  for (const tag of reasonTags) {
    if (!existingTags.has(tag)) {
      nextTags.push(tag);
    }
  }

  return {
    ...card,
    chapter: card.chapter?.trim() || inboxChapter,
    question_text_status: "needs_fix",
    answer_status: card.standard_answer?.trim() ? "needs_fix" : card.answer_status,
    review_priority: "high",
    needs_manual_check: true,
    mistake_types: nextTags,
  };
}
