"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnswerPanel } from "@/components/mobile/AnswerPanel";
import { ChoiceList } from "@/components/mobile/ChoiceList";
import { MathText } from "@/components/mobile/MathText";
import { LoadingState, MobileCard, MobilePageShell, MobileSection, SectionCard } from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { todayIsoDate } from "@/lib/dates";
import { getQuestionStemAndChoices } from "@/lib/questions/extract-choices";
import { getAnswerStatusLabel } from "@/lib/questions/answer-labels";
import { parseAnswerChoiceLabels } from "@/lib/questions/answer-choice";
import { getQuestionTextStatusLabel } from "@/lib/questions/meta-labels";
import { fetchCurrentUserQuestion, type QuestionWithImage } from "@/lib/questions";
import {
  buildQuestionUpdatePayload,
  type QuestionEditForm,
} from "@/lib/questions/edit-question";
import { createClient } from "@/lib/supabase/client";
import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  RelatedPracticeQuestion,
  Subject,
} from "@/lib/types";

const subjects: Subject[] = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];
const difficulties: Array<Difficulty | ""> = ["", "基础", "中等", "较难", "压轴"];
const masteryStatuses: MasteryStatus[] = [
  "完全没思路",
  "有一点思路",
  "思路对但卡住",
  "计算错误",
  "做对但不稳",
  "完全掌握",
];
const textStatuses: QuestionTextStatus[] = ["ai_unverified", "verified", "needs_fix"];
const answerStatuses: AnswerStatus[] = ["ai_unverified", "verified", "needs_fix"];

type ChoicePracticeResult = {
  correct: boolean;
  correctLabels: string[];
  reviewResult: "mastered" | "wrong_again";
};

function formFromQuestion(question: QuestionWithImage): QuestionEditForm {
  return {
    question_text: question.question_text ?? "",
    question_text_status: question.question_text_status,
    subject: question.subject,
    chapter: question.chapter ?? "",
    knowledge_point: question.knowledge_point ?? "",
    difficulty: question.difficulty ?? "",
    mastery_status: question.mastery_status,
    user_note: question.user_note ?? "",
    mistake_types: question.mistake_types?.join("，") ?? "",
    solution_summary: question.solution_summary ?? "",
    standard_answer: question.standard_answer ?? "",
    answer_explanation: question.answer_explanation ?? "",
    key_steps: question.key_steps?.join("\n") ?? "",
    answer_status: question.answer_status,
    one_sentence_tip: question.one_sentence_tip ?? "",
  };
}

function isExam408Subject(subject: Subject) {
  return subject !== "数学";
}

