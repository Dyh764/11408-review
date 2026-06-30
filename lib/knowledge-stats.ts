import type { SupabaseClient } from "@supabase/supabase-js";

const UNKNOWN_POINT = "\u672a\u5206\u7c7b";
const NO_IDEA = "完全没思路";
const STUCK = "思路对但卡住";
const MASTERED = "完全掌握";

type QuestionStatSource = {
  id: string;
  user_id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  mastery_status: string;
  deleted_at: string | null;
};

type ReviewStatSource = {
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

export async function updateKnowledgeStatsForQuestionId(
  supabase: SupabaseClient,
  questionId: string,
) {
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, user_id, subject, chapter, knowledge_point, mastery_status, deleted_at")
    .eq("id", questionId)
    .single();

  if (questionError) {
    throw questionError;
  }

  const source = question as QuestionStatSource;

  if (source.deleted_at) {
    return;
  }

  const knowledgePoint = normalizePoint(source.knowledge_point);
  let query = supabase
    .from("questions")
    .select("id, mastery_status")
    .eq("user_id", source.user_id)
    .eq("subject", source.subject)
    .is("deleted_at", null)
    .eq("knowledge_point", source.knowledge_point ?? knowledgePoint);

  if (source.chapter === null) {
    query = query.is("chapter", null);
  } else {
    query = query.eq("chapter", source.chapter);
  }

  const { data: questions, error: questionsError } = await query;

  if (questionsError) {
    throw questionsError;
  }

  const questionRows = (questions ?? []) as Array<{ id: string; mastery_status: string }>;
  const questionIds = questionRows.map((row) => row.id);
  let reviewRows: ReviewStatSource[] = [];

  if (questionIds.length > 0) {
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, question_id, scheduled_date, completed_at, review_result")
      .in("question_id", questionIds);

    if (reviewsError) {
      throw reviewsError;
    }

    reviewRows = (reviews ?? []) as ReviewStatSource[];
  }

  const today = new Date().toISOString().slice(0, 10);
  const masteredQuestionCount = questionRows.filter((row) => row.mastery_status === MASTERED).length;
  const masteredReviewCount = reviewRows.filter((row) => row.review_result === "mastered").length;
  const stats = {
    wrong_count: questionRows.filter((row) => row.mastery_status !== MASTERED).length,
    no_idea_count: questionRows.filter((row) => row.mastery_status === NO_IDEA).length,
    stuck_count: questionRows.filter((row) => row.mastery_status === STUCK).length,
    repeated_wrong_count: reviewRows.filter((row) => row.review_result === "wrong_again").length,
    failed_review_count: reviewRows.filter(
      (row) => row.review_result === "still_wrong" || row.review_result === "wrong_again",
    ).length,
    overdue_review_count: reviewRows.filter(
      (row) => !row.completed_at && row.scheduled_date < today,
    ).length,
    mastered_count: masteredQuestionCount + masteredReviewCount,
  };

  // TODO: add an event log table if the product needs auditable per-event stat history.
  const { error: upsertError } = await supabase.from("knowledge_stats").upsert(
    {
      user_id: source.user_id,
      subject: source.subject,
      chapter: source.chapter ?? "",
      knowledge_point: knowledgePoint,
      ...stats,
      weakness_score: computeWeaknessScore(stats),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,subject,chapter,knowledge_point" },
  );

  if (upsertError) {
    throw upsertError;
  }
}

export async function updateKnowledgeStatsForQuestionIds(
  supabase: SupabaseClient,
  questionIds: string[],
) {
  const uniqueQuestionIds = Array.from(new Set(questionIds.filter(Boolean)));

  if (uniqueQuestionIds.length === 0) {
    return;
  }

  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, user_id, subject, chapter, knowledge_point, mastery_status, deleted_at")
    .in("id", uniqueQuestionIds);

  if (error) {
    throw error;
  }

  const representativeIds = new Map<string, string>();

  for (const question of (questions ?? []) as QuestionStatSource[]) {
    if (question.deleted_at) {
      continue;
    }

    const key = [
      question.user_id,
      question.subject,
      question.chapter ?? "",
      normalizePoint(question.knowledge_point),
    ].join("\u0000");

    if (!representativeIds.has(key)) {
      representativeIds.set(key, question.id);
    }
  }

  await Promise.all(
    Array.from(representativeIds.values()).map((questionId) =>
      updateKnowledgeStatsForQuestionId(supabase, questionId),
    ),
  );
}
