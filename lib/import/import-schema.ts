import type {
  AnswerSource,
  AnswerStatus,
  ChoiceOption,
  Confidence,
  Difficulty,
  MasteryStatus,
  QuestionSource,
  QuestionSourceInfo,
  QuestionTextStatus,
  ReviewPriority,
  Subject,
} from "@/lib/types";
import { extractChoicesFromQuestionText, splitQuestionTextAndChoices } from "../questions/extract-choices.ts";
import { normalizeQuestionSourceInfo } from "../questions/source-info.ts";

export type ImportQuestionCard = {
  image_code?: string;
  image_path?: string;
  subject: Subject;
  chapter?: string;
  knowledge_point?: string;
  difficulty?: Difficulty;
  question_text?: string;
  choices: ChoiceOption[];
  question_text_status: QuestionTextStatus;
  mastery_status: MasteryStatus;
  user_note?: string;
  mistake_types: string[];
  solution_summary?: string;
  standard_answer?: string;
  answer_explanation?: string;
  key_steps: string[];
  one_sentence_tip?: string;
  review_priority: ReviewPriority;
  confidence?: Confidence;
  needs_manual_check: boolean;
  source: QuestionSource;
  source_info: QuestionSourceInfo;
  answer_status: AnswerStatus;
  answer_source: AnswerSource;
};

export type ImportRowError = {
  index: number;
  message: string;
};

export type ImportParsedCard = {
  index: number;
  card: ImportQuestionCard;
  raw: unknown;
};

export type ImportParseResult = {
  cards: ImportParsedCard[];
  errors: ImportRowError[];
  sanitizedText?: string;
  repairNotices?: string[];
};

export type ImportDiagnosticType =
  | "JSON格式错误"
  | "中文弯引号错误"
  | "LaTeX反斜杠转义错误"
  | "字段缺失"
  | "字段类型错误"
  | "source格式错误"
  | "choices格式错误"
  | "chapter不合法"
  | "difficulty不合法"
  | "LaTeX错误"
  | "转义错误";

export type ImportDiagnostic = {
  type: ImportDiagnosticType;
  line: number;
  character: number;
  field?: string;
  snippet: string;
  suggestion: string;
  fixedExample: string;
};

