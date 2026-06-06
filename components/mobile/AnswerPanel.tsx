import { MathText } from "@/components/mobile/MathText";
import { StatusPill } from "@/components/status-pill";
import {
  getAnswerSourceLabel,
  getAnswerStatusLabel,
  getAnswerStatusTone,
} from "@/lib/questions/answer-labels";
import type { AnswerSource, AnswerStatus } from "@/lib/types";

type AnswerPanelProps = {
  standard_answer?: string | null;
  answer_explanation?: string | null;
  key_steps?: string[] | null;
  answer_status?: AnswerStatus | null;
  answer_source?: AnswerSource | null;
};

export function AnswerPanel({
  standard_answer,
  answer_explanation,
  key_steps,
  answer_status,
  answer_source,
}: AnswerPanelProps) {
  const hasAnswer = Boolean(standard_answer?.trim());
  const steps = key_steps?.filter(Boolean) ?? [];

  return (
    <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-100">
      <div className="flex flex-wrap gap-2">
        <StatusPill
          label={getAnswerStatusLabel(answer_status)}
          tone={getAnswerStatusTone(answer_status)}
        />
        <StatusPill label={getAnswerSourceLabel(answer_source)} tone="blue" />
      </div>

      {!hasAnswer ? (
        <p className="mt-3 text-slate-600">
          还没有录入答案。晚上整理错题时，请让 ChatGPT 输出 standard_answer 和 answer_explanation。
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <p className="font-semibold text-slate-900">答案：</p>
            <MathText text={standard_answer} className="mt-1" />
          </div>

          <div>
            <p className="font-semibold text-slate-900">过程：</p>
            <MathText text={answer_explanation} fallback="暂无完整过程。" className="mt-1" />
          </div>

          <div>
            <p className="font-semibold text-slate-900">关键步骤：</p>
            {steps.length > 0 ? (
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                {steps.map((step, index) => (
                  <li key={`${step}-${index}`}>
                    <MathText text={step} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-slate-500">暂无关键步骤。</p>
            )}
          </div>
        </div>
      )}

      {answer_status === "ai_unverified" ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">
          该答案由 ChatGPT 整理，建议结合原题或教材核对。
        </p>
      ) : null}
    </div>
  );
}
