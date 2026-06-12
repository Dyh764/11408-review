import type {
  AnswerStatus,
  QuestionTextStatus,
  ReviewPriority,
  ReviewResult,
} from "../types";

export type AnalyticsQuestion = {
  id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  question_text?: string | null;
  standard_answer?: string | null;
  answer_explanation?: string | null;
  question_text_status: QuestionTextStatus | string | null;
  answer_status: AnswerStatus | string | null;
  needs_manual_check: boolean;
  review_priority: ReviewPriority | string | null;
  mastery_status?: string | null;
  mistake_types?: string[] | null;
  created_at?: string | null;
};

export type AnalyticsReviewResult = {
  question_id: string;
  review_result: ReviewResult | string | null;
  completed_at: string | null;
};

export type WeaknessTrend = {
  topic: string;
  subject: string;
  chapter: string;
  score: number;
  questionCount: number;
  recentWrongCount: number;
  repeatedWrongCount: number;
  masteredCount: number;
  qualityIssueCount: number;
  trend: "up" | "down" | "flat";
  recommendation: string;
  actionHref: string;
};

export type QuestionQualityIssueType =
  | "question_needs_fix"
  | "answer_needs_fix"
  | "missing_answer"
  | "missing_knowledge_point"
  | "uncategorized"
  | "ai_unverified";

export type QuestionQualityIssue = {
  questionId: string;
  type: QuestionQualityIssueType;
  severity: "high" | "medium" | "low";
  label: string;
  detail: string;
  actionHref: string;
};

export type QuestionQualitySummary = {
  totalIssueCount: number;
  highIssueCount: number;
  affectedQuestionCount: number;
  topIssues: QuestionQualityIssue[];
};

export type RoundExposureItem = {
  topic: string;
  wrongCount: number;
  masteredCount: number;
  actionHref: string;
};

export type RoundExposureSummary = {
  exposedTopics: RoundExposureItem[];
  completedCount: number;
  wrongCount: number;
  masteredCount: number;
  nextActionLabel: string;
  nextActionHref: string;
};

const fallbackTopic = "待整理错题";
const fallbackChapter = "未分类";

