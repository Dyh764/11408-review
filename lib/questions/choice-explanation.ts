export type ChoiceExplanationResult = {
  explanationsByLabel: Record<string, string>;
  complete: boolean;
};

const markerPattern =
  /(?:^|[\n\r；;。])\s*(?:选项\s*)?([A-D])(?:\s*项)?\s*(?:[：:、.．]\s*|\s+|(?=[\u3400-\u9fff]))/g;

function normalizeExplanation(value: string | null | undefined) {
  return value?.trim().replace(/^过程\s*[：:]\s*/, "") ?? "";
}

export function parseChoiceExplanations(
  value: string | null | undefined,
  expectedLabels: string[] = ["A", "B", "C", "D"],
): ChoiceExplanationResult {
  const text = normalizeExplanation(value);
  const expected = new Set(expectedLabels.map((label) => label.trim().toUpperCase()).filter(Boolean));
  const markers: Array<{ label: string; markerStart: number; contentStart: number }> = [];

  markerPattern.lastIndex = 0;
  for (let match = markerPattern.exec(text); match; match = markerPattern.exec(text)) {
    const label = match[1]?.toUpperCase();

    if (label && expected.has(label)) {
      markers.push({
        label,
        markerStart: match.index,
        contentStart: markerPattern.lastIndex,
      });
    }
  }

  const explanationsByLabel: Record<string, string> = {};

  markers.forEach((marker, index) => {
    const nextMarker = markers[index + 1];
    const explanation = text
      .slice(marker.contentStart, nextMarker?.markerStart ?? text.length)
      .trim()
      .replace(/^[：:、.．\s]+/, "")
      .replace(/[；;。\s]+$/, "");

    if (!explanation) {
      return;
    }

    explanationsByLabel[marker.label] = explanationsByLabel[marker.label]
      ? `${explanationsByLabel[marker.label]}；${explanation}`
      : explanation;
  });

  return {
    explanationsByLabel,
    complete:
      expected.size > 0 &&
      Array.from(expected).every((label) => Boolean(explanationsByLabel[label]?.trim())),
  };
}
