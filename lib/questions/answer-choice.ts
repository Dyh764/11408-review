export type ParsedAnswerChoices = {
  labels: string[];
  isMultiple: boolean;
};

const allowedLabels = new Set(["A", "B", "C", "D"]);

function normalizeLabels(value: string) {
  return Array.from(
    new Set(
      [...value.toUpperCase().matchAll(/[A-D]/g)]
        .map((match) => match[0])
        .filter((label) => allowedLabels.has(label)),
    ),
  );
}

export function parseAnswerChoiceLabels(answer?: string | null): ParsedAnswerChoices {
  const source = answer?.trim();

  if (!source) {
    return { labels: [], isMultiple: false };
  }

  const directAnswer = source.match(
    /^[（(]?\s*([A-Da-d](?:\s*[,，、/]\s*[A-Da-d]|\s+[A-Da-d])*)\s*[）)]?[。.]?$/,
  )?.[1];
  const prefixedAnswer = source.match(
    /(?:标准答案|正确答案|参考答案|答案|answer|correct answer)\s*(?:是|为|[:：])?\s*([A-Da-d](?:\s*(?:[,，、/]|和|与|and)?\s*[A-Da-d])*)/i,
  )?.[1];
  const selectedAnswer = source.match(
    /(?:本题|此题)?\s*(?:应选|选择|选)\s*([A-Da-d](?:\s*(?:[,，、/]|和|与|and)?\s*[A-Da-d])*)/,
  )?.[1];
  const answerPart = directAnswer ?? prefixedAnswer ?? selectedAnswer;

  if (!answerPart) {
    return { labels: [], isMultiple: false };
  }

  const labels = normalizeLabels(answerPart);

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
