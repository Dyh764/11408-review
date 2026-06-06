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
}: ChoiceListProps) {
  const visibleChoices = (choices ?? []).filter(
    (choice) => choice.label.trim() && choice.text.trim(),
  );

  if (visibleChoices.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {visibleChoices.map((choice) => (
        <button
          type="button"
          key={choice.label}
          onClick={() => onToggleChoice?.(choice.label)}
          disabled={disabled || mode === "display" || mode === "reviewed"}
          className={`flex min-w-0 gap-2 rounded-lg border text-left ${
            selectedLabels.includes(choice.label)
              ? "border-blue-300 bg-blue-50"
              : "border-slate-100 bg-slate-50"
          } ${
            revealAnswer && correctLabels.includes(choice.label)
              ? "border-emerald-300 bg-emerald-50"
              : ""
          } ${
            revealAnswer &&
            selectedLabels.includes(choice.label) &&
            !correctLabels.includes(choice.label)
              ? "border-red-300 bg-red-50"
              : ""
          } ${compact ? "p-2" : "p-3"}`}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-blue-100">
            {choice.label}
          </span>
          <MathText
            text={choice.text}
            compact={compact}
            className="min-w-0 flex-1 text-slate-800"
          />
        </button>
      ))}
    </div>
  );
}