export type ImportDiagnosticResult = ImportParseResult & {
  diagnostics: ImportDiagnostic[];
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
const difficulties: Difficulty[] = ["基础", "中等", "较难", "压轴"];
const answerStatuses: AnswerStatus[] = ["ai_unverified", "verified", "needs_fix"];
const answerSources: AnswerSource[] = ["chatgpt_import", "manual", "ai_enhanced", "unknown"];
const reviewPriorities: ReviewPriority[] = ["low", "medium", "high"];
const confidences: Confidence[] = ["low", "medium", "high"];
const mathSubjectAliases = ["高等数学", "线性代数", "概率论与数理统计"] as const;
const difficultyAliases: Record<string, Difficulty> = {
  简单: "基础",
  容易: "基础",
  普通: "中等",
  困难: "较难",
  较难: "较难",
  难: "较难",
  高难: "压轴",
  压轴题: "压轴",
};
const masteryStatusAliases: Record<string, MasteryStatus> = {
  完全不会: "完全没思路",
  不会: "完全没思路",
  需要复习: "有一点思路",
  需复习: "有一点思路",
  "公式遗忘，需复习": "有一点思路",
  "公式遗忘,需复习": "有一点思路",
  已理解但需复习: "做对但不稳",
  已理解但方向需复习: "做对但不稳",
  已理解但需巩固: "做对但不稳",
  已理解: "做对但不稳",
  已掌握: "完全掌握",
};
const reviewPriorityAliases: Record<string, ReviewPriority> = {
  低: "low",
  中: "medium",
  高: "high",
  低优先级: "low",
  中优先级: "medium",
  高优先级: "high",
};
const confidenceAliases: Record<string, Confidence> = {
  低: "low",
  中: "medium",
  高: "high",
  低可信度: "low",
  中可信度: "medium",
  高可信度: "high",
};

const specificParseFailureMessage =
  "JSON 解析失败，可能原因：引号不是英文双引号、LaTeX 反斜杠未转义、数组逗号缺失、括号未闭合。";

const latexCommandPattern = /^[A-Za-z]+/;
const validEscapeCharacters = new Set(['"', "\\", "/", "b", "f", "n", "r", "t"]);

type ImportJsonSanitizeReport = {
  text: string;
  changedCurlyQuotes: boolean;
  fixedLatexBackslashes: boolean;
};

type JsonStringDelimiter = "ascii" | "curly";

export const chatGptImportPrompt = `请把今天的考研数学错题整理成可导入 11408-review 的 JSON 数组。
只输出 JSON 数组，不要 Markdown。
不要解释。
使用 import_protocol_version = "2.0"。
必须包含 source；没有来源时 source.raw 写“未标来源”。
LaTeX 反斜杠必须双写。
数学公式必须使用 LaTeX，并用 $...$ 包裹。
选择题请把 A/B/C/D 放进 choices 数组，不要全部塞进 question_text。
standard_answer 必须以“答案：”开头。
answer_explanation 必须以“过程：”开头。

每题字段包括：
import_protocol_version
subject
source
chapter
knowledge_point
difficulty
question_text
choices
mastery_status
user_note
mistake_types
solution_summary
standard_answer
answer_explanation
key_steps
one_sentence_tip
review_priority
confidence
needs_manual_check
answer_status
answer_source`;

export const importExampleJson = JSON.stringify(
  [
    {
      import_protocol_version: "2.0",
      subject: "数学",
      source: {
        type: "练习册",
        name: "未标来源",
        section: "高等数学",
        volume: "",
        paper: "",
        page: "",
        problem_number: "",
        raw: "未标来源",
      },
      chapter: "幂级数",
      knowledge_point: "幂级数收敛半径、比值法",
      difficulty: "基础",
      question_text: "设幂级数 $\\sum_{n=1}^{\\infty} \\frac{x^n}{n\\cdot 3^n}$ 的收敛半径为 $R$，则 $R=$",
      choices: [
        { label: "A", text: "$1$" },
        { label: "B", text: "$2$" },
        { label: "C", text: "$3$" },
        { label: "D", text: "$\\frac{1}{3}$" },
      ],
      mastery_status: "有一点思路",
      user_note: "把 $3^n$ 放错位置，误以为半径是 $\\frac{1}{3}$。",
      mistake_types: ["概念混淆", "比值法不熟"],
      solution_summary: "把通项看成 $a_n x^n$，先求 $|a_{n+1}/a_n|$。",
      standard_answer: "答案：C",
      answer_explanation: "过程：$a_n=\\frac{1}{n\\cdot 3^n}$，$\\left|\\frac{a_{n+1}}{a_n}\\right|=\\frac{n}{n+1}\\cdot\\frac{1}{3}\\to\\frac{1}{3}$，所以收敛半径 $R=3$。",
      key_steps: ["识别 $a_n=\\frac{1}{n\\cdot 3^n}$", "计算 $\\lim |a_{n+1}/a_n|=\\frac{1}{3}$", "得到 $R=3$"],
      one_sentence_tip: "幂级数先分清 $a_n$ 和 $x^n$，半径是比值极限的倒数。",
      review_priority: "medium",
      confidence: "medium",
      needs_manual_check: true,
      answer_status: "ai_unverified",
      answer_source: "chatgpt_import",
    },
  ],
  null,
  2,
);

function isHexDigit(value: string | undefined) {
  return Boolean(value && /[0-9a-fA-F]/.test(value));
}

function hasValidUnicodeEscape(input: string, index: number) {
  return (
    input[index + 1] === "u" &&
    isHexDigit(input[index + 2]) &&
    isHexDigit(input[index + 3]) &&
    isHexDigit(input[index + 4]) &&
    isHexDigit(input[index + 5])
  );
}

function sanitizeImportJsonTextWithReport(input: string): ImportJsonSanitizeReport {
  let inString = false;
  let delimiter: JsonStringDelimiter = "ascii";
  let changedCurlyQuotes = false;
  let fixedLatexBackslashes = false;
  let text = "";

  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];

    if (current === "‘" || current === "’") {
      text += "'";
      changedCurlyQuotes = true;
      continue;
    }

    if (!inString) {
      if (current === '"' || current === "“" || current === "”") {
        text += '"';
        inString = true;
        delimiter = current === '"' ? "ascii" : "curly";
        changedCurlyQuotes = changedCurlyQuotes || current !== '"';
      } else {
        text += current;
      }
      continue;
    }

    if (
      (delimiter === "ascii" && current === '"') ||
      (delimiter === "curly" && (current === "“" || current === "”"))
    ) {
      inString = false;
      text += '"';
      changedCurlyQuotes = changedCurlyQuotes || current !== '"';
      continue;
    }

    if (delimiter === "ascii" && (current === "“" || current === "”")) {
      text += '\\"';
      changedCurlyQuotes = true;
      continue;
    }

    if (current !== "\\") {
      text += current;
      continue;
    }

    const next = input[index + 1];
    const command = input.slice(index + 1).match(latexCommandPattern)?.[0] ?? "";

    if (command.length > 1) {
      text += "\\\\";
      fixedLatexBackslashes = true;
      continue;
    }

    if (next === "u" && hasValidUnicodeEscape(input, index)) {
      text += input.slice(index, index + 6);
      index += 5;
      continue;
    }

    if (next && validEscapeCharacters.has(next)) {
      text += `\\${next}`;
      index += 1;
      continue;
    }

    text += "\\\\";
    fixedLatexBackslashes = true;
  }

  return {
    text,
    changedCurlyQuotes,
    fixedLatexBackslashes,
  };
}

