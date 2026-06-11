import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIsoDate as todayIsoDateInTimeZone } from "@/lib/dates";
import { supabaseBucket } from "@/lib/env";
import type {
  AnswerSource,
  AnswerStatus,
  ChoiceOption,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  ReviewPriority,
  ReviewResult,
  QuestionSource,
  Subject,
} from "@/lib/types";

export type DueReview = {
  id: string;
  user_id: string;
  question_id: string;
  scheduled_date: string;
  completed_at: string | null;
  review_result: ReviewResult | null;
  questions: {
    id: string;
    subject: Subject;
    chapter: string | null;
    knowledge_point: string | null;
    difficulty: Difficulty | null;
    image_path: string | null;
    source: QuestionSource;
    question_text: string | null;
    choices: ChoiceOption[];
    question_text_status: QuestionTextStatus;
    mastery_status: MasteryStatus;
    mistake_types: string[] | null;
    standard_answer: string | null;
    answer_explanation: string | null;
    key_steps: string[];
    answer_status: AnswerStatus;
    answer_source: AnswerSource;
    one_sentence_tip: string | null;
    review_priority: ReviewPriority | null;
    needs_manual_check: boolean;
    created_at: string;
    deleted_at: string | null;
  };
  signedImageUrl: string | null;
};

type RawDueReview = Omit<DueReview, "signedImageUrl" | "questions"> & {
  questions: DueReview["questions"] | DueReview["questions"][];
};

const dueReviewColumns = `
  id,
  user_id,
  question_id,
  scheduled_date,
  completed_at,
  review_result,
  questions (
    id,
    subject,
    chapter,
    knowledge_point,
    difficulty,
    image_path,
    source,
    question_text,
    choices,
    question_text_status,
    mastery_status,
    mistake_types,
    standard_answer,
    answer_explanation,
    key_steps,
    answer_status,
    answer_source,
    one_sentence_tip,
    review_priority,
    needs_manual_check,
    created_at,
    deleted_at
  )
`;

export function todayIsoDate() {
  return todayIsoDateInTimeZone();
}

async function addSignedImageUrl(
  supabase: SupabaseClient,
  review: Omit<DueReview, "signedImageUrl">,
): Promise<DueReview> {
  if (!review.questions.image_path) {
    return {
      ...review,
      signedImageUrl: null,
    };
  }

  const { data, error } = await supabase.storage
    .from(supabaseBucket)
    .createSignedUrl(review.questions.image_path, 60 * 10);

  return {
    ...review,
    signedImageUrl: error ? null : data.signedUrl,
  };
}

export async function fetchDueReviews(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("reviews")
    .select(dueReviewColumns)
    .lte("scheduled_date", todayIsoDate())
    .is("completed_at", null)
    .is("questions.deleted_at", null)
    .order("scheduled_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const reviews = ((data ?? []) as unknown as RawDueReview[])
    .map((review) => ({
      ...review,
      questions: Array.isArray(review.questions) ? review.questions[0] : review.questions,
    }))
    .filter((review): review is Omit<DueReview, "signedImageUrl"> =>
      Boolean(review.questions) && review.questions.deleted_at === null,
    );

  return Promise.all(reviews.map((review) => addSignedImageUrl(supabase, review)));
}
