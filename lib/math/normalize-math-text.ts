const mathCommandRules: Array<[RegExp, string]> = [
  [/(?<!\\)sum_/g, "\\sum_"],
  [/(?<!\\)sum\{/g, "\\sum{"],
  [/(?<!\\)infty/g, "\\infty"],
  [/(?<!\\)frac\{/g, "\\frac{"],
  [/(?<!\\)sqrt\{/g, "\\sqrt{"],
  [/(?<!\\)lim_/g, "\\lim_"],
  [/(?<!\\)int_/g, "\\int_"],
];

const obviousMathPattern =
  /(\\(?:sum|frac|sqrt|lim|int)(?:\{[^{}]*\}|_[{\w=+\-^\\]+|\^[{\w=+\-^\\]+|\s*[a-zA-Z0-9_{}=+\-^\\]+)*)/g;

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

export function normalizeMathText(input?: string | null) {
  if (!input) {
    return "";
  }

  const parts: string[] = [];
  let index = 0;

  while (index < input.length) {
    const next = input.indexOf("$", index);

    if (next === -1) {
      parts.push(normalizePlainTextSegment(input.slice(index)));
      break;
    }

    if (next > index) {
      parts.push(normalizePlainTextSegment(input.slice(index, next)));
    }

    const isBlock = input.startsWith("$$", next);
    const delimiter = isBlock ? "$$" : "$";
    const end = input.indexOf(delimiter, next + delimiter.length);

    if (end === -1) {
      parts.push(input.slice(next));
      break;
    }

    parts.push(input.slice(next, end + delimiter.length));
    index = end + delimiter.length;
  }

  return parts.join("");
}
