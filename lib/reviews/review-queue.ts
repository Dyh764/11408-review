export type ReviewQueueItem = {
  question_id: string;
};

export function moveStartQuestionToFront<T extends ReviewQueueItem>(
  reviews: T[],
  startQuestionId?: string | null,
): T[] {
  const targetId = startQuestionId?.trim();
  if (!targetId) {
    return reviews;
  }

  const targetIndex = reviews.findIndex((review) => review.question_id === targetId);
  if (targetIndex <= 0) {
    return reviews;
  }

  const ordered = [...reviews];
  const [target] = ordered.splice(targetIndex, 1);
  ordered.unshift(target);
  return ordered;
}
