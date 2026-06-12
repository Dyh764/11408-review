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
import {
  getAnswerStatusLabel,
  getAnswerStatusTone,
} from "@/lib/questions/answer-labels";
import {
  getQuestionSourceLabel,
  getQuestionTextStatusLabel,
  getQuestionTextStatusTone,
} from "@/lib/questions/meta-labels";
import { fetchCurrentUserQuestion, type QuestionWithImage } from "@/lib/questions";
import {
  buildQuestionUpdatePayload,
  type QuestionEditForm,
} from "@/lib/questions/edit-question";
import {
  buildAiEnhancementSummary,
  type AiEnhancementSummary,
  type AiEnhancementSnapshot,
} from "@/lib/questions/ai-enhancement-summary";
import { createClient } from "@/lib/supabase/client";
import type { AnswerStatus, Difficulty, MasteryStatus, QuestionTextStatus, Subject } from "@/lib/types";

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

type StatusResponse = {
  ai?: {
    provider: "gemini" | "deepseek" | "none";
    configured: boolean;
    label: string;
    model: string;
  };
  deepseek?: {
    configured: boolean;
    label: string;
    model: string;
  };
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value?.trim() || "待补充"}
      </dd>
    </div>
  );
}

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

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [question, setQuestion] = useState<QuestionWithImage | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实错题详情。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeepSeekEnhancing, setIsDeepSeekEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [deepSeekStatus, setDeepSeekStatus] = useState<StatusResponse["deepseek"] | null>(null);
  const [aiStatus, setAiStatus] = useState<StatusResponse["ai"] | null>(null);
  const [form, setForm] = useState<QuestionEditForm | null>(null);
  const [aiEnhancementSummary, setAiEnhancementSummary] = useState<AiEnhancementSummary | null>(null);

  useEffect(() => {
    fetch("/api/settings/status")
      .then((response) => response.json())
      .then((data: StatusResponse) => {
        setDeepSeekStatus(data.deepseek ?? null);
        setAiStatus(data.ai ?? null);
      })
      .catch(() => {
        setDeepSeekStatus(null);
        setAiStatus(null);
      });
  }, []);

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

  async function handleAnalyze() {
    let allowOverwriteQuestionText = false;
    if (question?.question_text_status === "verified") {
      const shouldContinue = window.confirm(
        "这道题已经人工核对，重新分析可能覆盖部分 AI 字段，是否继续？",
      );
      if (!shouldContinue) {
        return;
      }
      allowOverwriteQuestionText = window.confirm("是否允许覆盖题目文字？默认取消会保留人工核对题干。");
    }

    setIsAnalyzing(true);
    setMessage("");

    try {
      const response = await fetch(`/api/questions/${params.id}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ allowOverwriteQuestionText }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "分析失败。";
        setMessage(errorMessage);
        return;
      }

      const source =
        typeof result === "object" &&
        result !== null &&
        "source" in result &&
        typeof result.source === "string"
          ? result.source
          : "unknown";
      const resultMessage =
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof result.message === "string"
          ? result.message
          : "分析完成。";

      await refreshQuestion();
      setMessage(`分析来源：${source}。${resultMessage}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "分析失败。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDeepSeekEnhance() {
    if (!question) {
      setMessage("请先读取错题详情。");
      return;
    }

    if (!aiStatus?.configured) {
      setMessage(aiStatus?.label ?? "AI 学习分析未启用（可选）。");
      return;
    }

    const shouldContinue = window.confirm(
      "AI 只会优化知识点、错因、思路和一句话提醒，不会覆盖题目文字和用户备注。是否继续？",
    );

    if (!shouldContinue) {
      return;
    }

    setIsDeepSeekEnhancing(true);
    setMessage("");
    setAiEnhancementSummary(null);
    const beforeSnapshot: AiEnhancementSnapshot = {
      chapter: question.chapter,
      knowledge_point: question.knowledge_point,
      mistake_types: question.mistake_types,
      solution_summary: question.solution_summary,
      one_sentence_tip: question.one_sentence_tip,
      review_priority: question.review_priority,
      confidence: question.confidence,
      needs_manual_check: question.needs_manual_check,
    };

    try {
      const response = await fetch(`/api/questions/${params.id}/deepseek-enhance`, {
        method: "POST",
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "AI 优化失败。";
        setMessage(errorMessage);
        return;
      }

      const updatedQuestion = await refreshQuestion();
      if (updatedQuestion) {
        setAiEnhancementSummary(buildAiEnhancementSummary(beforeSnapshot, updatedQuestion));
      }
      setMessage("AI 优化完成，题目文字和用户备注已保留。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 优化失败。");
    } finally {
      setIsDeepSeekEnhancing(false);
    }
  }

  async function handleQuestionStatusUpdate(payload: {
    question_text_status?: QuestionTextStatus;
    answer_status?: AnswerStatus;
  }) {
    if (!question) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(result.error ?? "更新核对状态失败。");
        return;
      }

      await refreshQuestion();
      setMessage("核对状态已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新核对状态失败。");
    }
  }

  function handleMarkQuestionVerified() {
    handleQuestionStatusUpdate({ question_text_status: "verified" });
  }

  function handleMarkAnswerVerified() {
    handleQuestionStatusUpdate({ answer_status: "verified" });
  }

  function handleMarkNeedsFix() {
    handleQuestionStatusUpdate({
      question_text_status: "needs_fix",
      answer_status: "needs_fix",
    });
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
            <MobileCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-900">
                    {question.chapter?.trim() || "未标章节"}
                  </p>
                  {question.knowledge_point ? (
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                      {question.knowledge_point}
                    </p>
                  ) : null}
                </div>
                <StatusPill label={question.difficulty || "未标记"} tone="slate" />
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
                className="mt-4 text-slate-900"
              />

              {questionDisplay.choices.length > 0 ? (
                <div className="mt-4">
                  <ChoiceList choices={questionDisplay.choices} />
                </div>
              ) : null}
            </MobileCard>
          </MobileSection>

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

          <MobileSection title="我的卡点">
            <MobileCard>
              <MathText text={question.user_note} fallback="暂无记录。" className="text-slate-700" />
            </MobileCard>
          </MobileSection>

          <MobileSection title="正确思路">
            <MobileCard>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-slate-800">思路摘要</dt>
                  <dd className="mt-1 text-slate-600">
                    <MathText text={question.solution_summary} fallback="待补充" />
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">错因</dt>
                  <dd className="mt-1 break-words text-slate-600">
                    {question.mistake_types?.filter(Boolean).join("、") || "待补充"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">一句话提醒</dt>
                  <dd className="mt-1 text-slate-600">
                    <MathText text={question.one_sentence_tip} fallback="待补充" />
                  </dd>
                </div>
              </dl>
            </MobileCard>
          </MobileSection>

          <MobileSection title="智能增强">
            <MobileCard>
              <p className="text-sm leading-6 text-slate-600">
                当前使用 {aiStatus?.provider === "gemini" ? "Gemini" : aiStatus?.provider === "deepseek" ? "DeepSeek" : "未启用"}。AI 只优化知识点、错因、思路和一句话提醒，不会覆盖题目文字和用户备注。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="min-h-10 rounded-lg bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 disabled:text-slate-400"
                >
                  {isAnalyzing ? "分析中..." : question.analyzed_at ? "重新分析" : "AI 自动分析"}
                </button>
                {aiStatus?.configured ? (
                  <button
                    type="button"
                    onClick={handleDeepSeekEnhance}
                    disabled={isDeepSeekEnhancing}
                    className="min-h-10 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {isDeepSeekEnhancing ? "优化中..." : "AI 优化题卡"}
                  </button>
                ) : (
                  <p className="text-xs leading-5 text-slate-500">
                    {aiStatus?.label ?? deepSeekStatus?.label ?? "AI 学习分析未启用（可选）"}，不影响当前复习。
                  </p>
                )}
              </div>
              {aiEnhancementSummary ? (
                <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
                  <p className="font-semibold">{aiEnhancementSummary.title}</p>
                  {aiEnhancementSummary.items.length > 0 ? (
                    <ul className="mt-2 grid gap-1">
                      {aiEnhancementSummary.items.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </MobileCard>
          </MobileSection>

          <MobileSection title="更多信息">
            <details className="rounded-lg border border-slate-100 bg-white p-4 text-sm shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <summary className="cursor-pointer list-none font-semibold text-slate-800">
                查看掌握状态、核对状态和来源
              </summary>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailField label="掌握状态" value={question.mastery_status} />
                <DetailField
                  label="题目状态"
                  value={getQuestionTextStatusLabel(question.question_text_status)}
                />
                <DetailField
                  label="答案状态"
                  value={question.standard_answer ? "已录入答案" : "还没有答案"}
                />
                <DetailField label="来源" value={getQuestionSourceLabel(question.source)} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill
                  label={getAnswerStatusLabel(question.answer_status)}
                  tone={getAnswerStatusTone(question.answer_status)}
                />
                <StatusPill
                  label={getQuestionTextStatusLabel(question.question_text_status)}
                  tone={getQuestionTextStatusTone(question.question_text_status)}
                />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleMarkQuestionVerified}
                  disabled={question.question_text_status === "verified"}
                  className="min-h-11 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                >
                  标记题目已核对
                </button>
                <button
                  type="button"
                  onClick={handleMarkAnswerVerified}
                  disabled={question.answer_status === "verified"}
                  className="min-h-11 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                >
                  标记答案已核对
                </button>
                <button
                  type="button"
                  onClick={handleMarkNeedsFix}
                  className="min-h-11 rounded-lg bg-amber-50 px-3 text-xs font-semibold text-amber-800 ring-1 ring-amber-100"
                >
                  标记需要修正
                </button>
              </div>
            </details>
          </MobileSection>

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
