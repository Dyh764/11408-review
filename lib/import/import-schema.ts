import type {
  Confidence,
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  ReviewPriority,
  Subject,
} from "@/lib/types";

export type ImportQuestionCard = {
  image_code?: string;
  image_path?: string;
  subject: Subject;
  chapter?: string;
  knowledge_point?: string;
  question_text?: string;
  question_text_status: QuestionTextStatus;
  mastery_status: MasteryStatus;
  user_note?: string;
  mistake_types: string[];
  solution_summary?: string;
  one_sentence_tip?: string;
  review_priority: ReviewPriority;
  confidence?: Confidence;
  needs_manual_check: boolean;
  source: QuestionSource;
};

export type ImportRowError = {
  index: number;
  message: string;
};

export type ImportParsedCard = {
  index: number;
  card: ImportQuestionCard;
};

export type ImportParseResult = {
  cards: ImportParsedCard[];
  errors: ImportRowError[];
};

export const importSubjects: Subject[] = [
  "数学",
  "数据结构",
  "计算机组成原理",
  "操作系统",
  "计算机网络",
];

export const importMasteryStatuses: MasteryStatus[] = [
  "完全没思路",
  "有一点思路",
  "思路对但卡住",
  "计算错误",
  "做对但不稳",
  "完全掌握",
];

const questionTextStatuses: QuestionTextStatus[] = ["ai_unverified", "verified", "needs_fix"];
const reviewPriorities: ReviewPriority[] = ["low", "medium", "high"];
const confidences: Confidence[] = ["low", "medium", "high"];

export const importExampleJson = JSON.stringify(
  [
    {
      image_code: "2026-06-05-math-001",
      subject: "数学",
      chapter: "二重积分",
      knowledge_point: "积分区域与换序",
      question_text: "题目文字",
      question_text_status: "ai_unverified",
      mastery_status: "思路对但卡住",
      user_note: "我想先算0-1先积x，但是积分那里卡住了",
      mistake_types: ["积分限判断不稳", "没优先看对称性"],
      solution_summary: "先画区域，再判断是否能利用对称性，避免硬拆。",
      one_sentence_tip: "二重积分先看区域对称性，再决定积分顺序。",
      review_priority: "high",
      confidence: "medium",
      needs_manual_check: true,
      source: "chatgpt",
    },
  ],
  null,
  2,
);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${field} 必须是字符串。`);
  }

  return value.trim();
}

function optionalStringArray(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${field} 必须是字符串数组。`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${field} 不合法：${allowed.join("、")}。`);
  }

  return value as T;
}

function defaultPriorityFromMastery(masteryStatus: MasteryStatus): ReviewPriority {
  if (masteryStatus === "完全没思路" || masteryStatus === "有一点思路") {
    return "high";
  }

  if (masteryStatus === "完全掌握" || masteryStatus === "做对但不稳") {
    return "low";
  }

  return "medium";
}

function normalizeRow(value: unknown): ImportQuestionCard {
  if (!isObject(value)) {
    throw new Error("每条错题卡必须是 JSON object。");
  }

  const subject = requireEnum(value.subject, "subject", importSubjects);
  const masteryStatus = requireEnum(
    value.mastery_status,
    "mastery_status",
    importMasteryStatuses,
  );
  const questionText = optionalString(value.question_text, "question_text");
  const userNote = optionalString(value.user_note, "user_note");

  if (!questionText && !userNote) {
    throw new Error("question_text 和 user_note 至少需要填写一个。");
  }

  const questionTextStatus =
    value.question_text_status === undefined || value.question_text_status === null
      ? "ai_unverified"
      : requireEnum(value.question_text_status, "question_text_status", questionTextStatuses);
  const reviewPriority =
    value.review_priority === undefined || value.review_priority === null
      ? defaultPriorityFromMastery(masteryStatus)
      : requireEnum(value.review_priority, "review_priority", reviewPriorities);
  const confidence =
    value.confidence === undefined || value.confidence === null
      ? undefined
      : requireEnum(value.confidence, "confidence", confidences);
  const needsManualCheck =
    value.needs_manual_check === undefined || value.needs_manual_check === null
      ? true
      : value.needs_manual_check;

  if (typeof needsManualCheck !== "boolean") {
    throw new Error("needs_manual_check 必须是 boolean。");
  }

  return {
    image_code: optionalString(value.image_code, "image_code") || undefined,
    image_path: optionalString(value.image_path, "image_path") || undefined,
    subject,
    chapter: optionalString(value.chapter, "chapter") || undefined,
    knowledge_point: optionalString(value.knowledge_point, "knowledge_point") || undefined,
    question_text: questionText || undefined,
    question_text_status: questionTextStatus,
    mastery_status: masteryStatus,
    user_note: userNote || undefined,
    mistake_types: optionalStringArray(value.mistake_types, "mistake_types"),
    solution_summary: optionalString(value.solution_summary, "solution_summary") || undefined,
    one_sentence_tip: optionalString(value.one_sentence_tip, "one_sentence_tip") || undefined,
    review_priority: reviewPriority,
    confidence,
    needs_manual_check: needsManualCheck,
    source: "chatgpt_import",
  };
}

export function parseImportJsonText(input: string): ImportParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return {
      cards: [],
      errors: [{ index: 0, message: "JSON 解析失败，请确认粘贴的是 JSON 数组。" }],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      cards: [],
      errors: [{ index: 0, message: "第一版只支持 JSON 数组。" }],
    };
  }

  return parsed.reduce<ImportParseResult>(
    (result, row, rowIndex) => {
      try {
        result.cards.push({
          index: rowIndex + 1,
          card: normalizeRow(row),
        });
      } catch (error) {
        result.errors.push({
          index: rowIndex + 1,
          message: error instanceof Error ? error.message : "该条错题卡校验失败。",
        });
      }

      return result;
    },
    { cards: [], errors: [] },
  );
}

export function imagePathBelongsToUser(imagePath: string, userId: string) {
  return imagePath.startsWith(`users/${userId}/questions/`);
}
