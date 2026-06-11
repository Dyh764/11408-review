import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  ReviewPriority,
  ReviewResult,
} from "../types";

export type PriorityReviewInput = {
  id: string;
  scheduled_date: string;
  review_result?: ReviewResult | null;
  questions: {
    difficulty?: Difficulty | string | null;
    mastery_status?: MasteryStatus | string | null;
    question_text_status?: QuestionTextStatus | string | null;
    answer_status?: AnswerStatus | string | null;
    needs_manual_check?: boolean | null;
    review_priority?: ReviewPriority | string | null;
    mistake_types?: string[] | null;
  };
};

export type ReviewPriorityScore = {
  total: number;
  overdueScore: number;
  riskScore: number;
  difficultyScore: number;
  weaknessScore: number;
  recentErrorTrendScore: number;
  masteredDiscount: number;
  reasons: string[];
};

export type ReviewPriorityExplanation = {
  score: number;
  level: "今日重点" | "高优先级" | "建议复习" | "普通复习";
  reasons: string[];
};

function daysBetween(dateKey: string, todayKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`).getTime();
  const today = new Date(`${todayKey}T00:00:00.000Z`).getTime();

  if (!Number.isFinite(date) || !Number.isFinite(today)) {
    return 0;
  }

  return Math.floor((today - date) / 86_400_000);
}

function scoreDifficulty(difficulty?: string | null) {
  if (difficulty === "压轴" || difficulty === "困难") {
    return 42;
  }

  if (difficulty === "较难") {
    return 34;
  }

  if (difficulty === "中等") {
    return 22;
  }

  if (difficulty === "基础") {
    return 10;
  }

  return 14;
}

export function calculateReviewPriorityScore(
  review: PriorityReviewInput,
  todayKey: string,
): ReviewPriorityScore {
  const reasons: string[] = [];
  const overdueDays = Math.max(0, daysBetween(review.scheduled_date, todayKey));
  // 逾期越久越靠前，但封顶，避免一个旧任务长期压住所有新任务。
  const overdueScore = Math.min(90, overdueDays * 10);

  if (overdueDays > 0) {
    reasons.push(`逾期 ${overdueDays} 天`);
  }

  // 复习风险来自显式高优先级、上次做错、需要修正或人工核对等危险信号。
  let riskScore = 20;
  if (review.questions.review_priority === "high") {
    riskScore += 34;
    reasons.push("高优先级");
  }
  if (review.review_result === "wrong_again") {
    riskScore += 38;
    reasons.push("上次又错");
  }
  if (review.review_result === "still_wrong") {
    riskScore += 28;
    reasons.push("上次仍不会");
  }
  if (review.questions.question_text_status === "needs_fix") {
    riskScore += 24;
    reasons.push("题目信息需要修正");
  }
  if (review.questions.answer_status === "needs_fix") {
    riskScore += 18;
    reasons.push("答案信息需要修正");
  }
  if (review.questions.needs_manual_check) {
    riskScore += 16;
    reasons.push("需要人工核对");
  }

  // 困难题比中等题和基础题更需要提前复盘。
  const difficultyScore = scoreDifficulty(review.questions.difficulty);
  if (difficultyScore >= 34) {
    reasons.push("高难度题");
  }

  // 错因标签越多，说明薄弱点越集中，适度提高排序。
  const mistakeCount = review.questions.mistake_types?.length ?? 0;
  const weaknessScore = Math.min(35, mistakeCount * 8);
  if (weaknessScore > 0) {
    reasons.push("薄弱点较多");
  }

  // The current schema stores only the pending review row here, so recent trend
  // is approximated from the most recent recorded result when available.
  const recentErrorTrendScore =
    review.review_result === "wrong_again" ? 30 : review.review_result === "still_wrong" ? 20 : 0;

  // 已掌握或低优先级题降权，但仍保留在到期队列中。
  const masteredDiscount =
    review.questions.mastery_status === "完全掌握" || review.questions.review_priority === "low"
      ? 32
      : 0;

  if (masteredDiscount > 0) {
    reasons.push("已掌握降权");
  }

  return {
    total:
      overdueScore +
      riskScore +
      difficultyScore +
      weaknessScore +
      recentErrorTrendScore -
      masteredDiscount,
    overdueScore,
    riskScore,
    difficultyScore,
    weaknessScore,
    recentErrorTrendScore,
    masteredDiscount,
    reasons: reasons.length > 0 ? reasons : ["常规到期复习"],
  };
}

function getPriorityLevel(score: number): ReviewPriorityExplanation["level"] {
  if (score >= 100) {
    return "今日重点";
  }

  if (score >= 70) {
    return "高优先级";
  }

  if (score >= 40) {
    return "建议复习";
  }

  return "普通复习";
}

function pushUnique(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

export function explainReviewPriorityScore(
  review: PriorityReviewInput,
  todayKey: string,
): ReviewPriorityExplanation {
  const score = calculateReviewPriorityScore(review, todayKey);
  const reasons: string[] = [];
  const overdueDays = Math.max(0, daysBetween(review.scheduled_date, todayKey));

  if (overdueDays > 0) {
    pushUnique(reasons, "已逾期");
  }
  if (review.review_result === "wrong_again") {
    pushUnique(reasons, "又错过");
    pushUnique(reasons, "最近表现不稳定");
  }
  if (review.review_result === "still_wrong") {
    pushUnique(reasons, "仍不会");
    pushUnique(reasons, "最近表现不稳定");
  }
  if (review.questions.difficulty === "较难" || review.questions.difficulty === "压轴" || review.questions.difficulty === "困难") {
    pushUnique(reasons, "困难题");
  } else if (review.questions.difficulty === "中等") {
    pushUnique(reasons, "中等难度");
  }
  if (review.questions.question_text_status === "needs_fix" || review.questions.answer_status === "needs_fix") {
    pushUnique(reasons, "需要修正");
  }
  if (review.questions.needs_manual_check) {
    pushUnique(reasons, "需要核对");
  }
  if ((review.questions.mistake_types?.length ?? 0) > 0) {
    pushUnique(reasons, "薄弱章节");
  }

  return {
    score: score.total,
    level: getPriorityLevel(score.total),
    reasons: reasons.length > 0 ? reasons : ["常规到期"],
  };
}

export function sortDueReviewsByPriority<T extends PriorityReviewInput>(
  reviews: T[],
  todayKey: string,
): T[] {
  return [...reviews].sort((a, b) => {
    const scoreA = calculateReviewPriorityScore(a, todayKey).total;
    const scoreB = calculateReviewPriorityScore(b, todayKey).total;

    return (
      scoreB - scoreA ||
      a.scheduled_date.localeCompare(b.scheduled_date) ||
      a.id.localeCompare(b.id)
    );
  });
}
