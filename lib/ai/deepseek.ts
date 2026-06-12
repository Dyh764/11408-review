import { getDeepSeekConfig } from "@/lib/env";
import type { Confidence, ReviewPriority } from "@/lib/types";

type JsonRecord = Record<string, unknown>;

export type DeepSeekQuestionEnhancement = {
  chapter: string;
  knowledge_point: string;
  mistake_types: string[];
  solution_summary: string;
  one_sentence_tip: string;
  review_priority: ReviewPriority;
  confidence: Confidence;
  needs_manual_check: boolean;
};

export type DeepSeekLearningInsight = {
  summary: string;
  today_focus: string[];
  weak_points: Array<{
    subject: string;
    knowledge_point: string;
    reason: string;
    priority: ReviewPriority;
  }>;
  mistake_patterns: string[];
  recommended_tasks: Array<{
    title: string;
    reason: string;
    estimated_minutes: number;
  }>;
  review_strategy: string;
  warning: string;
};

export type DeepSeekMotivationLine = {
  line: string;
};

export function getDeepSeekStatus() {
  const config = getDeepSeekConfig();

  return {
    configured: Boolean(config.apiKey),
    model: config.model,
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function asPriority(value: unknown): ReviewPriority {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function asConfidence(value: unknown): Confidence {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

export function validateQuestionEnhancement(value: unknown): DeepSeekQuestionEnhancement {
  if (!isRecord(value)) {
    throw new Error("DeepSeek 返回内容不是 JSON 对象。");
  }

  const mistakeTypes = value.mistake_types;

  if (
    typeof value.chapter !== "string" ||
    typeof value.knowledge_point !== "string" ||
    !isStringArray(mistakeTypes) ||
    typeof value.solution_summary !== "string" ||
    typeof value.one_sentence_tip !== "string" ||
    typeof value.needs_manual_check !== "boolean"
  ) {
    throw new Error("DeepSeek 单题优化结果结构不符合要求。");
  }

  return {
    chapter: value.chapter,
    knowledge_point: value.knowledge_point,
    mistake_types: mistakeTypes.slice(0, 8),
    solution_summary: value.solution_summary,
    one_sentence_tip: value.one_sentence_tip,
    review_priority: asPriority(value.review_priority),
    confidence: asConfidence(value.confidence),
    needs_manual_check: value.needs_manual_check,
  };
}

export function validateLearningInsight(value: unknown): DeepSeekLearningInsight {
  if (!isRecord(value)) {
    throw new Error("DeepSeek 返回内容不是 JSON 对象。");
  }

  if (
    typeof value.summary !== "string" ||
    !isStringArray(value.today_focus) ||
    !isStringArray(value.mistake_patterns) ||
    typeof value.review_strategy !== "string" ||
    typeof value.warning !== "string" ||
    !Array.isArray(value.weak_points) ||
    !Array.isArray(value.recommended_tasks)
  ) {
    throw new Error("DeepSeek 学习分析结果结构不符合要求。");
  }

  return {
    summary: value.summary,
    today_focus: value.today_focus.slice(0, 6),
    weak_points: value.weak_points
      .filter(isRecord)
      .slice(0, 6)
      .map((item) => ({
        subject: typeof item.subject === "string" ? item.subject : "未分类",
        knowledge_point:
          typeof item.knowledge_point === "string" ? item.knowledge_point : "未分类",
        reason: typeof item.reason === "string" ? item.reason : "规则统计显示需要关注。",
        priority: asPriority(item.priority),
      })),
    mistake_patterns: value.mistake_patterns.slice(0, 6),
    recommended_tasks: value.recommended_tasks
      .filter(isRecord)
      .slice(0, 6)
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "复盘薄弱题",
        reason: typeof item.reason === "string" ? item.reason : "规则统计显示需要巩固。",
        estimated_minutes:
          typeof item.estimated_minutes === "number"
            ? Math.max(5, Math.min(90, Math.round(item.estimated_minutes)))
            : 15,
      })),
    review_strategy: value.review_strategy,
    warning: value.warning,
  };
}

export function validateMotivationLine(value: unknown): string {
  if (!isRecord(value) || typeof value.line !== "string") {
    throw new Error("DeepSeek 每日激励句结构不符合要求。");
  }

  return value.line.trim();
}

function extractJsonText(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    throw new Error("DeepSeek 响应缺少 choices。");
  }

  const firstChoice = value.choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("DeepSeek 响应缺少 message。");
  }

  const content = firstChoice.message.content;

  if (typeof content !== "string") {
    throw new Error("DeepSeek 响应内容不是字符串。");
  }

  return content;
}

async function callDeepSeekJson(systemPrompt: string, userPayload: unknown) {
  const config = getDeepSeekConfig();

  if (!config.apiKey) {
    throw new Error("DeepSeek 未启用（可选）。");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek 请求失败：${response.status} ${errorText.slice(0, 160)}`);
  }

  return JSON.parse(extractJsonText(await response.json())) as unknown;
}

export async function enhanceQuestionWithDeepSeek(payload: unknown) {
  const raw = await callDeepSeekJson(
    [
      "你是学习数据分析员，只能根据给定错题字段优化错题卡。",
      "不要生成图片，不要伪造原题，不要覆盖人工核对题干。",
      "只返回 JSON，字段为 chapter, knowledge_point, mistake_types, solution_summary, one_sentence_tip, review_priority, confidence, needs_manual_check。",
    ].join("\n"),
    payload,
  );

  return validateQuestionEnhancement(raw);
}

export async function generateLearningInsightWithDeepSeek(payload: unknown) {
  const raw = await callDeepSeekJson(
    [
      "你是学习数据分析员，只解释错题、复习和薄弱点摘要。",
      "不要生成图片，不要伪造题目，不要决定真实掌握状态。",
      "只返回 JSON，字段为 summary, today_focus, weak_points, mistake_patterns, recommended_tasks, review_strategy, warning。",
    ].join("\n"),
    payload,
  );

  return validateLearningInsight(raw);
}

export async function generateMotivationLineWithDeepSeek(payload: unknown) {
  const raw = await callDeepSeekJson(
    [
      "你只为考研复习生成一句原创中文短句。",
      "风格温柔、积极、有一点诗意，不要太鸡汤。",
      "不要写真实歌词，不要模仿具体歌手，不要声称来自任何歌手。",
      "只返回 JSON，字段为 line，长度 8 到 42 个中文字符。",
    ].join("\n"),
    payload,
  );

  return validateMotivationLine(raw);
}
