"use client";

import Link from "next/link";
import { AnswerPanel } from "@/components/mobile/AnswerPanel";
import { ChoiceList } from "@/components/mobile/ChoiceList";
import { MathText } from "@/components/mobile/MathText";
import { ImagePlaceholder, MobileSection } from "@/components/mobile/primitives";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import { areChoiceAnswersEqual, parseAnswerChoiceLabels } from "@/lib/questions/answer-choice";
import { getQuestionStemAndChoices } from "@/lib/questions/extract-choices";
import { explainReviewPriorityScore } from "@/lib/reviews/priority-score";
import type { DueReview } from "@/lib/reviews";
import type { ReviewResult } from "@/lib/types";
import type {
  AnswerStatus,
  AnswerSource,
  ChoiceOption,
  Difficulty,
  MasteryStatus,
  QuestionSource,
  QuestionTextStatus,
  ReviewPriority,
  Subject,
} from "@/lib/types";
import {
  AttentionBadge,
  DifficultyBadge,
  SectionHeader,
  StudyBadge,
  StudyCard,
} from "@/components/study/study-ui";

export type FlashcardQuestion = {
  id: string;
  subject: Subject;
  chapter: string | null;
  knowledge_point: string | null;
  difficulty: Difficulty | null;
  image_path: string | null;
  source: QuestionSource;
  question_text: string | null;
  choices: ChoiceOption[];
  question_text_status: QuestionTextStatus;
  mastery_status: MasteryStatus;
  mistake_types: string[] | null;
  standard_answer: string | null;
  answer_explanation: string | null;
  key_steps: string[];
  answer_status: AnswerStatus;
  answer_source: AnswerSource;
  one_sentence_tip: string | null;
  review_priority: ReviewPriority | null;
  needs_manual_check: boolean;
  created_at: string;
  deleted_at: string | null;
};

export type FlashcardReview = Omit<DueReview, "questions"> & {
  questions: FlashcardQuestion;
};

const resultLabels: Record<ReviewResult, string> = {
  still_wrong: "仍不会",
  improved: "有进步",
  mastered: "已掌握",
  wrong_again: "又错了",
};

function isOverdue(scheduledDate: string, today: string) {
  return scheduledDate < today;
}

