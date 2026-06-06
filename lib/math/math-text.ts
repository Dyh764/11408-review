export type MathTextPart =
  | { type: "text"; value: string }
  | { type: "inlineMath"; value: string }
  | { type: "blockMath"; value: string };

export function splitMathText(input: string): MathTextPart[] {
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

  while (index < input.length) {
    const next = input.indexOf("$", index);

    if (next === -1) {
      pushText(input.slice(index));
      break;
    }

    if (next > index) {
      pushText(input.slice(index, next));
    }

    const isBlock = input.startsWith("$$", next);
    const delimiter = isBlock ? "$$" : "$";
    const contentStart = next + delimiter.length;
    const contentEnd = input.indexOf(delimiter, contentStart);

    if (contentEnd === -1) {
      pushText(input.slice(next));
      break;
    }

    const value = input.slice(contentStart, contentEnd).trim();
    parts.push({ type: isBlock ? "blockMath" : "inlineMath", value });
    index = contentEnd + delimiter.length;
  }

  return parts.filter((part) => part.value.length > 0);
}
