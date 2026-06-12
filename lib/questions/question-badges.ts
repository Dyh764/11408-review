import type {
  AnswerStatus,
  ChoiceOption,
  Difficulty,
  QuestionTextStatus,
} from "../types";

export type QuestionBadgeTone = "purple" | "cyan" | "green" | "amber" | "red" | "slate";

export type QuestionBadge = {
  label: string;
  tone: QuestionBadgeTone;
};

export type BadgeQuestionInput = {
  difficulty?: Difficulty | string | null;
  question_text_status?: QuestionTextStatus | string | null;
  answer_status?: AnswerStatus | string | null;
  needs_manual_check?: boolean | null;
  choices?: ChoiceOption[] | null;
};

export type BuildQuestionBadgeOptions = {
  reviewStatus?: "overdue" | "due_today" | "ready" | null;
  questionKind?: string | null;
  extraLabels?: string[];
};

const hiddenLabels = new Set(["薄弱章节", "高优先级", "今日重点", "建议复习"]);

function normalizeLabel(label: string) {
  const value = label.trim();

  if (!value || hiddenLabels.has(value)) return "";
  if (value === "中等难度") return "中等";
  if (value === "需要核对") return "需核对";
  if (value === "需要修正") return "需修正";
  if (value === "今日到期") return "今日待复习";
  if (value === "已可复盘") return "已可复习";
  if (value === "基础") return "简单";

  return value;
}

function difficultyLabel(difficulty?: string | null) {
  const value = normalizeLabel(difficulty ?? "");

  if (value === "困难" || value === "较难" || value === "压轴") return "困难";
  if (value === "中等") return "中等";
  if (value === "简单" || value === "容易") return "简单";

  return "未标注";
}

function reviewBadge(status?: BuildQuestionBadgeOptions["reviewStatus"]) {
  if (status === "overdue") return { label: "已逾期", tone: "red" as const };
  if (status === "due_today") return { label: "今日待复习", tone: "amber" as const };
  if (status === "ready") return { label: "已可复习", tone: "purple" as const };

  return null;
}

function attentionBadge(question: BadgeQuestionInput) {
  if (question.question_text_status === "needs_fix" || question.answer_status === "needs_fix") {
    return { label: "需修正", tone: "red" as const };
  }

  if (question.needs_manual_check) {
    return { label: "需核对", tone: "amber" as const };
  }

  return null;
}

function questionKindBadge(question: BadgeQuestionInput, questionKind?: string | null) {
  const label = normalizeLabel(
    questionKind ?? ((question.choices?.length ?? 0) > 0 ? "选择题" : "文字题"),
  );

  if (label !== "选择题" && label !== "文字题") {
    return null;
  }

  return { label, tone: "cyan" as const };
}

function pushUnique(badges: QuestionBadge[], badge: QuestionBadge | null) {
  if (!badge) return;

  const label = normalizeLabel(badge.label);
  if (!label || badges.some((item) => item.label === label)) return;

  badges.push({ ...badge, label });
}

export function buildQuestionBadges(
  question: BadgeQuestionInput,
  options: BuildQuestionBadgeOptions = {},
): QuestionBadge[] {
  const badges: QuestionBadge[] = [];
  const normalizedExtraLabels = new Set((options.extraLabels ?? []).map(normalizeLabel).filter(Boolean));
  const fallbackReviewStatus = normalizedExtraLabels.has("已逾期")
    ? "overdue"
    : normalizedExtraLabels.has("今日待复习")
      ? "due_today"
      : undefined;

  pushUnique(badges, reviewBadge(options.reviewStatus ?? fallbackReviewStatus));
  pushUnique(badges, {
    label: difficultyLabel(question.difficulty),
    tone: difficultyLabel(question.difficulty) === "困难"
      ? "red"
      : difficultyLabel(question.difficulty) === "中等"
        ? "amber"
        : "purple",
  });
  pushUnique(
    badges,
    attentionBadge(question) ??
      (normalizedExtraLabels.has("需修正")
        ? { label: "需修正", tone: "red" as const }
        : normalizedExtraLabels.has("需核对")
          ? { label: "需核对", tone: "amber" as const }
          : null),
  );
  pushUnique(badges, questionKindBadge(question, options.questionKind));

  return badges.slice(0, 4);
}
