import { requireCronSecret, jsonResponse } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import {
  analyzeQuestion,
  type QuestionRow,
  writeQuestionAnalysis,
} from "../_shared/openai.ts";
import { buildInitialReviewPlan } from "../_shared/review-scheduler.ts";
import { updateKnowledgeStatsForQuestion } from "../_shared/weakness-score.ts";

const questionColumns = `
  id,
  user_id,
  subject,
  chapter,
  knowledge_point,
  image_path,
  question_text,
  question_text_status,
  mastery_status,
  user_note,
  mistake_types,
  solution_summary,
  one_sentence_tip,
  review_priority,
  confidence,
  needs_manual_check,
  created_at,
  analyzed_at
`;

Deno.serve(async (request) => {
  const unauthorized = requireCronSecret(request);

  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(questionColumns)
    .is("analyzed_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return jsonResponse({ error: "Unable to read unanalyzed questions." }, 500);
  }

  const questions = (data ?? []) as QuestionRow[];
  const results: Array<{ question_id: string; status: "ok" | "failed"; source?: string; error?: string }> = [];

  for (const question of questions) {
    try {
      const { source, analysis } = await analyzeQuestion(supabase, question);
      await writeQuestionAnalysis(supabase, question, analysis);

      const { data: existingReviews, error: reviewReadError } = await supabase
        .from("reviews")
        .select("scheduled_date")
        .eq("question_id", question.id);

      if (reviewReadError) {
        throw new Error(`Review scan failed: ${reviewReadError.message}`);
      }

      const reviewPlan = buildInitialReviewPlan({
        userId: question.user_id,
        questionId: question.id,
        masteryStatus: question.mastery_status,
        existingScheduledDates: (existingReviews ?? []).map((row) => String(row.scheduled_date)),
      });

      if (reviewPlan.length > 0) {
        const { error: reviewWriteError } = await supabase
          .from("reviews")
          .upsert(reviewPlan, { onConflict: "question_id,scheduled_date" });

        if (reviewWriteError) {
          throw new Error(`Review plan upsert failed: ${reviewWriteError.message}`);
        }
      }

      await updateKnowledgeStatsForQuestion(supabase, {
        user_id: question.user_id,
        subject: question.subject,
        chapter: analysis.chapter,
        knowledge_point: analysis.knowledge_point,
      });

      results.push({ question_id: question.id, status: "ok", source });
    } catch (error) {
      console.error("daily analysis item failed", {
        question_id: question.id,
        message: error instanceof Error ? error.message : "unknown error",
      });
      results.push({
        question_id: question.id,
        status: "failed",
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return jsonResponse({
    scanned: questions.length,
    analyzed: results.filter((result) => result.status === "ok").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  });
});
