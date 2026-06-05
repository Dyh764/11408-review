import { StatusPill } from "@/components/status-pill";
import { getQuestionSourceLabel } from "@/lib/questions/source-label";
import type {
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  Subject,
} from "@/lib/types";

type TextQuestionPreviewProps = {
  subject: Subject | string;
  chapter?: string | null;
  knowledge_point?: string | null;
  question_text?: string | null;
  mastery_status?: MasteryStatus | string | null;
  question_text_status?: QuestionTextStatus | null;
  source?: QuestionSource | null;
  compact?: boolean;
};

export function TextQuestionPreview({
  subject,
  chapter,
  knowledge_point,
  question_text,
  mastery_status,
  question_text_status = "needs_fix",
  source = "chatgpt_import",
  compact = false,
}: TextQuestionPreviewProps) {
  const hasText = Boolean(question_text?.trim());

  if (!hasText) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">还没有题目文字，也未绑定原图</p>
        {!compact ? (
          <p className="mt-1 text-xs leading-5">可以编辑错题或补充绑定原图。</p>
        ) : null}
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-left">
      <div className="flex flex-wrap gap-2">
        <StatusPill label="未绑定原图" tone="amber" />
        <StatusPill
          label={getQuestionSourceLabel({
            source,
            question_text_status: question_text_status ?? "needs_fix",
            user_note: null,
          })}
          tone="blue"
        />
      </div>
      <p className="mt-3 text-xs font-semibold text-blue-700">文字题卡预览</p>
      <h3 className="mt-1 text-sm font-bold text-slate-950">文字错题卡</h3>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
        <span>{subject}</span>
        {chapter ? <span>{chapter}</span> : null}
        {knowledge_point ? <span>{knowledge_point}</span> : null}
        {mastery_status ? <span>{mastery_status}</span> : null}
      </div>
      <p
        className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 ${
          compact ? "line-clamp-3" : ""
        }`}
      >
        {question_text}
      </p>
    </article>
  );
}
