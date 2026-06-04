import type { AdminClient } from "./supabase-admin.ts";

export type ReportType = "daily" | "weekly" | "monthly";

type QuestionMetricRow = {
  id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  mistake_types: string[] | null;
  mastery_status: string;
  analyzed_at: string | null;
  created_at: string;
};

type ReviewMetricRow = {
  id: string;
  question_id: string;
  scheduled_date: string;
  completed_at: string | null;
  review_result: string | null;
};

type KnowledgeStatRow = {
  subject: string;
  chapter: string | null;
  knowledge_point: string;
  weakness_score: number;
  wrong_count: number;
  repeated_wrong_count: number;
  failed_review_count: number;
  overdue_review_count: number;
  mastered_count: number;
};

const MASTERED = "瀹屽叏鎺屾彙";

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseJobDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date();
  }

  return new Date(`${value}T12:00:00.000Z`);
}

export async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function dailyRange(date: Date) {
  const day = toIsoDate(date);
  return { startDate: day, endDate: day };
}

export function weeklyRange(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = day.getUTCDay() || 7;
  const monday = addDays(day, 1 - dayOfWeek);
  const sunday = addDays(monday, 6);
  return { startDate: toIsoDate(monday), endDate: toIsoDate(sunday) };
}

export function monthlyRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function isLastDayOfMonth(date: Date) {
  return date.getUTCDate() === new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function startTimestamp(date: string) {
  return `${date}T00:00:00.000Z`;
}

function afterEndTimestamp(date: string) {
  return addDays(new Date(`${date}T00:00:00.000Z`), 1).toISOString();
}

function increment(map: Map<string, number>, key: string, count = 1) {
  map.set(key, (map.get(key) ?? 0) + count);
}

function rankedMap(map: Map<string, number>, limit = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export async function listReportUserIds(supabase: AdminClient) {
  const { data, error } = await supabase.from("profiles").select("id");

  if (error) {
    throw new Error(`Profile scan failed: ${error.message}`);
  }

  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function fetchRangeData(
  supabase: AdminClient,
  userId: string,
  startDate: string,
  endDate: string,
) {
  const { data: questions, error: questionError } = await supabase
    .from("questions")
    .select("id, subject, chapter, knowledge_point, mistake_types, mastery_status, analyzed_at, created_at")
    .eq("user_id", userId)
    .gte("created_at", startTimestamp(startDate))
    .lt("created_at", afterEndTimestamp(endDate));

  if (questionError) {
    throw new Error(`Question report scan failed: ${questionError.message}`);
  }

  const { data: scheduledReviews, error: scheduledError } = await supabase
    .from("reviews")
    .select("id, question_id, scheduled_date, completed_at, review_result")
    .eq("user_id", userId)
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate);

  if (scheduledError) {
    throw new Error(`Scheduled review report scan failed: ${scheduledError.message}`);
  }

  const { data: completedReviews, error: completedError } = await supabase
    .from("reviews")
    .select("id, question_id, scheduled_date, completed_at, review_result")
    .eq("user_id", userId)
    .gte("completed_at", startTimestamp(startDate))
    .lt("completed_at", afterEndTimestamp(endDate));

  if (completedError) {
    throw new Error(`Completed review report scan failed: ${completedError.message}`);
  }

  const reviewMap = new Map<string, ReviewMetricRow>();

  for (const review of [...(scheduledReviews ?? []), ...(completedReviews ?? [])] as ReviewMetricRow[]) {
    reviewMap.set(review.id, review);
  }

  const { data: knowledgeStats, error: statsError } = await supabase
    .from("knowledge_stats")
    .select(
      "subject, chapter, knowledge_point, weakness_score, wrong_count, repeated_wrong_count, failed_review_count, overdue_review_count, mastered_count",
    )
    .eq("user_id", userId)
    .order("weakness_score", { ascending: false })
    .limit(10);

  if (statsError) {
    throw new Error(`Knowledge stats report scan failed: ${statsError.message}`);
  }

  return {
    questions: (questions ?? []) as QuestionMetricRow[],
    reviews: [...reviewMap.values()],
    knowledgeStats: (knowledgeStats ?? []) as KnowledgeStatRow[],
  };
}

export async function buildReportContent(
  supabase: AdminClient,
  userId: string,
  type: ReportType,
  startDate: string,
  endDate: string,
) {
  const { questions, reviews, knowledgeStats } = await fetchRangeData(
    supabase,
    userId,
    startDate,
    endDate,
  );
  const subjectCounts = new Map<string, number>();
  const mistakeCounts = new Map<string, number>();
  const repeatedWrongCounts = new Map<string, number>();
  const completedReviews = reviews.filter((review) => review.completed_at);
  const overdueReviews = reviews.filter((review) => !review.completed_at && review.scheduled_date < endDate);
  const masteredCount =
    questions.filter((question) => question.mastery_status === MASTERED).length +
    completedReviews.filter((review) => review.review_result === "mastered").length;

  for (const question of questions) {
    increment(subjectCounts, question.subject);

    for (const mistakeType of question.mistake_types ?? []) {
      increment(mistakeCounts, mistakeType);
    }
  }

  for (const stat of knowledgeStats) {
    if (stat.repeated_wrong_count > 0) {
      increment(repeatedWrongCounts, stat.knowledge_point, stat.repeated_wrong_count);
    }
  }

  const summary = {
    new_questions: questions.length,
    analyzed_questions: questions.filter((question) => question.analyzed_at).length,
    completed_reviews: completedReviews.length,
    overdue_reviews: overdueReviews.length,
    mastered_count: masteredCount,
    wrong_again_count: completedReviews.filter((review) => review.review_result === "wrong_again").length,
    review_completion_rate:
      reviews.length === 0 ? 0 : Math.round((completedReviews.length / reviews.length) * 100),
  };
  const weakestKnowledgePoints = knowledgeStats.map((stat) => ({
    subject: stat.subject,
    chapter: stat.chapter ?? "",
    knowledge_point: stat.knowledge_point,
    weakness_score: stat.weakness_score,
    wrong_count: stat.wrong_count,
    failed_review_count: stat.failed_review_count,
    overdue_review_count: stat.overdue_review_count,
  }));
  const nextActions = weakestKnowledgePoints.length
    ? weakestKnowledgePoints.slice(0, 3).map((item) => ({
        title: item.knowledge_point,
        detail: `Schedule focused review for ${item.subject} / ${item.chapter || "general"}.`,
      }))
    : [
        {
          title: "No weak point data yet",
          detail: "Add and analyze more questions before the next report.",
        },
      ];

  return {
    type,
    start_date: startDate,
    end_date: endDate,
    generated_at: new Date().toISOString(),
    title: `${type} report ${startDate} to ${endDate}`,
    summary,
    subject_distribution: rankedMap(subjectCounts),
    frequent_mistake_types: rankedMap(mistakeCounts),
    weakest_knowledge_points: weakestKnowledgePoints,
    repeated_wrong_knowledge_points: rankedMap(repeatedWrongCounts),
    progress_points: knowledgeStats
      .filter((stat) => stat.mastered_count > 0)
      .slice(0, 5)
      .map((stat) => ({ label: stat.knowledge_point, mastered_count: stat.mastered_count })),
    next_actions: nextActions,
    tomorrow_suggestions: nextActions,
    weekly_suggestions: nextActions,
    monthly_focus: nextActions,
  };
}

export async function upsertReport(
  supabase: AdminClient,
  userId: string,
  type: ReportType,
  startDate: string,
  endDate: string,
  content: unknown,
) {
  const { error } = await supabase.from("reports").upsert(
    {
      user_id: userId,
      type,
      start_date: startDate,
      end_date: endDate,
      content_json: content,
    },
    { onConflict: "user_id,type,start_date,end_date" },
  );

  if (error) {
    throw new Error(`Report upsert failed: ${error.message}`);
  }
}
