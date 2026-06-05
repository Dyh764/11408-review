"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { LoadingState, MobileCard, MobileSection } from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { fetchCurrentUserQuestion, type QuestionWithImage } from "@/lib/questions";
import {
  buildQuestionUpdatePayload,
  type QuestionEditForm,
} from "@/lib/questions/edit-question";
import { getQuestionSourceLabel } from "@/lib/questions/source-label";
import { createClient } from "@/lib/supabase/client";
import type { MasteryStatus, QuestionTextStatus, Subject } from "@/lib/types";

const subjects: Subject[] = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];
const masteryStatuses: MasteryStatus[] = [
  "完全没思路",
  "有一点思路",
  "思路对但卡住",
  "计算错误",
  "做对但不稳",
  "完全掌握",
];
const textStatuses: QuestionTextStatus[] = ["ai_unverified", "verified", "needs_fix"];

function formFromQuestion(question: QuestionWithImage): QuestionEditForm {
  return {
    question_text: question.question_text ?? "",
    question_text_status: question.question_text_status,
    subject: question.subject,
    chapter: question.chapter ?? "",
    knowledge_point: question.knowledge_point ?? "",
    mastery_status: question.mastery_status,
    user_note: question.user_note ?? "",
    mistake_types: question.mistake_types?.join("，") ?? "",
    solution_summary: question.solution_summary ?? "",
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
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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

  function updateForm<K extends keyof QuestionEditForm>(key: K, value: QuestionEditForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div>
      <PageHeader
        title="错题详情"
        subtitle="展示原题图片和写入 questions 的 mock 错题卡字段。"
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
        <MobileSection>
          <div className="space-y-4">
          <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
            {question.signedImageUrl ? (
              <button type="button" onClick={() => setIsPreviewOpen(true)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                  src={question.signedImageUrl}
                  alt="原题图片"
                  loading="lazy"
                  decoding="async"
                  className="max-h-[520px] w-full object-contain"
                />
              </button>
            ) : (
              <div className="grid h-64 place-items-center bg-slate-100 px-5 text-center text-sm leading-6 text-slate-500">
                {question.image_path ? "原题图片暂不可预览" : "未绑定原图，可后续补图"}
              </div>
            )}
          </div>

          <MobileCard>
            <div className="flex flex-wrap gap-2">
              <StatusPill label={question.subject} tone="blue" />
              <StatusPill label={question.mastery_status} tone="amber" />
              <StatusPill label={question.question_text_status} tone="slate" />
              <StatusPill label={getQuestionSourceLabel(question)} tone="blue" />
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="mt-4 min-h-12 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {isAnalyzing ? "分析中..." : question.analyzed_at ? "重新分析" : "分析这道题"}
            </button>

            <button
              type="button"
              onClick={() => setIsEditing((value) => !value)}
              className="mt-3 min-h-12 w-full rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700"
            >
              {isEditing ? "收起编辑" : "编辑错题"}
            </button>

            {isEditing && form ? (
              <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
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
                          {item}
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
            ) : null}

            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-800">题目文字</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600">
                  {question.question_text ?? "AI 尚未识别题目文字"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">章节 / 知识点</dt>
                <dd className="mt-1 text-slate-600">
                  {question.chapter ?? "待识别"} / {question.knowledge_point ?? "待识别"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">用户备注</dt>
                <dd className="mt-1 text-slate-600">{question.user_note ?? "无"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">错因标签</dt>
                <dd className="mt-1 text-slate-600">
                  {question.mistake_types?.join("、") || "待分析"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">正确思路摘要</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600">
                  {question.solution_summary ?? "待分析"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">一句话提醒</dt>
                <dd className="mt-1 text-slate-600">
                  {question.one_sentence_tip ?? "待分析"}
                </dd>
              </div>
            </dl>
          </MobileCard>
          </div>
        </MobileSection>
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
