export type ExportQuestion = {
  id: string;
  user_id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  image_path: string | null;
  question_text: string | null;
  question_text_status: string;
  mastery_status: string;
  user_note: string | null;
  mistake_types: string[] | null;
  solution_summary: string | null;
  one_sentence_tip: string | null;
  review_priority: string | null;
  confidence: string | null;
  needs_manual_check: boolean;
  source: string | null;
  created_at: string;
  analyzed_at: string | null;
};

export type ExportReview = {
  id: string;
  user_id: string;
  question_id: string;
  scheduled_date: string;
  completed_at: string | null;
  review_result: string | null;
  created_at: string;
};

export type ExportReport = {
  id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  content_json: unknown;
  created_at: string;
};

export type ExportKnowledgeStat = {
  id: string;
  user_id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string;
  wrong_count: number;
  no_idea_count: number;
  stuck_count: number;
  repeated_wrong_count: number;
  failed_review_count: number;
  overdue_review_count: number;
  mastered_count: number;
  weakness_score: number;
  updated_at: string;
};

export type ExportDataset = {
  exported_at: string;
  user_id: string;
  questions: ExportQuestion[];
  reviews: ExportReview[];
  reports: ExportReport[];
  knowledge_stats: ExportKnowledgeStat[];
};

type ExportFormat = "json" | "markdown" | "csv";

function dateKeyInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return `${parts.find((part) => part.type === "year")?.value ?? "1970"}-${
    parts.find((part) => part.type === "month")?.value ?? "01"
  }-${parts.find((part) => part.type === "day")?.value ?? "01"}`;
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("；") : String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}

function groupKey(question: ExportQuestion) {
  return `${question.subject} - ${question.chapter || "未分类章节"}`;
}

export function exportFileName(format: ExportFormat, date = new Date(), timezone = "Asia/Shanghai") {
  return `11408-review-export-${dateKeyInTimeZone(date, timezone)}.${format === "markdown" ? "md" : format}`;
}

export function buildJsonExport(dataset: ExportDataset) {
  return JSON.stringify(dataset, null, 2);
}

export function buildMarkdownExport(dataset: ExportDataset) {
  const reviewsByQuestion = new Map<string, ExportReview[]>();

  dataset.reviews.forEach((review) => {
    const rows = reviewsByQuestion.get(review.question_id) ?? [];
    rows.push(review);
    reviewsByQuestion.set(review.question_id, rows);
  });

  const groups = new Map<string, ExportQuestion[]>();
  dataset.questions.forEach((question) => {
    const key = groupKey(question);
    const rows = groups.get(key) ?? [];
    rows.push(question);
    groups.set(key, rows);
  });

  const lines = [
    "# 11408 错题导出",
    "",
    `导出时间：${dataset.exported_at}`,
    "",
    "说明：图片不会打包进导出文件，题目图片字段保留 Supabase Storage 的 image_path。signed URL 可能会过期。",
    "",
  ];

  for (const [key, questions] of groups) {
    lines.push(`## ${key}`, "");
    questions.forEach((question, index) => {
      const reviewLines = (reviewsByQuestion.get(question.id) ?? [])
        .map((review) => {
          const result = review.review_result ?? "未完成";
          return `${review.scheduled_date} ${result}`;
        })
        .join("；") || "暂无";

      lines.push(
        `### 错题 ${index + 1}`,
        "",
        `- 掌握状态：${question.mastery_status}`,
        `- 知识点：${question.knowledge_point ?? "未分类"}`,
        `- 错因：${question.mistake_types?.join("、") || "未填写"}`,
        `- 题目图片：${question.image_path ?? "未绑定原图"}`,
        `- 题目文字：${question.question_text ?? "暂无"}`,
        `- 我的备注：${question.user_note ?? "无"}`,
        `- 正确思路：${question.solution_summary ?? "暂无"}`,
        `- 一句话提醒：${question.one_sentence_tip ?? "暂无"}`,
        `- 复习记录：${reviewLines}`,
        "",
      );
    });
  }

  if (dataset.questions.length === 0) {
    lines.push("暂无错题数据。", "");
  }

  return lines.join("\n");
}

export function buildCsvExport(dataset: ExportDataset) {
  const columns: Array<keyof ExportQuestion> = [
    "id",
    "subject",
    "chapter",
    "knowledge_point",
    "mastery_status",
    "question_text_status",
    "source",
    "mistake_types",
    "user_note",
    "solution_summary",
    "one_sentence_tip",
    "created_at",
  ];

  const rows = dataset.questions.map((question) =>
    columns.map((column) => csvCell(question[column])).join(","),
  );

  return [columns.join(","), ...rows].join("\n");
}

export async function fetchCurrentUserExportDataset(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExportDataset> {
  const [questionsResult, reviewsResult, reportsResult, statsResult] = await Promise.all([
    supabase
      .from("questions")
      .select(
        "id,user_id,subject,chapter,knowledge_point,image_path,question_text,question_text_status,mastery_status,user_note,mistake_types,solution_summary,one_sentence_tip,review_priority,confidence,needs_manual_check,source,created_at,analyzed_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id,user_id,question_id,scheduled_date,completed_at,review_result,created_at")
      .eq("user_id", userId)
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("reports")
      .select("id,user_id,type,start_date,end_date,content_json,created_at")
      .eq("user_id", userId)
      .order("start_date", { ascending: false }),
    supabase
      .from("knowledge_stats")
      .select(
        "id,user_id,subject,chapter,knowledge_point,wrong_count,no_idea_count,stuck_count,repeated_wrong_count,failed_review_count,overdue_review_count,mastered_count,weakness_score,updated_at",
      )
      .eq("user_id", userId)
      .order("weakness_score", { ascending: false }),
  ]);

  const errors = [
    questionsResult.error,
    reviewsResult.error,
    reportsResult.error,
    statsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    questions: (questionsResult.data ?? []) as ExportQuestion[],
    reviews: (reviewsResult.data ?? []) as ExportReview[],
    reports: (reportsResult.data ?? []) as ExportReport[],
    knowledge_stats: (statsResult.data ?? []) as ExportKnowledgeStat[],
  };
}
import type { SupabaseClient } from "@supabase/supabase-js";
