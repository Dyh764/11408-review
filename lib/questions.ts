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
  RelatedPracticeQuestion,
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
  related_practice_questions: RelatedPracticeQuestion[];
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
  related_practice_questions,
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

async function addSignedImageUrls(
  supabase: SupabaseClient,
  questions: QuestionRecord[],
): Promise<QuestionWithImage[]> {
  const paths = Array.from(
    new Set(
      questions
        .map((question) => question.image_path?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  const signedByPath = new Map<string, string>();

  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .createSignedUrls(batch, 60 * 10);

    if (error) {
      continue;
    }

    for (const row of data ?? []) {
      if (row.path && row.signedUrl) {
        signedByPath.set(row.path, row.signedUrl);
      }
    }
  }

  return questions.map((question) => ({
    ...question,
    signedImageUrl: question.image_path
      ? signedByPath.get(question.image_path) ?? null
      : null,
  }));
}

export async function fetchCurrentUserQuestionRecords(supabase: SupabaseClient) {
  const questions: QuestionRecord[] = [];

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("questions")
      .select(questionColumns)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + 999);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as QuestionRecord[];
    questions.push(...batch);
    if (batch.length < 1000) {
      break;
    }
  }

  return questions;
}

export async function fetchCurrentUserQuestions(supabase: SupabaseClient) {
  const questions = await fetchCurrentUserQuestionRecords(supabase);
  return addSignedImageUrls(supabase, questions);
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

  return (await addSignedImageUrls(supabase, [data as QuestionRecord]))[0];
}
