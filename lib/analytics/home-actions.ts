import type {
  AnalyticsQuestion,
  AnalyticsReviewResult,
  QuestionQualityCard,
  TodayLiftFocus,
  WeaknessTrend,
} from "./learning-insights.ts";

export type HomeActionCard = {
  id: string;
  tone: "blue" | "green" | "amber" | "red" | "slate";
  title: string;
  description: string;
  metric: string;
  href: string;
  priority: number;
};

type BuildHomeActionCardsInput = {
  focus: TodayLiftFocus;
  questions: AnalyticsQuestion[];
  reviews: AnalyticsReviewResult[];
};

function firstText(values: Array<string | null | undefined>, fallback: string) {
  const value = values.find((item) => typeof item === "string" && item.trim().length > 0);
  return value?.trim() ?? fallback;
}

function buildInboxAction(issue: QuestionQualityCard): HomeActionCard {
  const label = firstText(issue.labels, "待整理题卡");
  const detail = firstText(issue.details, "题卡信息需要整理，先修复后再复盘。");

  return {
    id: `inbox-${issue.questionId}`,
    tone: issue.severity === "high" ? "red" : "amber",
    title: `修复${label}`,
    description: detail,
    metric: `${issue.labels.length || 1} 项问题`,
    href: issue.actionHref,
    priority: 100,
  };
}

function buildWeakTopicAction(weakTopic: WeaknessTrend): HomeActionCard {
  const wrongText =
    weakTopic.recentWrongCount > 0 ? `最近错 ${weakTopic.recentWrongCount} 次` : `${weakTopic.questionCount} 道相关题`;
  const issueText =
    weakTopic.qualityIssueCount > 0 ? `，另有 ${weakTopic.qualityIssueCount} 个题卡问题` : "";

  return {
    id: "weak-topic",
    tone: weakTopic.trend === "up" ? "red" : "amber",
    title: `回看${weakTopic.topic}`,
    description: `${weakTopic.recommendation} ${wrongText}${issueText}。`,
    metric: "薄弱章节",
    href: weakTopic.actionHref,
    priority: 90,
  };
}

function buildRecentQuestionAction(question: AnalyticsQuestion, index: number): HomeActionCard {
  const topic = firstText([question.knowledge_point, question.chapter], "这道错题");
  const chapter = firstText([question.chapter], "未分类章节");

  return {
    id: `recent-${question.id}`,
    tone: question.review_priority === "high" ? "red" : "blue",
    title: `继续复盘${topic}`,
    description: `${question.subject} / ${chapter}，优先处理这道最近该回看的错题。`,
    metric: question.review_priority === "high" ? "高优先级" : "最近错题",
    href: `/questions/${question.id}`,
    priority: 80 - index,
  };
}

function buildReviewAction(reviews: AnalyticsReviewResult[]): HomeActionCard | null {
  const pendingCount = reviews.filter((review) => !review.completed_at).length;

  if (pendingCount <= 0) {
    return null;
  }

  return {
    id: "review",
    tone: "green",
    title: "继续今日复盘",
    description: "把已经排进今天的错题先做完，复盘结果会继续影响后续排序。",
    metric: `${pendingCount} 题`,
    href: "/review/today",
    priority: 70,
  };
}

function fallbackActions(): HomeActionCard[] {
  return [
    {
      id: "import",
      tone: "blue",
      title: "导入错题卡",
      description: "先把最近整理出的错题 JSON 放进题库，生成可复盘资产。",
      metric: "入口",
      href: "/import",
      priority: 20,
    },
    {
      id: "questions",
      tone: "slate",
      title: "整理错题库",
      description: "按题源、学科和章节检查已有题卡，补齐分类与答案状态。",
      metric: "题库",
      href: "/questions",
      priority: 10,
    },
  ];
}

export function buildHomeActionCards({
  focus,
  questions,
  reviews,
}: BuildHomeActionCardsInput): HomeActionCard[] {
  const cards: HomeActionCard[] = [];

  if (focus.inboxIssue) {
    cards.push(buildInboxAction(focus.inboxIssue));
  }

  if (focus.weakTopic) {
    cards.push(buildWeakTopicAction(focus.weakTopic));
  }

  for (const [index, question] of focus.questions.slice(0, 2).entries()) {
    cards.push(buildRecentQuestionAction(question, index));
  }

  const reviewAction = buildReviewAction(reviews);
  if (reviewAction) {
    cards.push(reviewAction);
  }

  if (cards.length < 2) {
    const highPriorityQuestions = questions
      .filter((question) => question.review_priority === "high")
      .filter((question) => !cards.some((card) => card.href === `/questions/${question.id}`))
      .slice(0, 2 - cards.length);

    for (const [index, question] of highPriorityQuestions.entries()) {
      cards.push(buildRecentQuestionAction(question, index + 2));
    }
  }

  for (const action of fallbackActions()) {
    if (cards.length >= 2) {
      break;
    }
    cards.push(action);
  }

  const seen = new Set<string>();
  return cards
    .filter((card) => {
      const key = `${card.id}:${card.href}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);
}