function RelatedPracticeSection({
  questions,
}: {
  questions: RelatedPracticeQuestion[];
}) {
  const [visibleAnswerIndexes, setVisibleAnswerIndexes] = useState<number[]>([]);

  if (questions.length === 0) {
    return null;
  }

  function toggleAnswer(index: number) {
    setVisibleAnswerIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  return (
    <MobileSection title="同知识点类题检测">
      <div className="grid gap-3">
        {questions.map((item, index) => {
          const answerVisible = visibleAnswerIndexes.includes(index);

          return (
            <MobileCard key={`${item.question_text}-${index}`}>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={item.knowledge_point} tone="blue" />
                <StatusPill label={item.difficulty} tone="slate" />
              </div>
              <MathText
                text={item.question_text}
                className="mt-3 text-sm font-semibold leading-6 text-slate-900"
              />
              <div className="mt-3">
                <ChoiceList
                  choices={item.choices}
                  correctLabels={answerVisible ? [item.correct_answer] : []}
                  revealAnswer={answerVisible}
                />
              </div>
              <div className="mt-3 text-xs leading-5 text-slate-500">
                <span className="font-semibold text-slate-600">关联原因：</span>
                <MathText text={item.why_related} compact className="mt-1 text-xs leading-5" />
              </div>
              <button
                type="button"
                onClick={() => toggleAnswer(index)}
                className="mt-3 min-h-10 w-full rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"
              >
                {answerVisible ? "隐藏答案与解析" : "查看" + "答案与解析"}
              </button>
              {answerVisible ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-100">
                  <p className="font-semibold text-slate-900">正确答案：{item.correct_answer}</p>
                  <MathText text={item.answer_explanation} className="mt-2" />
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    <span className="font-semibold text-slate-600">严谨性检查：</span>
                    <MathText text={item.rigor_check} compact className="mt-1 text-xs leading-5" />
                  </div>
                </div>
              ) : null}
            </MobileCard>
          );
        })}
      </div>
    </MobileSection>
  );
}

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [question, setQuestion] = useState<QuestionWithImage | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实错题详情。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [selectedAnswerLabels, setSelectedAnswerLabels] = useState<string[]>([]);
  const [choicePracticeResult, setChoicePracticeResult] = useState<ChoicePracticeResult | null>(null);
  const [isSubmittingPractice, setIsSubmittingPractice] = useState(false);
  const [form, setForm] = useState<QuestionEditForm | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;
    loadQuestion()
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    async function loadQuestion() {
      await fetchCurrentUserQuestion(client, params.id, { includeDeleted: true })
      .then((item) => {
        if (isActive) {
          setQuestion(item);
          setForm(formFromQuestion(item));
          setSelectedAnswerLabels([]);
          setChoicePracticeResult(null);
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取错题详情失败。");
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, [params.id, supabase]);

  async function refreshQuestion() {
    if (!supabase) {
      return null;
    }

    const item = await fetchCurrentUserQuestion(supabase, params.id, { includeDeleted: true });
    setQuestion(item);
    setForm(formFromQuestion(item));
    return item;
  }

  function handleToggleChoice(label: string, isMultiple: boolean) {
    if (choicePracticeResult) {
      return;
    }

    setSelectedAnswerLabels((current) => {
      if (!isMultiple) {
        return current.includes(label) ? [] : [label];
      }

      return current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label].sort();
    });
  }

  async function handleSubmitChoicePractice() {
    if (!question || selectedAnswerLabels.length === 0 || choicePracticeResult) {
      return;
    }

    setIsSubmittingPractice(true);
    setMessage("");

    try {
      const response = await fetch(`/api/questions/${question.id}/practice-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedLabels: selectedAnswerLabels }),
      });
      const result = (await response.json().catch(() => ({}))) as Partial<ChoicePracticeResult> & {
        error?: string;
      };

      if (!response.ok || typeof result.correct !== "boolean" || !Array.isArray(result.correctLabels)) {
        setMessage(result.error ?? "提交答案失败。");
        return;
      }

      setChoicePracticeResult({
        correct: result.correct,
        correctLabels: result.correctLabels,
        reviewResult: result.correct ? "mastered" : "wrong_again",
      });
      setIsAnswerVisible(true);
      await refreshQuestion();
      setMessage(result.correct ? "作答正确，已记录为掌握。" : "作答错误，已提高后续复盘优先级。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交答案失败。");
    } finally {
      setIsSubmittingPractice(false);
    }
  }

  async function handleSaveEdit() {
    if (!supabase || !question || !form) {
      setMessage("请先配置 Supabase 并读取错题详情。");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("请先登录，再编辑错题。");
        return;
      }

      const { error } = await supabase
        .from("questions")
        .update(buildQuestionUpdatePayload(form))
        .eq("id", question.id)
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (error) {
        setMessage(`保存失败：${error.message}`);
        return;
      }

      await refreshQuestion();
      setIsEditing(false);
      setMessage("错题已保存，原始 image_path 未修改。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddToTodayReview() {
    if (!supabase || !question) {
      setMessage("请先配置 Supabase 并读取错题详情。");
      return;
    }

    setIsAddingReview(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("请先登录，再加入今日复习。");
        return;
      }

      const { error } = await supabase.from("reviews").upsert(
        {
          user_id: user.id,
          question_id: question.id,
          scheduled_date: todayIsoDate(),
        },
        { onConflict: "question_id,scheduled_date" },
      );

      if (error) {
        setMessage(`加入今日复习失败：${error.message}`);
        return;
      }

      setMessage("已加入今日复习。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加入今日复习失败，请稍后重试。");
    } finally {
      setIsAddingReview(false);
    }
  }

  async function handleDeleteQuestion() {
    if (!question) {
      return;
    }

    const shouldDelete = window.confirm(
      "确定删除这道错题吗？\n删除后它不会出现在错题库、今日复习和报告统计中。",
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted_reason: "user_deleted" }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(result.error ?? "删除错题失败。");
        return;
      }

      setMessage("已删除错题");
      setTimeout(() => {
        router.replace("/questions");
        router.refresh();
      }, 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除错题失败。");
    } finally {
      setIsDeleting(false);
    }
  }

  function updateForm<K extends keyof QuestionEditForm>(key: K, value: QuestionEditForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  const questionDisplay = question
    ? getQuestionStemAndChoices(question.question_text, question.choices)
    : { questionText: "", choices: [] };
  const parsedChoiceAnswer = question ? parseAnswerChoiceLabels(question.standard_answer) : { labels: [], isMultiple: false };
  const canSubmitChoiceAnswer =
    questionDisplay.choices.length > 0 && parsedChoiceAnswer.labels.length > 0 && selectedAnswerLabels.length > 0;
  const relatedPracticeQuestions =
    question && question.subject !== "数学" && isExam408Subject(question.subject)
      ? question.related_practice_questions ?? []
      : [];

  return (
    <MobilePageShell>
      <PageHeader
        title="错题详情"
        subtitle="先看题，做完后再核对答案和整理卡点。"
      />

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取错题详情..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {question ? (
        question.deleted_at ? (
          <MobileSection>
            <MobileCard>
              <h2 className="text-base font-bold text-slate-950">该错题已删除</h2>
              <Link
                href="/questions"
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
              >
                返回错题库
              </Link>
            </MobileCard>
          </MobileSection>
        ) : (
        <>
          <MobileSection title="题目">
            <MobileCard className="bg-white">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-black leading-6 text-slate-950">
                    {question.chapter?.trim() || "未标章节"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill label={question.subject} tone="blue" />
                    <StatusPill label={question.difficulty || "难度待补充"} tone="slate" />
                    <StatusPill
                      label={question.knowledge_point?.trim() || "待补充知识点"}
                      tone={question.knowledge_point?.trim() ? "blue" : "amber"}
                    />
                  </div>
                </div>
              </div>

              {question.signedImageUrl ? (
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="mt-4 block w-full overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.signedImageUrl}
                    alt="原题图片"
                    loading="lazy"
                    decoding="async"
                    className="max-h-[520px] w-full object-contain"
                  />
                </button>
              ) : question.image_path ? (
                <div className="mt-4 grid min-h-32 place-items-center rounded-lg bg-slate-100 px-5 text-center text-sm leading-6 text-slate-500">
                  原题图片暂不可预览
                </div>
              ) : null}

              <MathText
                text={questionDisplay.questionText}
                fallback="暂无题目文字。"
                className="mt-4 text-base font-semibold leading-8 text-slate-950"
              />

              {questionDisplay.choices.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <ChoiceList
                    choices={questionDisplay.choices}
                    mode={choicePracticeResult ? "reviewed" : "answering"}
                    selectedLabels={selectedAnswerLabels}
                    correctLabels={choicePracticeResult?.correctLabels ?? []}
                    revealAnswer={Boolean(choicePracticeResult)}
                    disabled={Boolean(choicePracticeResult) || isSubmittingPractice}
                    onToggleChoice={(label) => handleToggleChoice(label, parsedChoiceAnswer.isMultiple)}
                  />
                  {parsedChoiceAnswer.labels.length === 0 ? (
                    <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
                      这道选择题的标准答案暂未识别，先核对答案后再提交作答。
                    </p>
                  ) : null}
                  {choicePracticeResult ? (
                    <p
                      className={`rounded-lg p-3 text-sm font-semibold leading-6 ring-1 ${
                        choicePracticeResult.correct
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                          : "bg-red-50 text-red-700 ring-red-100"
                      }`}
                    >
                      {choicePracticeResult.correct
                        ? "回答正确"
                        : `回答错误，正确答案：${choicePracticeResult.correctLabels.join("、")}`}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSubmitChoicePractice}
                    disabled={!canSubmitChoiceAnswer || Boolean(choicePracticeResult) || isSubmittingPractice}
                    className="min-h-12 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                  >
                    {isSubmittingPractice ? "提交中..." : "提交答案"}
                  </button>
                </div>
              ) : null}
            </MobileCard>
          </MobileSection>

          {questionDisplay.choices.length === 0 ? (
            <MobileSection title="先做题">
              <SectionCard>
                <p className="text-sm font-semibold leading-6 text-slate-900">
                  先自己做一遍，做完后再看答案。
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  这一步只保留题目和必要信息，避免答案提前干扰回忆。
                </p>
              </SectionCard>
            </MobileSection>
          ) : null}

          <MobileSection title="查看答案" subtitle="默认折叠，做完后再展开标准答案、解析和关键步骤。">
            <SectionCard>
              <button
                type="button"
                onClick={() => setIsAnswerVisible((value) => !value)}
                className="min-h-12 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
              >
                {isAnswerVisible ? "隐藏答案" : "查看答案"}
              </button>
              {isAnswerVisible ? (
                <div className="mt-3">
                  <AnswerPanel
                    standard_answer={question.standard_answer}
                    answer_explanation={question.answer_explanation}
                    key_steps={question.key_steps}
                    one_sentence_tip={question.one_sentence_tip}
                    answer_status={question.answer_status}
                    answer_source={question.answer_source}
                  />
                </div>
              ) : null}
            </SectionCard>
          </MobileSection>

          {/* 查看答案与解析 */}
          <RelatedPracticeSection questions={relatedPracticeQuestions} />

          <MobileSection title="更多操作">
            <MobileCard>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAddToTodayReview}
                  disabled={isAddingReview}
                  className="min-h-12 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {isAddingReview ? "加入中..." : "加入今日复习"}
                </button>
                <Link
                  href="/questions"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700"
                >
                  返回错题库
                </Link>
                <button
                  type="button"
                  onClick={() => setIsEditing((value) => !value)}
                  className="min-h-12 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
                >
                  {isEditing ? "收起编辑" : "编辑错题"}
                </button>
                <Link
                  href="/review"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700"
                >
                  开始复习
                </Link>
                <button
                  type="button"
                  onClick={handleDeleteQuestion}
                  disabled={isDeleting}
                  className="min-h-12 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {isDeleting ? "删除中..." : "删除错题"}
                </button>
              </div>
            </MobileCard>
          </MobileSection>

          {isEditing && form ? (
            <MobileSection title="编辑错题">
              <MobileCard>
                <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">题目文字</span>
                  <textarea
                    value={form.question_text}
                    onChange={(event) => updateForm("question_text", event.target.value)}
                    rows={5}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">核对状态</span>
                    <select
                      value={form.question_text_status}
                      onChange={(event) =>
                        updateForm("question_text_status", event.target.value as QuestionTextStatus)
                      }
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {textStatuses.map((item) => (
                        <option key={item} value={item}>
                          {getQuestionTextStatusLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">科目</span>
                    <select
                      value={form.subject}
                      onChange={(event) => updateForm("subject", event.target.value as Subject)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {subjects.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">章节</span>
                    <input
                      value={form.chapter}
                      onChange={(event) => updateForm("chapter", event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">难度</span>
                    <select
                      value={form.difficulty}
                      onChange={(event) => updateForm("difficulty", event.target.value as Difficulty | "")}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {difficulties.map((item) => (
                        <option key={item || "empty"} value={item}>
                          {item || "未设置"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">知识点</span>
                    <input
                      value={form.knowledge_point}
                      onChange={(event) => updateForm("knowledge_point", event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">掌握状态</span>
                  <select
                    value={form.mastery_status}
                    onChange={(event) =>
                      updateForm("mastery_status", event.target.value as MasteryStatus)
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  >
                    {masteryStatuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">用户备注</span>
                  <textarea
                    value={form.user_note}
                    onChange={(event) => updateForm("user_note", event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">错因标签</span>
                  <input
                    value={form.mistake_types}
                    onChange={(event) => updateForm("mistake_types", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    placeholder="用逗号分隔"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">正确思路摘要</span>
                  <textarea
                    value={form.solution_summary}
                    onChange={(event) => updateForm("solution_summary", event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">标准答案</span>
                  <textarea
                    value={form.standard_answer}
                    onChange={(event) => updateForm("standard_answer", event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">答案解析</span>
                  <textarea
                    value={form.answer_explanation}
                    onChange={(event) => updateForm("answer_explanation", event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">关键步骤</span>
                  <textarea
                    value={form.key_steps}
                    onChange={(event) => updateForm("key_steps", event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                    placeholder="每行一个步骤"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">答案状态</span>
                  <select
                    value={form.answer_status}
                    onChange={(event) =>
                      updateForm("answer_status", event.target.value as AnswerStatus)
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  >
                    {answerStatuses.map((item) => (
                      <option key={item} value={item}>
                        {getAnswerStatusLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">一句话提醒</span>
                  <input
                    value={form.one_sentence_tip}
                    onChange={(event) => updateForm("one_sentence_tip", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="min-h-12 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {isSaving ? "保存中..." : "保存编辑"}
                </button>
              </div>
              </MobileCard>
            </MobileSection>
          ) : null}
        </>
        )
      ) : null}

      {isPreviewOpen && question?.signedImageUrl ? (
        <div className="fixed inset-0 z-40 bg-slate-950/90 p-4">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(false)}
            className="mb-3 min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-slate-900"
          >
            关闭预览
          </button>
          <div className="h-[calc(100vh-5rem)] overflow-auto rounded-lg bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.signedImageUrl}
              alt="放大的原题图片"
              className="mx-auto h-auto max-w-none"
            />
          </div>
        </div>
      ) : null}
    </MobilePageShell>
  );
}
