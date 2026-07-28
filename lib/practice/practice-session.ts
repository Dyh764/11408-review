import type { ReviewResult } from "../types";
import type { PracticeFilter } from "./practice-catalog";

export const practiceSessionStoragePrefix = "11408-review:practice-session:v1";

export type PracticeResultCounts = Record<ReviewResult, number>;

export type PracticeSessionV1 = {
  version: 1;
  userId: string;
  scopeKey: string;
  roundId: string;
  orderedQuestionIds: string[];
  remainingQuestionIds: string[];
  lastActiveQuestionId: string | null;
  completedCounts: PracticeResultCounts;
  skippedCount: number;
  updatedAt: string;
};

export const emptyPracticeResultCounts = (): PracticeResultCounts => ({
  still_wrong: 0,
  improved: 0,
  mastered: 0,
  wrong_again: 0,
});

export function buildPracticeScopeKey(filter: PracticeFilter) {
  if (filter.type === "exam408-choice") {
    return ["exam408-choice", filter.subject || "all", filter.chapter || "all"].join(":");
  }

  if (filter.type === "daily-choice") {
    return ["daily-choice", filter.date].join(":");
  }

  if (filter.type === "high-frequency-choice") {
    return "high-frequency-choice";
  }

  if (filter.type === "chapter") {
    return ["chapter", filter.subject, filter.chapter].join(":");
  }

  if (filter.type === "topic") {
    return ["topic", filter.topic].join(":");
  }

  return ["mistake", filter.mistakeType].join(":");
}

export function buildPracticeSessionStorageKey(userId: string, scopeKey: string) {
  return `${practiceSessionStoragePrefix}:${encodeURIComponent(userId)}:${encodeURIComponent(scopeKey)}`;
}

function uniqueQuestionIds(questionIds: string[]) {
  return Array.from(new Set(questionIds.map((id) => id.trim()).filter(Boolean)));
}

function shuffleQuestionIds(questionIds: string[], random: () => number) {
  const shuffled = uniqueQuestionIds(questionIds);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function createPracticeSession({
  userId,
  filter,
  questionIds,
  previousFirstQuestionId,
  random = Math.random,
  now = new Date().toISOString(),
}: {
  userId: string;
  filter: PracticeFilter;
  questionIds: string[];
  previousFirstQuestionId?: string | null;
  random?: () => number;
  now?: string;
}): PracticeSessionV1 {
  const orderedQuestionIds = shuffleQuestionIds(questionIds, random);

  if (
    orderedQuestionIds.length > 1 &&
    previousFirstQuestionId &&
    orderedQuestionIds[0] === previousFirstQuestionId
  ) {
    [orderedQuestionIds[0], orderedQuestionIds[1]] = [
      orderedQuestionIds[1],
      orderedQuestionIds[0],
    ];
  }

  return {
    version: 1,
    userId,
    scopeKey: buildPracticeScopeKey(filter),
    roundId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    orderedQuestionIds,
    remainingQuestionIds: [...orderedQuestionIds],
    lastActiveQuestionId: null,
    completedCounts: emptyPracticeResultCounts(),
    skippedCount: 0,
    updatedAt: now,
  };
}

function isResultCounts(value: unknown): value is PracticeResultCounts {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return ["still_wrong", "improved", "mastered", "wrong_again"].every(
    (key) => typeof record[key] === "number" && Number.isFinite(record[key]),
  );
}

export function parsePracticeSession(value: string | null): PracticeSessionV1 | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PracticeSessionV1>;

    if (
      parsed.version !== 1 ||
      typeof parsed.userId !== "string" ||
      typeof parsed.scopeKey !== "string" ||
      typeof parsed.roundId !== "string" ||
      !Array.isArray(parsed.orderedQuestionIds) ||
      !Array.isArray(parsed.remainingQuestionIds) ||
      (parsed.lastActiveQuestionId !== null &&
        typeof parsed.lastActiveQuestionId !== "string") ||
      !isResultCounts(parsed.completedCounts) ||
      typeof parsed.skippedCount !== "number" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,
      version: 1,
      orderedQuestionIds: uniqueQuestionIds(parsed.orderedQuestionIds as string[]),
      remainingQuestionIds: uniqueQuestionIds(parsed.remainingQuestionIds as string[]),
    } as PracticeSessionV1;
  } catch {
    return null;
  }
}

