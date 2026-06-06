export type ParsedAnswerChoices = {
  labels: string[];
  isMultiple: boolean;
};

const allowedLabels = new Set(["A", "B", "C", "D"]);

export function parseAnswerChoiceLabels(answer?: string | null): ParsedAnswerChoices {
  if (!answer?.trim()) {
    return { labels: [], isMultiple: false };
  }

  const answerPart = answer.match(/答案\s*[：:]\s*([A-Da-d][A-Da-d\s,，、和与]*)/)?.[1];

  if (!answerPart) {
    return { labels: [], isMultiple: false };
  }

  const labels = Array.from(
    new Set(
      [...answerPart.toUpperCase().matchAll(/[A-D]/g)]
        .map((match) => match[0])
        .filter((label) => allowedLabels.has(label)),
    ),
  );

  return {
    labels,
    isMultiple: labels.length > 1,
  };
}

export function areChoiceAnswersEqual(selectedLabels: string[], correctLabels: string[]) {
  const selected = [...new Set(selectedLabels.map((label) => label.toUpperCase()))].sort();
  const correct = [...new Set(correctLabels.map((label) => label.toUpperCase()))].sort();

  return selected.length === correct.length && selected.every((label, index) => label === correct[index]);
}
