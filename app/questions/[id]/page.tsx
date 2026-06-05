"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnswerPanel } from "@/components/mobile/AnswerPanel";
import { QuestionMetaBadges } from "@/components/mobile/QuestionMetaBadges";
import { LoadingState, MobileCard, MobileSection } from "@/components/mobile/primitives";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { todayIsoDate } from "@/lib/dates";
import { getAnswerStatusLabel } from "@/lib/questions/answer-labels";
import {
  getQuestionTextStatusLabel,
  getQuestionTextStatusTone,
} from "@/lib/questions/meta-labels";
import { fetchCurrentUserQuestion, type QuestionWithImage } from "@/lib/questions";
import {
  buildQuestionUpdatePayload,
  type QuestionEditForm,
} from "@/lib/questions/edit-question";
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
  deepseek?: {
    configured: boolean;
    label: string;
    model: string;
  };
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

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
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
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [deepSeekStatus, setDeepSeekStatus] = useState<StatusResponse["deepseek"] | null>(null);
  const [form, setForm] = useState<QuestionEditForm | null>(null);

  useEffect(() => {
    fetch("/api/settings/status")
      .then((response) => response.json())
      .then((data: StatusResponse) => setDeepSeekStatus(data.deepseek ?? null))
      .catch(() => setDeepSeekStatus(null));
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
      await fetchCurrentUserQuestion(client, params.id)
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
      return;
    }

    const item = await fetchCurrentUserQuestion(supabase, params.id);
    setQuestion(item);
    setForm(formFromQuestion(item));
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
    if (!deepSeekStatus?.configured) {
      setMessage("DeepSeek 未启用（可选）。");
      return;
    }

    const shouldContinue = window.confirm(
      "DeepSeek 只会优化章节、知识点、错因、摘要、提醒和优先级，不会覆盖题目文字或用户备注。是否继续？",
    );

    if (!shouldContinue) {
      return;
    }

    setIsDeepSeekEnhancing(true);
    setMessage("");

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
            : "DeepSeek 优化失败。";
        setMessage(errorMessage);
        return;
      }

      await refreshQuestion();
      setMessage("DeepSeek 优化完成，题目文字和用户备注已保留。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DeepSeek 优化失败。");
    } finally {
      setIsDeepSeekEnhancing(false);
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
        .eq("user_id", user.id);

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

  function updateForm<K extends keyof QuestionEditForm>(key: K, value: QuestionEditForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div>
      <PageHeader
        title="错题详情"
        subtitle="查看原题或文字题卡，做完后再核对答案。"
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
        <>
          <MobileSection title={question.signedImageUrl ? "原题图片" : "文字错题卡"}>
            <div className="space-y-4">
              {question.signedImageUrl ? (
                <MobileCard>
                  <QuestionMetaBadges
                    subject={question.subject}
                    difficulty={question.difficulty}
                    mastery_status={question.mastery_status}
                    question_text_status={question.question_text_status}
                    hasAnswer={Boolean(question.standard_answer?.trim())}
                  />
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
                </MobileCard>
              ) : question.image_path ? (
                <MobileCard>
                  <QuestionMetaBadges
                    subject={question.subject}
                    difficulty={question.difficulty}
                    mastery_status={question.mastery_status}
                    question_text_status={question.question_text_status}
                    hasAnswer={Boolean(question.standard_answer?.trim())}
                  />
                  <div className="mt-4 grid min-h-32 place-items-center rounded-lg bg-slate-100 px-5 text-center text-sm leading-6 text-slate-500">
                    原题图片暂不可预览
                  </div>
                  {question.question_text ? (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                      {question.question_text}
                    </p>
                  ) : null}
                </MobileCard>
              ) : (
                <TextQuestionPreview
                  subject={question.subject}
                  chapter={question.chapter}
                  knowledge_point={question.knowledge_point}
                  difficulty={question.difficulty}
                  question_text={question.question_text}
                  mastery_status={question.mastery_status}
                  question_text_status={question.question_text_status}
                  source={question.source}
                  hasAnswer={Boolean(question.standard_answer?.trim())}
                />
              )}
            </div>
          </MobileSection>

          <MobileSection title="核对答案" subtitle="先自己做一遍，再展开标准答案和过程。">
            <MobileCard>
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
                    answer_status={question.answer_status}
                    answer_source={question.answer_source}
                  />
                </div>
              ) : null}
            </MobileCard>
          </MobileSection>

          <MobileSection title="复习结果" subtitle="做完并核对后，把这道题加入今天的复习队列。">
            <MobileCard>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/review"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
                >
                  开始复习
                </Link>
                <button
                  type="button"
                  onClick={handleAddToTodayReview}
                  disabled={isAddingReview}
                  className="min-h-12 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                >
                  {isAddingReview ? "加入中..." : "加入今日复习"}
                </button>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection title="解析笔记">
            <MobileCard>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-slate-800">章节 / 知识点</dt>
                  <dd className="mt-1 break-words text-slate-600">
                    {question.chapter ?? "待补充"} / {question.knowledge_point ?? "待补充"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">错因</dt>
                  <dd className="mt-1 text-slate-600">
                    {question.mistake_types?.join("、") || "待补充"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">解析摘要</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600">
                    {question.solution_summary ?? "待补充"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">一句话提醒</dt>
                  <dd className="mt-1 break-words text-slate-600">
                    {question.one_sentence_tip ?? "待补充"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">我的备注</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600">
                    {question.user_note ?? "无"}
                  </dd>
                </div>
              </dl>
            </MobileCard>
          </MobileSection>

          <MobileSection title="智能增强">
            <MobileCard>
              <div className="flex flex-wrap gap-2">
                <StatusPill
                  label={getQuestionTextStatusLabel(question.question_text_status)}
                  tone={getQuestionTextStatusTone(question.question_text_status)}
                />
                <StatusPill
                  label={question.standard_answer ? "有答案" : "无答案"}
                  tone={question.standard_answer ? "blue" : "amber"}
                />
                <StatusPill label={getAnswerStatusLabel(question.answer_status)} tone="slate" />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                当前主要流程是查看题目、核对答案和记录复习。AI 自动分析和 DeepSeek 都是可选增强。
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="min-h-11 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                >
                  {isAnalyzing ? "分析中..." : question.analyzed_at ? "重新分析" : "AI 自动分析"}
                </button>
                {deepSeekStatus?.configured ? (
                  <button
                    type="button"
                    onClick={handleDeepSeekEnhance}
                    disabled={isDeepSeekEnhancing}
                    className="min-h-11 rounded-lg bg-amber-100 px-4 text-sm font-semibold text-amber-800 disabled:text-slate-400"
                  >
                    {isDeepSeekEnhancing ? "优化中..." : "DeepSeek 优化题卡"}
                  </button>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-100">
                    DeepSeek 学习分析未启用（可选），不影响当前复习。配置 DEEPSEEK_API_KEY 后可用。
                  </p>
                )}
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection title="更多操作">
            <MobileCard>
              <div className="grid gap-2 sm:grid-cols-2">
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
    </div>
  );
}
