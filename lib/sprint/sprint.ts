import type {
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  ReviewPriority,
  ReviewResult,
  Subject,
} from "@/lib/types";

export type SprintQuestionInput = {
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
  needs_manual_check: boolean;
  created_at: string;
  signedImageUrl: string | null;
};

export type SprintReviewInput = {
  id: string;
  question_id: string;
  scheduled_date: string;
  completed_at: string | null;
  review_result: ReviewResult | null;
};

export type SprintKnowledgeStatInput = {
  subject: string;
  chapter: string | null;
  knowledge_point: string;
  weakness_score: number;
};

export type SprintItem = {
  question: SprintQuestionInput;
  reasons: string[];
  score: number;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDateKey: string, toDateKey: string) {
  const from = new Date(`${fromDateKey}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDateKey}T00:00:00.000Z`).getTime();

  return Math.max(0, Math.round((to - from) / 86_400_000));
}

function ageDays(createdAt: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000));
}

function latestCompletedReview(reviews: SprintReviewInput[]) {
  return reviews
    .filter((review) => review.completed_at)
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? "").getTime() - new Date(a.completed_at ?? "").getTime(),
    )[0];
}

function statScore(question: SprintQuestionInput, stats: SprintKnowledgeStatInput[]) {
  return (
    stats.find(
      (stat) =>
        stat.subject === question.subject &&
        (stat.chapter ?? "") === (question.chapter ?? "") &&
        stat.knowledge_point === (question.knowledge_point ?? ""),
    )?.weakness_score ?? 0
  );
}

export function buildSprintItems(input: {
  questions: SprintQuestionInput[];
  reviews: SprintReviewInput[];
  stats: SprintKnowledgeStatInput[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const today = dateKey(now);
  const reviewsByQuestion = new Map<string, SprintReviewInput[]>();

  input.reviews.forEach((review) => {
    const rows = reviewsByQuestion.get(review.question_id) ?? [];
    rows.push(review);
    reviewsByQuestion.set(review.question_id, rows);
  });

  return input.questions
    .map<SprintItem>((question) => {
      const reviews = reviewsByQuestion.get(question.id) ?? [];
      const latest = latestCompletedReview(reviews);
      const overdueReview = reviews
        .filter((review) => !review.completed_at && review.scheduled_date < today)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
      const weaknessScore = statScore(question, input.stats);
      const reasons: string[] = [];
      let score = weaknessScore;

      if (latest?.review_result === "wrong_again") {
        reasons.push("复习后又错");
        score += 10_000;
      }

      if (latest?.review_result === "still_wrong") {
        reasons.push("仍不会");
        score += 9_000;
      }

      if (question.mastery_status === "完全没思路") {
        reasons.push("完全没思路");
        score += 8_000;
      }

      if (overdueReview) {
        const overdueDays = daysBetween(overdueReview.scheduled_date, today);
        reasons.push(`逾期 ${overdueDays} 天`);
        score += 6_000 + overdueDays;
      }

      if (question.needs_manual_check) {
        reasons.push("needs_manual_check");
        score += 5_000;
      }

      if (question.question_text_status === "needs_fix") {
        reasons.push("题干需修正");
        score += 4_000;
      }

      if (question.mastery_status === "做对但不稳") {
        reasons.push("做对但不稳");
        score += 3_000;
      }

      if (weaknessScore > 0) {
        reasons.push(`高危知识点：弱点分 ${weaknessScore}`);
      }

      if (question.mastery_status !== "完全掌握" && ageDays(question.created_at, now) >= 30) {
        reasons.push("超过 30 天仍未掌握");
        score += 2_000;
      }

      if (question.review_priority === "high" && reasons.length === 0) {
        reasons.push("高优先级错题");
        score += 1_000;
      }

      return {
        question,
        reasons: reasons.length > 0 ? reasons : ["普通复盘"],
        score,
      };
    })
    .filter((item) => item.question.mastery_status !== "完全掌握" || item.score > 0)
    .sort((a, b) => b.score - a.score || b.question.created_at.localeCompare(a.question.created_at));
}
