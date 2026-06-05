import type { ReportType } from "@/lib/reports";

type QuestionInput = {
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  mastery_status: string;
  mistake_types: string[] | null;
  created_at: string;
};

type ReviewInput = {
  scheduled_date: string;
  completed_at: string | null;
  review_result: string | null;
};

type KnowledgeStatInput = {
  subject: string;
  chapter: string | null;
  knowledge_point: string;
  weakness_score: number;
  wrong_count: number;
};

export type RuleReportInput = {
  type: ReportType;
  startDate: string;
  endDate: string;
  today: string;
  questions: QuestionInput[];
  reviews: ReviewInput[];
  knowledgeStats: KnowledgeStatInput[];
};

type RankedItem = {
  label?: string;
  count?: number;
  subject?: string;
  chapter?: string | null;
  knowledge_point?: string;
  weakness_score?: number;
  detail?: string;
  title?: string;
};

function countBy(items: string[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const normalized = item.trim();

    if (normalized) {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([label, count]) => ({ label, count }));
}

function dateFromTimestamp(value: string) {
  return value.slice(0, 10);
}

function inRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function buildNextActions({
  weakPoints,
  mistakeTypes,
  overdueReviews,
  hasEnoughData,
}: {
  weakPoints: RankedItem[];
  mistakeTypes: RankedItem[];
  overdueReviews: number;
  hasEnoughData: boolean;
}) {
  if (!hasEnoughData) {
    return [
      {
        title: "先补充错题数据",
        detail: "今天还没有足够错题或复习记录，先去拍题或导入错题卡。",
      },
    ];
  }

  const actions: RankedItem[] = [];

  if (overdueReviews > 0) {
    actions.push({
      title: "优先清理逾期复习",
      detail: `还有 ${overdueReviews} 条逾期复习，先处理它们。`,
    });
  }

  const topWeakPoint = weakPoints[0];
  if (topWeakPoint?.knowledge_point) {
    actions.push({
      title: `复盘 ${topWeakPoint.knowledge_point}`,
      detail: "这是当前规则统计里最薄弱的知识点。",
    });
  }

  const topMistakeType = mistakeTypes[0];
  if (topMistakeType?.label) {
    actions.push({
      title: `专查「${topMistakeType.label}」`,
      detail: "这是近期出现较多的错因。",
    });
  }

  return actions.length > 0
    ? actions
    : [
        {
          title: "保持复习节奏",
          detail: "今天数据稳定，明天继续按待复习列表推进。",
        },
      ];
}

export function buildRuleReportContent(input: RuleReportInput) {
  const periodQuestions = input.questions.filter((question) =>
    inRange(dateFromTimestamp(question.created_at), input.startDate, input.endDate),
  );
  const todayQuestions = input.questions.filter(
    (question) => dateFromTimestamp(question.created_at) === input.today,
  );
  const periodReviews = input.reviews.filter((review) =>
    inRange(review.scheduled_date, input.startDate, input.endDate),
  );
  const completedReviews = periodReviews.filter((review) => review.completed_at);
  const overdueReviews = input.reviews.filter(
    (review) => !review.completed_at && review.scheduled_date < input.today,
  );
  const todayCompletedReviews = input.reviews.filter(
    (review) => review.completed_at && dateFromTimestamp(review.completed_at) === input.today,
  );
  const masteredCount = input.questions.filter(
    (question) => question.mastery_status === "完全掌握",
  ).length;
  const wrongAgainCount = input.reviews.filter(
    (review) => review.review_result === "wrong_again" || review.review_result === "still_wrong",
  ).length;
  const frequentMistakeTypes = countBy(
    periodQuestions.flatMap((question) => question.mistake_types ?? []),
  ).slice(0, 5);
  const weakestKnowledgePoints = input.knowledgeStats
    .slice()
    .sort((a, b) => b.weakness_score - a.weakness_score || b.wrong_count - a.wrong_count)
    .slice(0, 3)
    .map((item) => ({
      subject: item.subject,
      chapter: item.chapter,
      knowledge_point: item.knowledge_point,
      weakness_score: item.weakness_score,
      count: item.wrong_count,
    }));
  const subjectDistribution = countBy(periodQuestions.map((question) => question.subject));
  const hasEnoughData = todayQuestions.length + todayCompletedReviews.length > 0;

  return {
    title:
      input.type === "daily"
        ? "今日学习报告"
        : input.type === "weekly"
          ? "本周学习报告"
          : "本月学习报告",
    source: "rule",
    summary: {
      new_questions: todayQuestions.length,
      period_new_questions: periodQuestions.length,
      completed_reviews: todayCompletedReviews.length,
      period_completed_reviews: completedReviews.length,
      overdue_reviews: overdueReviews.length,
      mastered_count: masteredCount,
      wrong_again_count: wrongAgainCount,
      review_completion_rate:
        periodReviews.length > 0 ? Math.round((completedReviews.length / periodReviews.length) * 100) : 0,
    },
    subject_distribution: subjectDistribution,
    frequent_mistake_types: frequentMistakeTypes,
    weakest_knowledge_points: weakestKnowledgePoints,
    next_actions: buildNextActions({
      weakPoints: weakestKnowledgePoints,
      mistakeTypes: frequentMistakeTypes,
      overdueReviews: overdueReviews.length,
      hasEnoughData,
    }),
    tomorrow_suggestions: buildNextActions({
      weakPoints: weakestKnowledgePoints,
      mistakeTypes: frequentMistakeTypes,
      overdueReviews: overdueReviews.length,
      hasEnoughData,
    }),
    warning: hasEnoughData
      ? ""
      : "今天还没有足够错题或复习记录，先去拍题或导入错题卡。",
  };
}