export function sanitizeImportJsonText(input: string) {
  return sanitizeImportJsonTextWithReport(input).text;
}

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

function requireMappedEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  aliases: Record<string, T>,
) {
  if (typeof value !== "string") {
    throw new Error(`${field} 不合法：${allowed.join("、")}。`);
  }

  const normalizedValue = value.trim();
  const mapped = aliases[normalizedValue];
  if (mapped) {
    return mapped;
  }

  return requireEnum(normalizedValue, field, allowed);
}

function normalizeSubject(value: unknown): Subject {
  if (typeof value !== "string") {
    throw new Error(
      `subject 不合法：${[...importSubjects, ...mathSubjectAliases].join("、")}。`,
    );
  }

  const normalizedValue = value.trim();
  if (mathSubjectAliases.includes(normalizedValue as (typeof mathSubjectAliases)[number])) {
    return "数学";
  }

  return requireEnum(normalizedValue, "subject", importSubjects);
}

function normalizeChapterForSubject(rawSubject: unknown, rawChapter: string) {
  if (typeof rawSubject !== "string") {
    return rawChapter || undefined;
  }

  const subject = rawSubject.trim();
  if (!mathSubjectAliases.includes(subject as (typeof mathSubjectAliases)[number])) {
    return rawChapter || undefined;
  }

  if (!rawChapter) {
    return subject;
  }

  if (rawChapter === subject || rawChapter.startsWith(`${subject}-`)) {
    return rawChapter;
  }

  return `${subject}-${rawChapter}`;
}

