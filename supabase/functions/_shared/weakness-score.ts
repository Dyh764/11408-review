import type { AdminClient } from "./supabase-admin.ts";
import type { QuestionRow } from "./openai.ts";

const UNKNOWN_POINT = "\u672a\u5206\u7c7b";
const NO_IDEA = "瀹屽叏娌℃€濊矾";
const STUCK = "鎬濊矾瀵逛絾鍗′綇";
const MASTERED = "瀹屽叏鎺屾彙";

type ReviewRow = {
  id: string;
  question_id: string;
  scheduled_date: string;
  completed_at: string | null;
  review_result: string | null;
};

export function computeWeaknessScore(input: {
  wrong_count: number;
  no_idea_count: number;
  stuck_count: number;
  repeated_wrong_count: number;
  failed_review_count: number;
  overdue_review_count: number;
  mastered_count: number;
}) {
  return Math.max(
    0,
    input.wrong_count * 2 +
      input.no_idea_count * 5 +
      input.stuck_count * 3 +
      input.repeated_wrong_count * 4 +
      input.failed_review_count * 5 +
      input.overdue_review_count * 2 -
      input.mastered_count * 2,
  );
}

function normalizePoint(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_POINT;
}

export async function updateKnowledgeStatsForQuestion(
  supabase: AdminClient,
  question: Pick<QuestionRow, "user_id" | "subject" | "chapter" | "knowledge_point">,
) {
  const knowledgePoint = normalizePoint(question.knowledge_point);
  const chapter = question.chapter ?? "";
  const { data: questions, error: questionError } = await supabase
    .from("questions")
    .select("id, mastery_status")
    .eq("user_id", question.user_id)
    .eq("subject", question.subject)
    .eq("chapter", chapter)
    .eq("knowledge_point", knowledgePoint);

  if (questionError) {
    throw new Error(`Knowledge stat question scan failed: ${questionError.message}`);
  }

  const questionRows = (questions ?? []) as Array<{ id: string; mastery_status: string }>;
  const questionIds = questionRows.map((row) => row.id);
  let reviews: ReviewRow[] = [];

  if (questionIds.length > 0) {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, question_id, scheduled_date, completed_at, review_result")
      .in("question_id", questionIds);

    if (error) {
      throw new Error(`Knowledge stat review scan failed: ${error.message}`);
    }

    reviews = (data ?? []) as ReviewRow[];
  }

  const today = new Date().toISOString().slice(0, 10);
  const masteredQuestionCount = questionRows.filter((row) => row.mastery_status === MASTERED).length;
  const masteredReviewCount = reviews.filter((row) => row.review_result === "mastered").length;
  const stats = {
    wrong_count: questionRows.filter((row) => row.mastery_status !== MASTERED).length,
    no_idea_count: questionRows.filter((row) => row.mastery_status === NO_IDEA).length,
    stuck_count: questionRows.filter((row) => row.mastery_status === STUCK).length,
    repeated_wrong_count: reviews.filter((row) => row.review_result === "wrong_again").length,
    failed_review_count: reviews.filter(
      (row) => row.review_result === "still_wrong" || row.review_result === "wrong_again",
    ).length,
    overdue_review_count: reviews.filter(
      (row) => !row.completed_at && row.scheduled_date < today,
    ).length,
    mastered_count: masteredQuestionCount + masteredReviewCount,
  };

  const weaknessScore = computeWeaknessScore(stats);
  // TODO: add an event log table if the product needs auditable per-event stat history.
  const { error } = await supabase.from("knowledge_stats").upsert(
    {
      user_id: question.user_id,
      subject: question.subject,
      chapter,
      knowledge_point: knowledgePoint,
      ...stats,
      weakness_score: weaknessScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,subject,chapter,knowledge_point" },
  );

  if (error) {
    throw new Error(`Knowledge stat upsert failed: ${error.message}`);
  }
}
