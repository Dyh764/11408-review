import { QuestionMetaBadges } from "@/components/mobile/QuestionMetaBadges";
import { StatusPill } from "@/components/status-pill";
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
}: TextQuestionPreviewProps) {
  const hasText = Boolean(question_text?.trim());

  if (!hasText) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">还没有题目文字，也未绑定原图。</p>
        {!compact ? (
          <p className="mt-1 text-xs leading-5">可以先编辑错题，补充题干后再复习。</p>
        ) : null}
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-slate-100 bg-white p-3 text-left shadow-sm">
      <div className="flex flex-wrap gap-2">
        <StatusPill label="未绑定原图" tone="amber" />
        {!compact ? <StatusPill label="文字错题卡" tone="blue" /> : null}
      </div>
      <h2 className={`mt-3 font-bold text-slate-950 ${compact ? "text-sm" : "text-base"}`}>
        文字错题卡
      </h2>
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
      {chapter || knowledge_point ? (
        <p className="mt-2 break-words text-xs leading-5 text-slate-500">
          {[chapter, knowledge_point].filter(Boolean).join(" / ")}
        </p>
      ) : null}
      <p
        className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900 ${
          compact ? "line-clamp-3" : ""
        }`}
      >
        {question_text}
      </p>
    </article>
  );
}
