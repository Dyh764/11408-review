import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIsoDate as todayIsoDateInTimeZone } from "@/lib/dates";
import { supabaseBucket } from "@/lib/env";
import type {
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
    image_path: string | null;
    source: QuestionSource;
    question_text_status: QuestionTextStatus;
    mastery_status: MasteryStatus;
    mistake_types: string[] | null;
    one_sentence_tip: string | null;
    review_priority: ReviewPriority | null;
    created_at: string;
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
    image_path,
    source,
    question_text_status,
    mastery_status,
    mistake_types,
    one_sentence_tip,
    review_priority,
    created_at
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
      Boolean(review.questions),
    );

  return Promise.all(reviews.map((review) => addSignedImageUrl(supabase, review)));
}