function normalizeImportSourceInfo(value: unknown): QuestionSourceInfo {
  if (value === undefined || value === null || value === "") {
    return normalizeQuestionSourceInfo(null);
  }

  if (typeof value === "string") {
    return normalizeQuestionSourceInfo(value);
  }

  if (!isObject(value)) {
    throw new Error("source 必须是对象或字符串。");
  }

  const allowedFields: Array<keyof QuestionSourceInfo> = [
    "type",
    "name",
    "section",
    "volume",
    "paper",
    "page",
    "problem_number",
    "raw",
  ];
  const sourceInfo: Partial<QuestionSourceInfo> = {};

  for (const field of allowedFields) {
    const fieldValue = value[field];
    if (fieldValue === undefined || fieldValue === null) {
      sourceInfo[field] = "";
      continue;
    }

    if (typeof fieldValue !== "string") {
      throw new Error("source 格式错误：type、name、section、volume、paper、page、problem_number、raw 必须是字符串。");
    }

    sourceInfo[field] = fieldValue.trim();
  }

  return normalizeQuestionSourceInfo(sourceInfo);
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

  const subject = normalizeSubject(value.subject);
  const rawChapter = optionalString(value.chapter, "chapter");
  const masteryStatus = requireMappedEnum(
    value.mastery_status,
    "mastery_status",
    importMasteryStatuses,
    masteryStatusAliases,
  );
  const questionText = optionalString(value.question_text, "question_text");
  const userNote = optionalString(value.user_note, "user_note");
  const sourceInfo = normalizeImportSourceInfo(value.source);

  if (!questionText && !userNote) {
    throw new Error("question_text 和 user_note 至少需要填写一个。");
  }

  const questionTextStatus =
    value.question_text_status === undefined || value.question_text_status === null
      ? "ai_unverified"
      : requireEnum(value.question_text_status, "question_text_status", questionTextStatuses);
  const difficulty =
    value.difficulty === undefined || value.difficulty === null || value.difficulty === ""
      ? undefined
      : requireMappedEnum(value.difficulty, "difficulty", difficulties, difficultyAliases);
  const answerStatus =
    value.answer_status === undefined || value.answer_status === null
      ? "ai_unverified"
      : requireEnum(value.answer_status, "answer_status", answerStatuses);
  const answerSource =
    value.answer_source === undefined || value.answer_source === null
      ? "chatgpt_import"
      : requireEnum(value.answer_source, "answer_source", answerSources);
  const reviewPriority =
    value.review_priority === undefined || value.review_priority === null
      ? defaultPriorityFromMastery(masteryStatus)
      : requireMappedEnum(
          value.review_priority,
          "review_priority",
          reviewPriorities,
          reviewPriorityAliases,
        );
  const confidence =
    value.confidence === undefined || value.confidence === null
      ? undefined
      : requireMappedEnum(value.confidence, "confidence", confidences, confidenceAliases);
  const needsManualCheck =
    value.needs_manual_check === undefined || value.needs_manual_check === null
      ? true
      : value.needs_manual_check;

  if (typeof needsManualCheck !== "boolean") {
    throw new Error("needs_manual_check 必须是 boolean。");
  }

  const choices = extractChoicesFromQuestionText(questionText, value.choices);
  if (value.choices !== undefined && value.choices !== null && !Array.isArray(value.choices)) {
    throw new Error("choices 必须是数组。");
  }
  const displayQuestionText =
    choices.length > 0 && value.choices === undefined
      ? splitQuestionTextAndChoices(questionText).questionText
      : questionText;

  return {
    image_code: optionalString(value.image_code, "image_code") || undefined,
    image_path: optionalString(value.image_path, "image_path") || undefined,
    subject,
    chapter: normalizeChapterForSubject(value.subject, rawChapter),
    knowledge_point: optionalString(value.knowledge_point, "knowledge_point") || undefined,
    difficulty,
    question_text: displayQuestionText || undefined,
    choices,
    question_text_status: questionTextStatus,
    mastery_status: masteryStatus,
    user_note: userNote || undefined,
    mistake_types: optionalStringArray(value.mistake_types, "mistake_types"),
    solution_summary: optionalString(value.solution_summary, "solution_summary") || undefined,
    standard_answer: optionalString(value.standard_answer, "standard_answer") || undefined,
    answer_explanation:
      optionalString(value.answer_explanation, "answer_explanation") || undefined,
    key_steps: optionalStringArray(value.key_steps, "key_steps"),
    one_sentence_tip: optionalString(value.one_sentence_tip, "one_sentence_tip") || undefined,
    review_priority: reviewPriority,
    confidence,
    needs_manual_check: needsManualCheck,
    source: "chatgpt_import",
    source_info: sourceInfo,
    answer_status: answerStatus,
    answer_source: answerSource,
  };
}

function parseImportArray(parsed: unknown): ImportParseResult {
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
          raw: row,
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

function getLineAndCharacter(input: string, offset: number) {
  const safeOffset = Math.max(0, Math.min(offset, input.length));
  const before = input.slice(0, safeOffset);
  const lines = before.split(/\r?\n/);

  return {
    line: lines.length,
    character: lines[lines.length - 1].length + 1,
  };
}

function findJsonErrorOffset(message: string, input: string) {
  const positionMatch = message.match(/position (\d+)/i);
  if (positionMatch) {
    return Number(positionMatch[1]);
  }

  const lineColumnMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1]);
    const column = Number(lineColumnMatch[2]);
    const lines = input.split(/\r?\n/);
    return lines.slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0) + column - 1;
  }

  return Math.max(0, input.length - 1);
}

