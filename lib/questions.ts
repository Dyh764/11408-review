import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBucket } from "@/lib/env";
import type {
  AnswerSource,
  AnswerStatus,
  ChoiceOption,
  Difficulty,
  MasteryStatus,
  QuestionSource,
  QuestionSourceInfo,
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
  choices: ChoiceOption[];
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
  source_info: QuestionSourceInfo | null;
  answer_status: AnswerStatus;
  answer_source: AnswerSource;
  created_at: string;
  analyzed_at: string | null;
  deleted_at: string | null;
  deleted_reason: string | null;
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
  choices,
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
  source_info,
  answer_status,
  answer_source,
  created_at,
  analyzed_at,
  deleted_at,
  deleted_reason
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
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Promise.all(
    ((data ?? []) as QuestionRecord[]).map((question) => addSignedImageUrl(supabase, question)),
  );
}

export async function fetchCurrentUserQuestion(
  supabase: SupabaseClient,
  id: string,
  options: { includeDeleted?: boolean } = {},
) {
  let query = supabase
    .from("questions")
    .select(questionColumns)
    .eq("id", id);

  if (!options.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.single();

  if (error) {
    throw error;
  }

  return addSignedImageUrl(supabase, data as QuestionRecord);
}
