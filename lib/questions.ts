import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBucket } from "@/lib/env";
import type {
  AnswerSource,
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  ReviewPriority,
  Subject,
} from "@/lib/types";

export type QuestionRecord = {
  id: string;
  user_id: string;
  subject: Subject;
  chapter: string | null;
  knowledge_point: string | null;
  difficulty: Difficulty | null;
  image_path: string | null;
  question_text: string | null;
  question_text_status: QuestionTextStatus;
  mastery_status: MasteryStatus;
  user_note: string | null;
  mistake_types: string[] | null;
  solution_summary: string | null;
  standard_answer: string | null;
  answer_explanation: string | null;
  key_steps: string[];
  one_sentence_tip: string | null;
  review_priority: ReviewPriority | null;
  confidence: string | null;
  needs_manual_check: boolean;
  source: QuestionSource;
  answer_status: AnswerStatus;
  answer_source: AnswerSource;
  created_at: string;
  analyzed_at: string | null;
};

export type QuestionWithImage = QuestionRecord & {
  signedImageUrl: string | null;
};

const questionColumns = `
  id,
  user_id,
  subject,
  chapter,
  knowledge_point,
  difficulty,
  image_path,
  question_text,
  question_text_status,
  mastery_status,
  user_note,
  mistake_types,
  solution_summary,
  standard_answer,
  answer_explanation,
  key_steps,
  one_sentence_tip,
  review_priority,
  confidence,
  needs_manual_check,
  source,
  answer_status,
  answer_source,
  created_at,
  analyzed_at
`;

async function addSignedImageUrl(
  supabase: SupabaseClient,
  question: QuestionRecord,
): Promise<QuestionWithImage> {
  if (!question.image_path) {
    return {
      ...question,
      signedImageUrl: null,
    };
  }

  const { data, error } = await supabase.storage
    .from(supabaseBucket)
    .createSignedUrl(question.image_path, 60 * 10);

  return {
    ...question,
    signedImageUrl: error ? null : data.signedUrl,
  };
}

export async function fetchCurrentUserQuestions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("questions")
    .select(questionColumns)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Promise.all(
    ((data ?? []) as QuestionRecord[]).map((question) => addSignedImageUrl(supabase, question)),
  );
}

export async function fetchCurrentUserQuestion(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("questions")
    .select(questionColumns)
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return addSignedImageUrl(supabase, data as QuestionRecord);
}
