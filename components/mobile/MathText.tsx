import katex from "katex";
import { splitMathText, type MathTextPart } from "@/lib/math/math-text";

type MathTextProps = {
  text?: string | null;
  fallback?: string;
  compact?: boolean;
  className?: string;
};

function renderMath(part: MathTextPart) {
  try {
    return katex.renderToString(part.value, {
      displayMode: part.type === "blockMath",
      throwOnError: true,
      strict: false,
    });
  } catch {
    return null;
  }
}

export function MathText({ text, fallback = "", compact = false, className = "" }: MathTextProps) {
  const source = text?.trim() ? text : fallback;
  const parts = splitMathText(source);

  if (!source) {
    return null;
  }

  return (
    <span
      className={`block min-w-0 whitespace-pre-wrap break-words ${compact ? "text-xs leading-5" : "text-sm leading-6"} ${className}`}
    >
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={`${part.type}-${index}`}>{part.value}</span>;
        }

        const html = renderMath(part);
        const wrapperClass =
          part.type === "blockMath"
            ? "math-block my-2 block max-w-full overflow-x-auto overflow-y-hidden py-1"
            : "math-inline inline-flex max-w-full overflow-x-auto overflow-y-hidden align-middle";

        return (
          <span key={`${part.type}-${index}`} className={wrapperClass}>
            {html ? (
              <span dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <span>{part.type === "blockMath" ? `$$${part.value}$$` : `$${part.value}$`}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}
