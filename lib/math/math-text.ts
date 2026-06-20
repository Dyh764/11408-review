export type MathTextPart =
  | { type: "text"; value: string }
  | { type: "inlineMath"; value: string }
  | { type: "blockMath"; value: string };

const mathCommandRules: Array<[RegExp, string]> = [
  [/(?<!\\)sum_/g, "\\sum_"],
  [/(?<!\\)sum\{/g, "\\sum{"],
  [/(?<!\\)infty/g, "\\infty"],
  [/(?<!\\)frac\{/g, "\\frac{"],
  [/(?<!\\)sqrt\{/g, "\\sqrt{"],
  [/(?<!\\)lim_/g, "\\lim_"],
  [/(?<!\\)int_/g, "\\int_"],
  [/(?<!\\)tan\^/g, "\\tan^"],
];

const obviousMathPattern =
  /(\\lim_\{[^}]+\}|\\tan\^[a-zA-Z0-9{}]+(?:\([^，,。；;]*\))?|\\(?:sum|int)_[^\s，,。；;]+|\\(?:frac|sqrt)\{[^{}]*\}(?:\{[^{}]*\})?)/g;

function normalizeMathCommands(value: string) {
  return mathCommandRules.reduce((result, [pattern, replacement]) => {
    return result.replace(pattern, replacement);
  }, value);
}

function normalizePlainTextSegment(segment: string) {
  const normalized = normalizeMathCommands(segment);

  return normalized.replace(obviousMathPattern, (match) => {
    const trimmed = match.trim();
    return trimmed ? `$${trimmed}$` : match;
  });
}

function normalizeMathText(input: string) {
  const preparedInput = input.replace(/\\\$/g, "$");
  const parts: string[] = [];
  let index = 0;

  while (index < preparedInput.length) {
    const next = preparedInput.indexOf("$", index);

    if (next === -1) {
      parts.push(normalizePlainTextSegment(preparedInput.slice(index)));
      break;
    }

    if (next > index) {
      parts.push(normalizePlainTextSegment(preparedInput.slice(index, next)));
    }

    const isBlock = preparedInput.startsWith("$$", next);
    const delimiter = isBlock ? "$$" : "$";
    const end = preparedInput.indexOf(delimiter, next + delimiter.length);

    if (end === -1) {
      parts.push(preparedInput.slice(next));
      break;
    }

    parts.push(preparedInput.slice(next, end + delimiter.length));
    index = end + delimiter.length;
  }

  return parts.join("");
}

export function splitMathText(input: string): MathTextPart[] {
  const normalizedInput = normalizeMathText(input);
  const parts: MathTextPart[] = [];
  let index = 0;

  function pushText(value: string) {
    if (!value) {
      return;
    }

    const previous = parts[parts.length - 1];
    if (previous?.type === "text") {
      previous.value += value;
      return;
    }

    parts.push({ type: "text", value });
  }

  while (index < normalizedInput.length) {
    const next = normalizedInput.indexOf("$", index);

    if (next === -1) {
      pushText(normalizedInput.slice(index));
      break;
    }

    if (next > index) {
      pushText(normalizedInput.slice(index, next));
    }

    const isBlock = normalizedInput.startsWith("$$", next);
    const delimiter = isBlock ? "$$" : "$";
    const contentStart = next + delimiter.length;
    const contentEnd = normalizedInput.indexOf(delimiter, contentStart);

    if (contentEnd === -1) {
      pushText(normalizedInput.slice(next));
      break;
    }

    const value = normalizedInput.slice(contentStart, contentEnd).trim();
    parts.push({ type: isBlock ? "blockMath" : "inlineMath", value });
    index = contentEnd + delimiter.length;
  }

  return parts.filter((part) => part.value.length > 0);
}
