import { MathText } from "@/components/mobile/MathText";
import type { ChoiceOption } from "@/lib/types";

type ChoiceListProps = {
  choices?: ChoiceOption[] | null;
  compact?: boolean;
  selectedLabels?: string[];
  correctLabels?: string[];
  onToggleChoice?: (label: string) => void;
  revealAnswer?: boolean;
  disabled?: boolean;
  mode?: "display" | "answering" | "reviewed";
  explanationsByLabel?: Record<string, string>;
};

export function ChoiceList({
  choices,
  compact = false,
  selectedLabels = [],
  correctLabels = [],
  onToggleChoice,
  revealAnswer = false,
  disabled = false,
  mode = "display",
  explanationsByLabel = {},
}: ChoiceListProps) {
  const visibleChoices = (choices ?? []).filter(
    (choice) => choice.label.trim() && choice.text.trim(),
  );

  if (visibleChoices.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "grid gap-2" : "grid gap-2.5"}>
      {visibleChoices.map((choice) => {
        const isSelected = selectedLabels.includes(choice.label);
        const isCorrect = revealAnswer && correctLabels.includes(choice.label);
        const isWrongSelection = revealAnswer && isSelected && !correctLabels.includes(choice.label);
        const isInteractive = !disabled && mode === "answering";
        const explanation = revealAnswer ? explanationsByLabel[choice.label]?.trim() : "";
        const stateClass = isWrongSelection
          ? "border-red-200 bg-red-50 text-red-950 shadow-[0_8px_18px_rgba(220,38,38,0.08)]"
          : isCorrect
            ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-[0_8px_18px_rgba(5,150,105,0.08)]"
            : isSelected
              ? "border-blue-300 bg-blue-50 text-blue-950 shadow-[0_8px_18px_rgba(37,99,235,0.1)]"
              : "border-slate-200 bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.045)]";
        const labelClass = isWrongSelection
          ? "bg-red-600 text-white ring-red-100"
          : isCorrect
            ? "bg-emerald-600 text-white ring-emerald-100"
            : isSelected
              ? "bg-blue-600 text-white ring-blue-100"
              : "bg-slate-50 text-blue-700 ring-slate-200";

        return (
          <div key={choice.label} className="min-w-0">
            <button
              type="button"
              onClick={() => onToggleChoice?.(choice.label)}
              disabled={!isInteractive}
              aria-pressed={isSelected}
              className={`answer-choice flex min-w-0 items-start gap-3 rounded-xl border text-left transition ${stateClass} ${
                isInteractive ? "active:scale-[0.99]" : "cursor-default"
              } ${compact ? "min-h-11 p-2.5" : "min-h-12 p-3.5"}`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black leading-none ring-1 ${labelClass}`}
              >
                {choice.label}
              </span>
              <MathText
                text={choice.text}
                compact={compact}
                className={`min-w-0 flex-1 pt-0.5 font-semibold ${compact ? "text-sm leading-6" : "text-base leading-7"}`}
              />
            </button>
            {explanation ? (
              <div
                className={`mt-1.5 rounded-lg px-3 py-2.5 text-sm leading-6 ring-1 ${
                  isCorrect
                    ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                    : isWrongSelection
                      ? "bg-red-50 text-red-900 ring-red-100"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                }`}
              >
                <p className="text-xs font-black">
                  {choice.label} 项解析
                  {isCorrect ? " · 正确选项" : isWrongSelection ? " · 你的选择" : ""}
                </p>
                <MathText text={explanation} compact className="mt-1" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
