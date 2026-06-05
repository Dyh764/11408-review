import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBucket } from "@/lib/env";
import type {
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
  image_path: string | null;
  question_text: string | null;
  question_text_status: QuestionTextStatus;
  mastery_status: MasteryStatus;
  user_note: string | null;
  mistake_types: string[] | null;
  solution_summary: string | null;
  one_sentence_tip: string | null;
  review_priority: ReviewPriority | null;
  confidence: string | null;
  needs_manual_check: boolean;
  source: QuestionSource;
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
  source,
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
