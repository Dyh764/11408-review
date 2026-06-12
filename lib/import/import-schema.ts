import type {
  AnswerSource,
  AnswerStatus,
  ChoiceOption,
  Confidence,
  Difficulty,
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  ReviewPriority,
  Subject,
} from "@/lib/types";
import { extractChoicesFromQuestionText, splitQuestionTextAndChoices } from "../questions/extract-choices.ts";

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
  普通: "中等",
  困难: "较难",
  难: "较难",
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
只输出 JSON，不要 Markdown。
数学公式必须使用 LaTeX，并用 $...$ 包裹。
选择题请把 A/B/C/D 放进 choices 数组，不要全部塞进 question_text。
standard_answer 必须以“答案：”开头。
answer_explanation 必须以“过程：”开头。

每题字段包括：
subject
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
      subject: "数学",
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