export function reconcilePracticeSession(
  session: PracticeSessionV1,
  availableQuestionIds: string[],
  now = new Date().toISOString(),
): PracticeSessionV1 {
  const available = uniqueQuestionIds(availableQuestionIds);
  const availableSet = new Set(available);
  const knownSet = new Set(session.orderedQuestionIds);
  const newQuestionIds = available.filter((id) => !knownSet.has(id));
  const orderedQuestionIds = [
    ...session.orderedQuestionIds.filter((id) => availableSet.has(id)),
    ...newQuestionIds,
  ];
  const remainingQuestionIds = [
    ...session.remainingQuestionIds.filter((id) => availableSet.has(id)),
    ...newQuestionIds,
  ];

  return {
    ...session,
    orderedQuestionIds,
    remainingQuestionIds,
    lastActiveQuestionId:
      session.lastActiveQuestionId &&
      orderedQuestionIds.includes(session.lastActiveQuestionId)
        ? session.lastActiveQuestionId
        : null,
    updatedAt: now,
  };
}

export function selectPracticeResumeQuestionId(session: PracticeSessionV1) {
  if (session.remainingQuestionIds.length === 0) {
    return null;
  }

  if (!session.lastActiveQuestionId) {
    return session.remainingQuestionIds[0];
  }

  const remainingSet = new Set(session.remainingQuestionIds);
  const activeIndex = session.orderedQuestionIds.indexOf(session.lastActiveQuestionId);

  if (activeIndex < 0) {
    return session.remainingQuestionIds[0];
  }

  for (let offset = 1; offset <= session.orderedQuestionIds.length; offset += 1) {
    const candidate =
      session.orderedQuestionIds[(activeIndex + offset) % session.orderedQuestionIds.length];

    if (remainingSet.has(candidate)) {
      return candidate;
    }
  }

  return session.remainingQuestionIds[0];
}

export function markPracticeQuestionShown(
  session: PracticeSessionV1,
  questionId: string,
  now = new Date().toISOString(),
): PracticeSessionV1 {
  if (!session.remainingQuestionIds.includes(questionId)) {
    return session;
  }

  return {
    ...session,
    lastActiveQuestionId: questionId,
    updatedAt: now,
  };
}

export function completePracticeQuestion(
  session: PracticeSessionV1,
  questionId: string,
  result: ReviewResult,
  now = new Date().toISOString(),
): PracticeSessionV1 {
  if (!session.remainingQuestionIds.includes(questionId)) {
    return session;
  }

  return {
    ...session,
    remainingQuestionIds: session.remainingQuestionIds.filter((id) => id !== questionId),
    completedCounts: {
      ...session.completedCounts,
      [result]: session.completedCounts[result] + 1,
    },
    updatedAt: now,
  };
}

export function skipPracticeQuestion(
  session: PracticeSessionV1,
  questionId: string,
  now = new Date().toISOString(),
): PracticeSessionV1 {
  if (!session.remainingQuestionIds.includes(questionId)) {
    return session;
  }

  return {
    ...session,
    remainingQuestionIds: session.remainingQuestionIds.filter((id) => id !== questionId),
    skippedCount: session.skippedCount + 1,
    updatedAt: now,
  };
}

export function removeUnavailablePracticeQuestion(
  session: PracticeSessionV1,
  questionId: string,
  now = new Date().toISOString(),
): PracticeSessionV1 {
  return {
    ...session,
    orderedQuestionIds: session.orderedQuestionIds.filter((id) => id !== questionId),
    remainingQuestionIds: session.remainingQuestionIds.filter((id) => id !== questionId),
    lastActiveQuestionId:
      session.lastActiveQuestionId === questionId ? null : session.lastActiveQuestionId,
    updatedAt: now,
  };
}
