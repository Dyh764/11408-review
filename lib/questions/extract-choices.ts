import type { ChoiceOption } from "@/lib/types";

const allowedLabels = new Set(["A", "B", "C", "D"]);
const markerPattern = /(?:^|(?<=[\s。；;，,、]))(?:（([A-Da-d])）|\(([A-Da-d])\)|([A-Da-d])[\.\uFF0E、:：])\s*/g;

function normalizeLabel(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeChoices(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const choices: ChoiceOption[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const label = normalizeLabel(record.label);
    const text = normalizeText(record.text);

    if (!allowedLabels.has(label) || !text || seen.has(label)) {
      continue;
    }

    seen.add(label);
    choices.push({ label, text });
  }

  return choices;
}

export function splitQuestionTextAndChoices(questionText?: string | null): {
  questionText: string;
  choices: ChoiceOption[];
} {
  const source = questionText?.trim() ?? "";

  if (!source) {
    return { questionText: "", choices: [] };
  }

  const matches = [...source.matchAll(markerPattern)].map((match) => ({
    index: match.index ?? 0,
    markerLength: match[0].length,
    label: (match[1] ?? match[2] ?? match[3] ?? "").toUpperCase(),
  }));
  const uniqueLabels = new Set(matches.map((match) => match.label));

  if (matches.length < 2 || uniqueLabels.size < 2) {
    return { questionText: source, choices: [] };
  }

  const choices: ChoiceOption[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const textStart = current.index + current.markerLength;
    const textEnd = next?.index ?? source.length;
    const text = source.slice(textStart, textEnd).trim();

    if (allowedLabels.has(current.label) && text) {
      choices.push({ label: current.label, text });
    }
  }

  if (choices.length < 2) {
    return { questionText: source, choices: [] };
  }

  const stem = source.slice(0, matches[0].index).trim();

  return {
    questionText: stem || source,
    choices,
  };
}

export function extractChoicesFromQuestionText(
  questionText?: string | null,
  explicitChoices?: unknown,
): ChoiceOption[] {
  const normalized = normalizeChoices(explicitChoices);

  if (normalized.length > 0) {
    return normalized;
  }

  return splitQuestionTextAndChoices(questionText).choices;
}

export function getQuestionStemAndChoices(
  questionText?: string | null,
  explicitChoices?: unknown,
): { questionText: string; choices: ChoiceOption[] } {
  const choices = normalizeChoices(explicitChoices);

  if (choices.length > 0) {
    return {
      questionText: questionText?.trim() ?? "",
      choices,
    };
  }

  return splitQuestionTextAndChoices(questionText);
}