function snippetAround(input: string, offset: number, length = 96) {
  const safeOffset = Math.max(0, Math.min(offset, input.length));
  const start = Math.max(0, safeOffset - Math.floor(length / 2));
  const end = Math.min(input.length, start + length);
  return input.slice(start, end).trim() || input.trim().slice(0, length);
}

function findFieldOffset(input: string, field: string | undefined, fallback = 0) {
  if (!field) return fallback;
  const quotedIndex = input.indexOf(`"${field}"`);
  if (quotedIndex >= 0) return quotedIndex;
  const plainIndex = input.indexOf(field);
  return plainIndex >= 0 ? plainIndex : fallback;
}

function fixedExampleForField(field?: string) {
  const row: Record<string, unknown> = {
    import_protocol_version: "2.0",
    subject: "数学",
    source: {
      type: "未标来源",
      name: "未标来源",
      section: "",
      volume: "",
      paper: "",
      page: "",
      problem_number: "",
      raw: "未标来源",
    },
    chapter: "函数、极限与连续",
    knowledge_point: "等价无穷小",
    difficulty: "中等",
    question_text: "求 $\\lim_{x\\to0}\\frac{\\sin x}{x}$。",
    mastery_status: "有一点思路",
    user_note: "混淆了等价无穷小。",
    mistake_types: ["概念不清"],
    standard_answer: "答案：1",
    answer_explanation: "过程：$\\sin x \\sim x$。",
    one_sentence_tip: "先找可替换的等价无穷小。",
    review_priority: "medium",
    confidence: "medium",
    needs_manual_check: true,
    answer_status: "ai_unverified",
    answer_source: "chatgpt_import",
  };

  if (field && !(field in row)) {
    row[field] = "请按字段要求填写";
  }

  return JSON.stringify([row], null, 2);
}

function fieldFromErrorMessage(message: string) {
  const knownFields = [
    "subject",
    "chapter",
    "knowledge_point",
    "difficulty",
    "source",
    "question_text",
    "choices",
    "question_text_status",
    "mastery_status",
    "user_note",
    "mistake_types",
    "solution_summary",
    "standard_answer",
    "answer_explanation",
    "key_steps",
    "one_sentence_tip",
    "review_priority",
    "confidence",
    "needs_manual_check",
    "answer_status",
    "answer_source",
  ];

  return knownFields.find((field) => message.includes(field));
}

function diagnosticTypeFromRowError(message: string): ImportDiagnosticType {
  if (message.includes("source")) {
    return "source格式错误";
  }

  if (message.includes("choices")) {
    return "choices格式错误";
  }

  if (message.includes("chapter")) {
    return "chapter不合法";
  }

  if (message.includes("difficulty")) {
    return "difficulty不合法";
  }

  if (message.includes("question_text") && message.includes("user_note")) {
    return "字段缺失";
  }

  if (message.includes("必须") || message.includes("boolean") || message.includes("数组") || message.includes("不合法")) {
    return "字段类型错误";
  }

  return "字段缺失";
}

function diagnosticSuggestion(type: ImportDiagnosticType, field?: string) {
  if (type === "JSON格式错误") {
    return "检查 JSON 的逗号、括号、双引号和数组闭合；确保整体是 JSON 数组。";
  }

  if (type === "转义错误") {
    return "检查反斜杠转义；LaTeX 命令在 JSON 字符串中建议写成双反斜杠，例如 \\\\frac。";
  }

  if (type === "LaTeX错误") {
    return "检查公式分隔符是否成对出现，并确认 LaTeX 命令没有缺少反斜杠或右括号。";
  }

  if (type === "source格式错误") {
    return "source 可以是标准对象或来源字符串；对象内 type、name、section、volume、paper、page、problem_number、raw 都应是字符串。";
  }

  if (type === "choices格式错误") {
    return "choices 必须是数组；没有选项时请写 []，选择题请写成 [{\"label\":\"A\",\"text\":\"...\"}]。";
  }

  if (type === "chapter不合法") {
    return "请把 chapter 归入当前目录，例如三重积分、曲线曲面积分、无穷级数或待整理 / 未分类。";
  }

  if (type === "difficulty不合法") {
    return "difficulty 请使用简单、中等、困难，或兼容旧值基础、较难、压轴。";
  }

  if (type === "字段类型错误") {
    return `${field ?? "字段"} 的类型不符合导入要求，请按示例改成字符串、布尔值或字符串数组。`;
  }

  return `${field ?? "必填字段"} 缺失或为空，请补齐后再导入。`;
}

