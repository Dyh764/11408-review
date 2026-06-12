import type {
  AnswerSource,
  AnswerStatus,
  ChoiceOption,
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
  choices?: ChoiceOption[] | null;
  standard_answer?: string | null;
  answer_explanation?: string | null;
  question_text_status: QuestionTextStatus | string | null;
  answer_status: AnswerStatus | string | null;
  answer_source?: AnswerSource | string | null;
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
  | "missing_question_text"
  | "missing_answer"
  | "missing_chapter"
  | "missing_knowledge_point"
  | "uncategorized"
  | "question_needs_fix"
  | "answer_needs_fix"
  | "choices_invalid"
  | "math_suspect"
  | "ai_unverified";

export type QuestionQualityIssue = {
  questionId: string;
  type: QuestionQualityIssueType;
  severity: "high" | "medium" | "low";
  label: string;
  detail: string;
  actionHref: string;
};

export type QuestionQualityCard = {
  questionId: string;
  severity: QuestionQualityIssue["severity"];
  labels: string[];
  details: string[];
  issueTypes: QuestionQualityIssueType[];
  actionHref: string;
  isAiOnly: boolean;
};

export type QuestionQualitySummary = {
  totalIssueCount: number;
  highIssueCount: number;
  severeIssueCount: number;
  needsFixCount: number;
  uncategorizedCount: number;
  aiUnverifiedCount: number;
  affectedQuestionCount: number;
  topIssues: QuestionQualityCard[];
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

function hasStandardAnswer(question: AnalyticsQuestion) {
  return nonEmpty(question.standard_answer);
}

function questionBaseScore(question: AnalyticsQuestion) {
  let score = 0;

  if (question.review_priority === "high") score += 10;
  if (question.review_priority === "medium") score += 4;
  if (question.needs_manual_check) score += 2;
  if (question.question_text_status === "needs_fix") score += 8;
  if (question.answer_status === "needs_fix") score += 8;
  if (!hasStandardAnswer(question)) score += 6;
  if (!nonEmpty(question.knowledge_point)) score += 4;
  if (!nonEmpty(question.chapter)) score += 3;

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
      trend.recommendation = "题卡信息还不干净，先补分类或修正答案。";
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

export function selectHomeFocusTrend(trends: WeaknessTrend[]) {
  return (
    trends.find(
      (trend) =>
        trend.recentWrongCount > 0 ||
        trend.repeatedWrongCount > 0 ||
        trend.qualityIssueCount > 0 ||
        (trend.questionCount > 1 && trend.trend === "up"),
    ) ?? null
  );
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
    missing_question_text: 10,
    missing_answer: 9,
    question_needs_fix: 8,
    answer_needs_fix: 7,
    missing_chapter: 6,
    missing_knowledge_point: 5,
    choices_invalid: 4,
    math_suspect: 3,
    uncategorized: 2,
    ai_unverified: 1,
  };

  return severityWeight + typeWeight[issue.type];
}

function isUncategorizedLabel(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized === "未分类" || normalized === "待整理" || normalized === "待整理错题";
}

function hasInvalidChoices(question: AnalyticsQuestion) {
  const choices = question.choices as unknown;

  if (choices === undefined || choices === null) {
    return false;
  }

  if (!Array.isArray(choices)) {
    return true;
  }

  const labels = new Set<string>();
  for (const choice of choices) {
    if (typeof choice !== "object" || choice === null) {
      return true;
    }

    const label = "label" in choice ? String(choice.label ?? "").trim().toUpperCase() : "";
    const text = "text" in choice ? String(choice.text ?? "").trim() : "";

    if (!label || !text || labels.has(label)) {
      return true;
    }

    labels.add(label);
  }

  return false;
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function hasSuspiciousMath(question: AnalyticsQuestion) {
  const text = [question.question_text, question.standard_answer, question.answer_explanation]
    .filter(nonEmpty)
    .join("\n");

  if (!text) {
    return false;
  }

  if (countMatches(text, /\$/g) % 2 !== 0) {
    return true;
  }

  if (countMatches(text, /\\\(/g) !== countMatches(text, /\\\)/g)) {
    return true;
  }

  if (countMatches(text, /\\\[/g) !== countMatches(text, /\\\]/g)) {
    return true;
  }

  return false;
}

function hasAiUnverifiedSignal(question: AnalyticsQuestion) {
  return (
    question.question_text_status === "ai_unverified" ||
    question.answer_status === "ai_unverified" ||
    question.needs_manual_check
  );
}

export function buildQuestionQualityIssues(
  questions: AnalyticsQuestion[],
  options: { limit?: number; includeAiUnverified?: boolean } = {},
): QuestionQualityIssue[] {
  const issues: QuestionQualityIssue[] = [];

  for (const question of questions) {
    if (!nonEmpty(question.question_text)) {
      issues.push(
        issue(question, "missing_question_text", "high", "缺题干", "题卡没有可复习的题干内容。"),
      );
    }

    if (!hasStandardAnswer(question)) {
      issues.push(
        issue(question, "missing_answer", "high", "缺标准答案", "缺少标准答案，复习时无法稳定核对。"),
      );
    }

    if (!nonEmpty(question.chapter)) {
      issues.push(
        issue(question, "missing_chapter", "medium", "缺章节", "章节为空，题库目录和专项复盘会不准确。"),
      );
    }

    if (!nonEmpty(question.knowledge_point)) {
      issues.push(
        issue(question, "missing_knowledge_point", "medium", "缺知识点", "无法进入稳定的薄弱点统计。"),
      );
    }

    if (isUncategorizedLabel(question.chapter) || isUncategorizedLabel(question.knowledge_point)) {
      issues.push(
        issue(question, "uncategorized", "medium", "未分类", "题卡仍停留在待整理分类中。"),
      );
    }

    if (question.question_text_status === "needs_fix") {
      issues.push(
        issue(question, "question_needs_fix", "high", "题干待修正", "题干已标记为需要修正。"),
      );
    }

    if (question.answer_status === "needs_fix") {
      issues.push(
        issue(question, "answer_needs_fix", "high", "答案待修正", "答案或解析已标记为需要修正。"),
      );
    }

    if (hasInvalidChoices(question)) {
      issues.push(
        issue(question, "choices_invalid", "medium", "选项格式异常", "choices 中存在空选项、重复选项或非数组数据。"),
      );
    }

    if (hasSuspiciousMath(question)) {
      issues.push(
        issue(question, "math_suspect", "medium", "数学公式疑似异常", "题干或答案中存在疑似未闭合的公式标记。"),
      );
    }

    if (options.includeAiUnverified && hasAiUnverifiedSignal(question)) {
      issues.push(
        issue(question, "ai_unverified", "low", "AI 未核对", "AI 或导入结果还没有人工确认。"),
      );
    }
  }

  return issues
    .sort((a, b) => issueWeight(b) - issueWeight(a) || a.questionId.localeCompare(b.questionId))
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY);
}

function severityRank(severity: QuestionQualityIssue["severity"]) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function cardWeight(card: QuestionQualityCard) {
  return (
    severityRank(card.severity) * 100 +
    Math.max(
      ...card.issueTypes.map((type) =>
        issueWeight({
          questionId: card.questionId,
          type,
          severity: card.severity,
          label: "",
          detail: "",
          actionHref: card.actionHref,
        }),
      ),
    ) -
    (card.isAiOnly ? 25 : 0)
  );
}

export function buildQuestionQualityCards(issues: QuestionQualityIssue[]): QuestionQualityCard[] {
  const grouped = new Map<string, QuestionQualityIssue[]>();

  for (const item of issues) {
    grouped.set(item.questionId, [...(grouped.get(item.questionId) ?? []), item]);
  }

  return Array.from(grouped.entries())
    .map(([questionId, items]) => {
      const sorted = [...items].sort((a, b) => issueWeight(b) - issueWeight(a));
      const severity = sorted.reduce<QuestionQualityIssue["severity"]>(
        (current, item) => (severityRank(item.severity) > severityRank(current) ? item.severity : current),
        "low",
      );

      return {
        questionId,
        severity,
        labels: Array.from(new Set(sorted.map((item) => item.label))),
        details: Array.from(new Set(sorted.map((item) => item.detail))),
        issueTypes: Array.from(new Set(sorted.map((item) => item.type))),
        actionHref: sorted[0]?.actionHref ?? `/questions/${questionId}`,
        isAiOnly: sorted.every((item) => item.type === "ai_unverified"),
      };
    })
    .sort((a, b) => cardWeight(b) - cardWeight(a) || a.questionId.localeCompare(b.questionId));
}

export function buildQuestionQualitySummary(
  questions: AnalyticsQuestion[],
  options: { limit?: number; includeAiUnverified?: boolean } = {},
): QuestionQualitySummary {
  const issues = buildQuestionQualityIssues(questions, {
    includeAiUnverified: options.includeAiUnverified,
  });
  const cards = buildQuestionQualityCards(issues);
  const aiUnverifiedCards = buildQuestionQualityCards(
    buildQuestionQualityIssues(questions, { includeAiUnverified: true }).filter(
      (item) => item.type === "ai_unverified",
    ),
  );
  const cardsWithHigh = cards.filter((card) => card.severity === "high").length;

  return {
    totalIssueCount: cards.reduce((count, card) => count + card.issueTypes.length, 0),
    highIssueCount: cardsWithHigh,
    severeIssueCount: cardsWithHigh,
    needsFixCount: cards.filter(
      (card) =>
        card.issueTypes.includes("question_needs_fix") ||
        card.issueTypes.includes("answer_needs_fix"),
    ).length,
    uncategorizedCount: cards.filter(
      (card) =>
        card.issueTypes.includes("missing_chapter") ||
        card.issueTypes.includes("missing_knowledge_point") ||
        card.issueTypes.includes("uncategorized"),
    ).length,
    aiUnverifiedCount: aiUnverifiedCards.length,
    affectedQuestionCount: cards.length,
    topIssues: cards.slice(0, options.limit ?? 5),
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
