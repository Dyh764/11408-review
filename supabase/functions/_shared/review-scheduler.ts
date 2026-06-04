export type ReviewInsert = {
  user_id: string;
  question_id: string;
  scheduled_date: string;
};

const initialOffsetsByMastery: Record<string, number[]> = {
  "瀹屽叏娌℃€濊矾": [0, 1, 3, 7, 14, 30],
  "鏈変竴鐐规€濊矾": [1, 3, 7, 15, 30],
  "鎬濊矾瀵逛絾鍗′綇": [1, 3, 7, 15],
  "璁＄畻閿欒": [3, 7, 14],
  "鍋氬浣嗕笉绋?": [5, 15, 30],
  "瀹屽叏鎺屾彙": [],
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function buildInitialReviewPlan(input: {
  userId: string;
  questionId: string;
  masteryStatus: string;
  baseDate?: Date;
  existingScheduledDates?: string[];
}): ReviewInsert[] {
  const offsets = initialOffsetsByMastery[input.masteryStatus] ?? [1, 3, 7];
  const baseDate = input.baseDate ?? new Date();
  const seen = new Set(input.existingScheduledDates ?? []);

  return offsets.reduce<ReviewInsert[]>((rows, offset) => {
    const scheduledDate = toIsoDate(addDays(baseDate, offset));

    if (seen.has(scheduledDate)) {
      return rows;
    }

    seen.add(scheduledDate);
    rows.push({
      user_id: input.userId,
      question_id: input.questionId,
      scheduled_date: scheduledDate,
    });

    return rows;
  }, []);
}