function hasInvalidJsonEscape(input: string) {
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] !== "\\") continue;
    const next = input[index + 1];
    if (!next) return index;

    if (next === "u") {
      if (!hasValidUnicodeEscape(input, index)) return index;
      index += 5;
      continue;
    }

    if (!validEscapeCharacters.has(next)) return index;
    index += 1;
  }

  return -1;
}

function mathDiagnosticForCard(card: ImportQuestionCard, rawText: string): ImportDiagnostic | null {
  const fields: Array<{ field: keyof ImportQuestionCard; value?: string }> = [
    { field: "question_text", value: card.question_text },
    { field: "standard_answer", value: card.standard_answer },
    { field: "answer_explanation", value: card.answer_explanation },
    { field: "one_sentence_tip", value: card.one_sentence_tip },
  ];

  for (const item of fields) {
    const value = item.value ?? "";
    const hasUnbalancedMath =
      (value.match(/\$/g)?.length ?? 0) % 2 !== 0 ||
      (value.match(/\\\(/g)?.length ?? 0) !== (value.match(/\\\)/g)?.length ?? 0) ||
      (value.match(/\\\[/g)?.length ?? 0) !== (value.match(/\\\]/g)?.length ?? 0);

    if (hasUnbalancedMath) {
      const field = String(item.field);
      const offset = findFieldOffset(rawText, field);
      return {
        type: "LaTeX错误",
        ...getLineAndCharacter(rawText, offset),
        field,
        snippet: snippetAround(rawText, offset),
        suggestion: diagnosticSuggestion("LaTeX错误", field),
        fixedExample: fixedExampleForField(field),
      };
    }
  }

  return null;
}

function buildJsonDiagnostic(input: string, error: unknown): ImportDiagnostic {
  const message = error instanceof Error ? error.message : "";
  const invalidEscapeOffset = hasInvalidJsonEscape(input);
  const type: ImportDiagnosticType = invalidEscapeOffset >= 0 ? "转义错误" : "JSON格式错误";
  const offset = invalidEscapeOffset >= 0 ? invalidEscapeOffset : findJsonErrorOffset(message, input);

  return {
    type,
    ...getLineAndCharacter(input, offset),
    snippet: snippetAround(input, offset),
    suggestion: diagnosticSuggestion(type),
    fixedExample: fixedExampleForField(),
  };
}

function buildJsonFormatDiagnostic(input: string, error: unknown): ImportDiagnostic {
  const message = error instanceof Error ? error.message : "";
  const offset = findJsonErrorOffset(message, input);

  return {
    type: "JSON格式错误",
    ...getLineAndCharacter(input, offset),
    snippet: snippetAround(input, offset),
    suggestion: diagnosticSuggestion("JSON格式错误"),
    fixedExample: fixedExampleForField(),
  };
}

function buildRowDiagnostic(input: string, error: ImportRowError): ImportDiagnostic {
  const field = fieldFromErrorMessage(error.message);
  const type = diagnosticTypeFromRowError(error.message);
  const offset = findFieldOffset(input, field);

  return {
    type,
    ...getLineAndCharacter(input, offset),
    field,
    snippet: snippetAround(input, offset),
    suggestion: diagnosticSuggestion(type, field),
    fixedExample: fixedExampleForField(field),
  };
}

function buildManualFieldDiagnostic(
  input: string,
  field: string,
  type: ImportDiagnosticType,
): ImportDiagnostic {
  const offset = findFieldOffset(input, field);

  return {
    type,
    ...getLineAndCharacter(input, offset),
    field,
    snippet: snippetAround(input, offset),
    suggestion: diagnosticSuggestion(type, field),
    fixedExample: fixedExampleForField(field),
  };
}