export function ReviewFlashcard({
  review,
  today,
  selectedChoices,
  submittedChoice,
  answerRevealed,
  draftAnswer,
  processing,
  processingLocked,
  onToggleChoice,
  onSubmitChoice,
  onRevealAnswer,
  onDraftAnswer,
  onSkip,
  onReview,
}: {
  review: FlashcardReview;
  today: string;
  selectedChoices: string[];
  submittedChoice: boolean;
  answerRevealed: boolean;
  draftAnswer: string;
  processing: boolean;
  processingLocked: boolean;
  onToggleChoice: (reviewId: string, label: string, isMultiple: boolean) => void;
  onSubmitChoice: () => void;
  onRevealAnswer: () => void;
  onDraftAnswer: (value: string) => void;
  onSkip: () => void;
  onReview: (result: ReviewResult) => void;
}) {
  const hasAnswer = Boolean(review.questions.standard_answer?.trim());
  const questionDisplay = getQuestionStemAndChoices(
    review.questions.question_text,
    review.questions.choices,
  );
  const answerChoices = parseAnswerChoiceLabels(review.questions.standard_answer);
  const isChoiceQuestion = questionDisplay.choices.length > 0;
  const choiceIsCorrect =
    answerChoices.labels.length > 0 &&
    areChoiceAnswersEqual(selectedChoices, answerChoices.labels);
  const canRecordReview = hasAnswer
    ? isChoiceQuestion
      ? submittedChoice && answerRevealed
      : !isChoiceQuestion && answerRevealed
    : true;
  const priority = explainReviewPriorityScore(review, today);

  return (
    <MobileSection>
      <SectionHeader
        title="当前题目卡片"
        subtitle="先独立作答，答案会在你确认后展开。"
        action={<StudyBadge tone="purple">{priority.level}</StudyBadge>}
      />
      <StudyCard className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StudyBadge tone={isOverdue(review.scheduled_date, today) ? "red" : "amber"}>
            {isOverdue(review.scheduled_date, today) ? "已逾期" : "今日到期"}
          </StudyBadge>
          {priority.reasons.slice(0, 4).map((reason) => (
            <StudyBadge key={reason} tone="purple">
              {reason}
            </StudyBadge>
          ))}
          <DifficultyBadge difficulty={review.questions.difficulty} />
          <AttentionBadge
            needsFix={
              review.questions.question_text_status === "needs_fix" ||
              review.questions.answer_status === "needs_fix"
            }
            needsManualCheck={review.questions.needs_manual_check}
          />
        </div>

        <div className="rounded-lg bg-[#f8f5ff] p-4">
          <div className="flex gap-3">
            <Link
              href={`/questions/${review.question_id}`}
              className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-white text-xs text-slate-500 ring-1 ring-[#e4dcff]"
            >
              {review.signedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.signedImageUrl}
                  alt="原题缩略图"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlaceholder label={review.questions.image_path ? "原题缩略图" : "文字错题卡"} />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#5b2bd6]">
                {review.questions.subject} / {review.questions.chapter ?? "待识别章节"}
              </p>
              <MathText
                text={review.questions.knowledge_point}
                fallback="待识别知识点"
                className="mt-2 text-lg font-black leading-7 text-[#211536]"
              />
              <MathText
                text={review.questions.one_sentence_tip}
                fallback="先独立完成，再展开答案核对。"
                className="mt-1 text-sm leading-6 text-slate-600"
              />
            </div>
          </div>

          <div className="mt-4">
            <TextQuestionPreview
              subject={review.questions.subject}
              chapter={review.questions.chapter}
              knowledge_point={review.questions.knowledge_point}
              question_text={questionDisplay.questionText}
              mastery_status={review.questions.mastery_status}
              question_text_status={review.questions.question_text_status}
              source={review.questions.source}
              compact
              hideMeta
              hideTitle
            />
          </div>
        </div>

        {questionDisplay.choices.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-black text-[#211536]">选择题选项</p>
            <ChoiceList
              choices={questionDisplay.choices}
              mode={submittedChoice ? "reviewed" : "answering"}
              selectedLabels={selectedChoices}
              correctLabels={answerChoices.labels}
              revealAnswer={answerRevealed}
              disabled={answerRevealed}
              onToggleChoice={(label) => onToggleChoice(review.id, label, answerChoices.isMultiple)}
            />
          </div>
        ) : (
          <label className="block">
            <span className="text-sm font-black text-[#211536]">
              非选择题答案核对区（可不填）
            </span>
            <textarea
              value={draftAnswer}
              onChange={(event) => onDraftAnswer(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-lg border border-[#d9cffd] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#5b2bd6]"
              placeholder="先写下你的答案或关键步骤，再查看标准答案。"
            />
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          {hasAnswer ? (
            isChoiceQuestion && !answerRevealed ? (
              <button
                type="button"
                onClick={onSubmitChoice}
                disabled={selectedChoices.length === 0 && answerChoices.labels.length > 0}
                className="min-h-12 rounded-lg bg-[#5b2bd6] px-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
              >
                提交答案
              </button>
            ) : (
              <button
                type="button"
                onClick={onRevealAnswer}
                disabled={answerRevealed}
                className="min-h-12 rounded-lg bg-[#5b2bd6] px-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
              >
                {answerRevealed ? "答案已显示" : "我做完了，查看答案"}
              </button>
            )
          ) : (
            <StudyBadge tone="amber">暂无标准答案，可直接记录结果</StudyBadge>
          )}
          <button
            type="button"
            onClick={onSkip}
            disabled={processingLocked}
            className="min-h-12 rounded-lg border border-[#d9cffd] bg-white px-4 text-sm font-black text-[#4f23b6] disabled:text-slate-400"
          >
            跳过本题
          </button>
        </div>

        {answerRevealed ? (
          <div className="space-y-3">
            {isChoiceQuestion && answerChoices.labels.length > 0 ? (
              <p
                className={`rounded-lg p-3 text-sm font-black ${
                  choiceIsCorrect
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                    : "bg-red-50 text-red-800 ring-1 ring-red-100"
                }`}
              >
                {choiceIsCorrect ? "回答正确" : "回答错误"}；正确答案：{answerChoices.labels.join("、")}
              </p>
            ) : null}
            {!isChoiceQuestion ? (
              <div className="rounded-lg bg-[#ede7ff] p-3 text-sm leading-6 text-[#4f23b6] ring-1 ring-[#d9cffd]">
                <p>请对照标准答案自行判断，本工具暂不自动判定非选择题对错。</p>
                {draftAnswer.trim() ? <p className="mt-2 break-words">本次答案/思路：{draftAnswer}</p> : null}
              </div>
            ) : null}
            <AnswerPanel
              standard_answer={review.questions.standard_answer}
              answer_explanation={review.questions.answer_explanation}
              key_steps={review.questions.key_steps}
              answer_status={review.questions.answer_status}
              answer_source={review.questions.answer_source}
            />
          </div>
        ) : null}

        {canRecordReview ? (
          <div>
            <p className="mb-2 text-sm font-black text-[#211536]">记录本题结果</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(resultLabels) as ReviewResult[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onReview(key)}
                  disabled={processing || processingLocked}
                  className="min-h-12 rounded-lg bg-[#ede7ff] px-3 text-sm font-black text-[#4f23b6] disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {processing ? "写入中..." : resultLabels[key]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </StudyCard>
    </MobileSection>
  );
}