function nonEmpty(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function topicForQuestion(question: AnalyticsQuestion) {
  return question.knowledge_point?.trim() || question.chapter?.trim() || fallbackTopic;
}

function chapterForQuestion(question: AnalyticsQuestion) {
  return question.chapter?.trim() || fallbackChapter;
}

function practiceTopicHref(topic: string) {
  return `/practice?topic=${encodeURIComponent(topic)}`;
}

function hasAnswer(question: AnalyticsQuestion) {
  return nonEmpty(question.standard_answer) || nonEmpty(question.answer_explanation);
}

function questionBaseScore(question: AnalyticsQuestion) {
  let score = 0;

  if (question.review_priority === "high") score += 10;
  if (question.review_priority === "medium") score += 4;
  if (question.needs_manual_check) score += 5;
  if (question.question_text_status === "needs_fix") score += 8;
  if (question.answer_status === "needs_fix") score += 8;
  if (question.answer_status === "ai_unverified") score += 3;
  if (!hasAnswer(question)) score += 6;
  if (!nonEmpty(question.knowledge_point)) score += 4;

  return score;
}

function reviewScore(result: string | null) {
  if (result === "wrong_again") return 14;
  if (result === "still_wrong") return 10;
  if (result === "improved") return 1;
  if (result === "mastered") return -8;
  return 0;
}

function isRecentReview(review: AnalyticsReviewResult, today: string, days: number) {
  if (!review.completed_at) {
    return false;
  }

  const completedAt = new Date(review.completed_at);
  const end = new Date(`${today}T23:59:59.999Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));

  return completedAt >= start && completedAt <= end;
}

function compareByScoreThenTopic(a: WeaknessTrend, b: WeaknessTrend) {
  return (
    b.score - a.score ||
    b.repeatedWrongCount - a.repeatedWrongCount ||
    b.qualityIssueCount - a.qualityIssueCount ||
    a.topic.localeCompare(b.topic, "zh-CN")
  );
}

export function buildWeaknessTrends(
  questions: AnalyticsQuestion[],
  reviews: AnalyticsReviewResult[] = [],
  options: { today?: string; days?: number; limit?: number } = {},
): WeaknessTrend[] {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const days = options.days ?? 7;
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const trendMap = new Map<string, WeaknessTrend>();

  function ensureTrend(question: AnalyticsQuestion) {
    const topic = topicForQuestion(question);
    const current = trendMap.get(topic);

    if (current) {
      return current;
    }

    const trend: WeaknessTrend = {
      topic,
      subject: question.subject,
      chapter: chapterForQuestion(question),
      score: 0,
      questionCount: 0,
      recentWrongCount: 0,
      repeatedWrongCount: 0,
      masteredCount: 0,
      qualityIssueCount: 0,
      trend: "flat",
      recommendation: "",
      actionHref: practiceTopicHref(topic),
    };
    trendMap.set(topic, trend);
    return trend;
  }

  for (const question of questions) {
    const trend = ensureTrend(question);
    trend.questionCount += 1;
    trend.score += questionBaseScore(question);
    trend.qualityIssueCount += buildQuestionQualityIssues([question]).length;
  }

  for (const review of reviews) {
    if (!isRecentReview(review, today, days)) {
      continue;
    }

    const question = questionById.get(review.question_id);
    if (!question) {
      continue;
    }

    const trend = ensureTrend(question);
    trend.score += reviewScore(review.review_result);

    if (review.review_result === "wrong_again" || review.review_result === "still_wrong") {
      trend.recentWrongCount += 1;
      trend.repeatedWrongCount += 1;
    }

    if (review.review_result === "mastered") {
      trend.masteredCount += 1;
    }
  }

  for (const trend of trendMap.values()) {
    if (trend.repeatedWrongCount > trend.masteredCount) {
      trend.trend = "up";
      trend.recommendation = "最近仍在反复错，建议今天先开一轮专项复盘。";
    } else if (trend.masteredCount > trend.repeatedWrongCount && trend.masteredCount > 0) {
      trend.trend = "down";
      trend.recommendation = "近期掌握情况变好，保留低频复查即可。";
    } else if (trend.qualityIssueCount > 0) {
      trend.recommendation = "题卡信息还不干净，先补分类或核对答案。";
    } else {
      trend.recommendation = "保持正常复习节奏。";
    }
  }

  return Array.from(trendMap.values())
    .filter(
      (trend) =>
        trend.score > 0 ||
        trend.recentWrongCount > 0 ||
        trend.masteredCount > 0 ||
        trend.qualityIssueCount > 0,
    )
    .sort(compareByScoreThenTopic)
    .slice(0, options.limit ?? 3);
}

function issue(
  question: AnalyticsQuestion,
  type: QuestionQualityIssueType,
  severity: QuestionQualityIssue["severity"],
  label: string,
  detail: string,
): QuestionQualityIssue {
  return {
    questionId: question.id,
    type,
    severity,
    label,
    detail,
    actionHref: `/questions/${question.id}`,
  };
}

function issueWeight(issue: QuestionQualityIssue) {
  const severityWeight = issue.severity === "high" ? 30 : issue.severity === "medium" ? 20 : 10;
  const typeWeight: Record<QuestionQualityIssueType, number> = {
    question_needs_fix: 6,
    answer_needs_fix: 5,
    missing_answer: 4,
    missing_knowledge_point: 3,
    uncategorized: 2,
    ai_unverified: 1,
  };

  return severityWeight + typeWeight[issue.type];
}

export function buildQuestionQualityIssues(
  questions: AnalyticsQuestion[],
  options: { limit?: number } = {},
): QuestionQualityIssue[] {
  const issues: QuestionQualityIssue[] = [];

  for (const question of questions) {
    if (question.question_text_status === "needs_fix") {
      issues.push(
        issue(question, "question_needs_fix", "high", "题干需要修正", "题干已标记为需要修正。"),
      );
    }

    if (question.answer_status === "needs_fix") {
      issues.push(
        issue(question, "answer_needs_fix", "high", "答案需要修正", "答案或解析已标记为需要修正。"),
      );
    }

    if (!hasAnswer(question)) {
      issues.push(
        issue(question, "missing_answer", "high", "缺少标准答案", "没有标准答案或解析，复习时无法稳定核对。"),
      );
    }

    if (!nonEmpty(question.knowledge_point)) {
      issues.push(
        issue(question, "missing_knowledge_point", "medium", "缺少知识点", "无法进入稳定的薄弱点统计。"),
      );
    }

    if (!nonEmpty(question.chapter)) {
      issues.push(
        issue(question, "uncategorized", "medium", "缺少章节分类", "错题库目录和专项复盘会变得不准确。"),
      );
    }

    if (
      question.question_text_status === "ai_unverified" ||
      question.answer_status === "ai_unverified" ||
      question.needs_manual_check
    ) {
      issues.push(
        issue(question, "ai_unverified", "low", "等待人工核对", "AI 或导入结果还没有人工确认。"),
      );
    }
  }

  return issues
    .sort((a, b) => issueWeight(b) - issueWeight(a) || a.questionId.localeCompare(b.questionId))
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY);
}

export function buildQuestionQualitySummary(
  questions: AnalyticsQuestion[],
  options: { limit?: number } = {},
): QuestionQualitySummary {
  const issues = buildQuestionQualityIssues(questions);
  const affectedQuestionIds = new Set(issues.map((issue) => issue.questionId));

  return {
    totalIssueCount: issues.length,
    highIssueCount: issues.filter((issue) => issue.severity === "high").length,
    affectedQuestionCount: affectedQuestionIds.size,
    topIssues: issues.slice(0, options.limit ?? 5),
  };
}

export function buildRoundExposureSummary(
  completedItems: Array<{ question: AnalyticsQuestion; result: ReviewResult }>,
): RoundExposureSummary {
  const topicMap = new Map<string, RoundExposureItem>();
  let masteredCount = 0;
  let wrongCount = 0;

  for (const item of completedItems) {
    const topic = topicForQuestion(item.question);
    const current = topicMap.get(topic) ?? {
      topic,
      wrongCount: 0,
      masteredCount: 0,
      actionHref: practiceTopicHref(topic),
    };

    if (item.result === "wrong_again" || item.result === "still_wrong") {
      current.wrongCount += 1;
      wrongCount += 1;
    }

    if (item.result === "mastered") {
      current.masteredCount += 1;
      masteredCount += 1;
    }

    topicMap.set(topic, current);
  }

  const exposedTopics = Array.from(topicMap.values())
    .filter((item) => item.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || a.topic.localeCompare(b.topic, "zh-CN"))
    .slice(0, 3);
  const firstTopic = exposedTopics[0];

  return {
    exposedTopics,
    completedCount: completedItems.length,
    wrongCount,
    masteredCount,
    nextActionLabel: firstTopic ? `专项复盘：${firstTopic.topic}` : "返回错题库",
    nextActionHref: firstTopic?.actionHref ?? "/questions",
  };
}
