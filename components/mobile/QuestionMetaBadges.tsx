import { StatusPill } from "@/components/status-pill";
import {
  getQuestionSourceLabel,
  getQuestionTextStatusShortLabel,
  getQuestionTextStatusTone,
} from "@/lib/questions/meta-labels";
import type {
  Difficulty,
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  Subject,
} from "@/lib/types";

type QuestionMetaBadgesProps = {
  subject: Subject | string;
  difficulty?: Difficulty | string | null;
  mastery_status?: MasteryStatus | string | null;
  question_text_status?: QuestionTextStatus | null;
  hasAnswer?: boolean;
  source?: QuestionSource | null;
  showSource?: boolean;
};

export function QuestionMetaBadges({
  subject,
  difficulty,
  mastery_status,
  question_text_status,
  hasAnswer,
  source,
  showSource = false,
}: QuestionMetaBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill label={subject} tone="blue" />
      {difficulty ? <StatusPill label={difficulty} tone="slate" /> : null}
      {mastery_status ? <StatusPill label={mastery_status} tone="amber" /> : null}
      {typeof hasAnswer === "boolean" ? (
        <StatusPill label={hasAnswer ? "有答案" : "无答案"} tone={hasAnswer ? "blue" : "amber"} />
      ) : null}
      <StatusPill
        label={getQuestionTextStatusShortLabel(question_text_status)}
        tone={getQuestionTextStatusTone(question_text_status)}
      />
      {showSource ? <StatusPill label={getQuestionSourceLabel(source)} tone="slate" /> : null}
    </div>
  );
}
