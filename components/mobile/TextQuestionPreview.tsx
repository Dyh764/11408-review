import { QuestionMetaBadges } from "@/components/mobile/QuestionMetaBadges";
import { MathText } from "@/components/mobile/MathText";
import type {
  Difficulty,
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  Subject,
} from "@/lib/types";

type TextQuestionPreviewProps = {
  subject: Subject | string;
  chapter?: string | null;
  knowledge_point?: string | null;
  difficulty?: Difficulty | string | null;
  question_text?: string | null;
  mastery_status?: MasteryStatus | string | null;
  question_text_status?: QuestionTextStatus | null;
  source?: QuestionSource | null;
  hasAnswer?: boolean;
  showSource?: boolean;
  compact?: boolean;
  hideMeta?: boolean;
  hideTitle?: boolean;
};

export function TextQuestionPreview({
  subject,
  chapter,
  knowledge_point,
  difficulty,
  question_text,
  mastery_status,
  question_text_status = "needs_fix",
  source = "chatgpt_import",
  hasAnswer,
  showSource = false,
  compact = false,
  hideMeta = false,
  hideTitle = false,
}: TextQuestionPreviewProps) {
  const hasText = Boolean(question_text?.trim());
  const containerClass = compact
    ? "text-left"
    : "rounded-lg border border-slate-100 bg-white p-3 text-left shadow-sm";
  const topicLabel = knowledge_point?.trim() || chapter?.trim() || subject;

  if (!hasText) {
    return (
      <div
        className={
          compact
            ? "text-sm text-slate-500"
            : "rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-500"
        }
      >
        <p className="font-semibold text-slate-700">还没有题目文字，也未绑定原图。</p>
        {!compact ? (
          <p className="mt-1 text-xs leading-5">可以先编辑错题，补充题干后再复习。</p>
        ) : null}
      </div>
    );
  }

  return (
    <article className={containerClass}>
      {!hideTitle ? (
        <p className="break-words text-xs font-semibold leading-5 text-slate-500">
          {topicLabel}
        </p>
      ) : null}
      <MathText
        text={question_text}
        compact={compact}
        className={`${hideTitle ? "" : "mt-1"} text-slate-950 ${
          compact ? "line-clamp-3 text-sm leading-6" : "line-clamp-5 text-base leading-7"
        }`}
      />
      {!hideMeta ? (
        <div className="mt-3">
          <QuestionMetaBadges
            subject={subject}
            difficulty={difficulty}
            mastery_status={mastery_status}
            question_text_status={question_text_status}
            hasAnswer={hasAnswer}
            source={source}
            showSource={showSource}
          />
        </div>
      ) : null}
      {!hideMeta && (chapter || knowledge_point) ? (
        <p className="mt-2 break-words text-xs leading-5 text-slate-500">
          {[chapter, knowledge_point].filter(Boolean).join(" / ")}
        </p>
      ) : null}
    </article>
  );
}