function buildCommonFieldDiagnostics(parsed: unknown, input: string) {
  const diagnostics: ImportDiagnostic[] = [];

  if (!Array.isArray(parsed)) {
    return diagnostics;
  }

  for (const row of parsed) {
    if (!isObject(row)) {
      continue;
    }

    if (
      row.source !== undefined &&
      row.source !== null &&
      typeof row.source !== "string"
    ) {
      if (!isObject(row.source)) {
        diagnostics.push(buildManualFieldDiagnostic(input, "source", "source格式错误"));
      } else {
        const source = row.source as Record<string, unknown>;
        const hasBadSourceField = [
          "type",
          "name",
          "section",
          "volume",
          "paper",
          "page",
          "problem_number",
          "raw",
        ].some((field) => {
          const value = source[field];
          return value !== undefined && value !== null && typeof value !== "string";
        });

        if (hasBadSourceField) {
          diagnostics.push(buildManualFieldDiagnostic(input, "source", "source格式错误"));
        }
      }
    }

    if (row.choices !== undefined && row.choices !== null && !Array.isArray(row.choices)) {
      diagnostics.push(buildManualFieldDiagnostic(input, "choices", "choices格式错误"));
    }
  }

  return diagnostics;
}

export function parseImportWithDiagnostics(input: string): ImportDiagnosticResult {
  let parsed: unknown;
  let sanitizedText: string | undefined;
  let repairNotices: string[] | undefined;
  const diagnostics: ImportDiagnostic[] = [];

  try {
    parsed = JSON.parse(input);
  } catch (firstError) {
    const sanitized = sanitizeImportJsonTextWithReport(input);

    try {
      parsed = JSON.parse(sanitized.text);
      sanitizedText = sanitized.text !== input ? sanitized.text : undefined;
      repairNotices = [
        sanitized.changedCurlyQuotes ? "检测到中文弯引号：已尝试转换。" : "",
        sanitized.fixedLatexBackslashes ? "检测到 LaTeX 单反斜杠：已尝试转义。" : "",
      ].filter(Boolean);

      if (sanitized.fixedLatexBackslashes) {
        diagnostics.push(buildJsonDiagnostic(input, firstError));
      }
    } catch (secondError) {
      return {
        cards: [],
        errors: [{ index: 0, message: specificParseFailureMessage }],
        diagnostics: [buildJsonFormatDiagnostic(input, secondError)],
      };
    }
  }

  const commonDiagnostics = buildCommonFieldDiagnostics(parsed, sanitizedText ?? input);
  if (commonDiagnostics.length > 0) {
    return {
      cards: [],
      errors: commonDiagnostics.map((diagnostic, index) => ({
        index: index + 1,
        message: diagnostic.suggestion,
      })),
      sanitizedText,
      repairNotices,
      diagnostics: commonDiagnostics,
    };
  }

  const result = parseImportArray(parsed);
  diagnostics.push(...result.errors.map((error) => buildRowDiagnostic(sanitizedText ?? input, error)));

  for (const parsedCard of result.cards) {
    const mathDiagnostic = mathDiagnosticForCard(parsedCard.card, sanitizedText ?? input);
    if (mathDiagnostic) diagnostics.push(mathDiagnostic);
  }

  return {
    ...result,
    cards: diagnostics.length > 0 ? [] : result.cards,
    sanitizedText,
    repairNotices,
    diagnostics,
  };
}

export function parseImportJsonText(input: string): ImportParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
    return parseImportArray(parsed);
  } catch {
    const sanitized = sanitizeImportJsonTextWithReport(input);

    try {
      parsed = JSON.parse(sanitized.text);
    } catch {
      return {
        cards: [],
        errors: [{ index: 0, message: specificParseFailureMessage }],
      };
    }

    const result = parseImportArray(parsed);
    if (result.errors.length > 0) {
      return result;
    }

    const repairNotices = [
      sanitized.changedCurlyQuotes ? "检测到中文弯引号：已尝试转换。" : "",
      sanitized.fixedLatexBackslashes ? "检测到 LaTeX 单反斜杠：已尝试转义。" : "",
    ].filter(Boolean);

    return {
      ...result,
      sanitizedText: sanitized.text !== input ? sanitized.text : undefined,
      repairNotices,
    };
  }
}

export function imagePathBelongsToUser(imagePath: string, userId: string) {
  return imagePath.startsWith(`users/${userId}/questions/`);
}
