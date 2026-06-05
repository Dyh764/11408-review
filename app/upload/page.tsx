"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  MobileCard,
  MobileSection,
  Notice,
} from "@/components/mobile/primitives";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { supabaseBucket } from "@/lib/env";
import {
  compressImage,
  formatFileSize,
  getImageExtension,
  isSupportedImageType,
} from "@/lib/image/compress-image";
import { createMockAnalysis } from "@/lib/mock-ai";
import { ensureProfile } from "@/lib/profile";
import {
  getConfidenceLabel,
  getQuestionTextStatusLabel,
  getReviewPriorityLabel,
} from "@/lib/questions/meta-labels";
import { buildInitialReviewPlan } from "@/lib/review-scheduler";
import { createClient } from "@/lib/supabase/client";
import type { MasteryStatus, MockAnalysis, Subject } from "@/lib/types";

type SaveMode = "pending_chatgpt" | "auto_analysis";

const subjects: Subject[] = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];

const masteryStatuses: MasteryStatus[] = [
  "完全没思路",
  "有一点思路",
  "思路对但卡住",
  "计算错误",
  "做对但不稳",
  "完全掌握",
];

const maxFileSize = 8 * 1024 * 1024;

export default function UploadPage() {
  const [subject, setSubject] = useState<Subject>("数据结构");
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus>("思路对但卡住");
  const [userNote, setUserNote] = useState("递归边界没想清楚");
  const [saveMode, setSaveMode] = useState<SaveMode>("pending_chatgpt");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [originalFileSize, setOriginalFileSize] = useState(0);
  const [compressionMessage, setCompressionMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [analysis, setAnalysis] = useState<MockAnalysis | null>(null);
  const [savedQuestionId, setSavedQuestionId] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const canSave = useMemo(
    () =>
      Boolean(supabase) &&
      selectedFile !== null &&
      (saveMode === "pending_chatgpt" || userNote.trim().length > 0) &&
      !isSaving,
    [isSaving, saveMode, selectedFile, supabase, userNote],
  );

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setMessage("");
    setSavedQuestionId("");
    setAnalysis(null);
    setCompressionMessage("");
    setOriginalFileSize(file.size);

    if (!isSupportedImageType(file.type)) {
      setSelectedFile(null);
      setImagePreview("");
      setMessage("仅支持 jpg、jpeg、png、webp 图片。");
      return;
    }

    if (file.size > maxFileSize) {
      setSelectedFile(null);
      setImagePreview("");
      setMessage("图片不能超过 8MB，请压缩后再上传。");
      return;
    }

    setIsCompressing(true);
    setCompressionMessage("正在压缩图片，优先保留题目和公式清晰度...");

    const result = await compressImage(file, {
      maxWidth: 1800,
      targetBytes: 2 * 1024 * 1024,
      minQuality: 0.74,
    });

    setSelectedFile(result.file);
    setCompressionMessage(result.message);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
      setIsCompressing(false);
    };
    reader.onerror = () => {
      setIsCompressing(false);
      setMessage("图片预览生成失败，请重新选择图片。");
    };
    reader.readAsDataURL(result.file);
  }

  async function handleSave() {
    if (!supabase) {
      setMessage("请先配置 Supabase 环境变量，再重启项目。");
      return;
    }

    if (!selectedFile) {
      setMessage("请先选择或拍摄题目图片。");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setSavedQuestionId("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      setMessage("请先登录，再上传错题。");
      return;
    }

    try {
      await ensureProfile(supabase, user);

      const questionId = crypto.randomUUID();
      const ext = getImageExtension(selectedFile);
      const imagePath = `users/${user.id}/questions/${questionId}.${ext}`;
      const isPendingChatGPT = saveMode === "pending_chatgpt";
      const noteText = userNote.trim();
      const pendingNote = noteText
        ? `待 ChatGPT 整理：${noteText}`
        : "待 ChatGPT 整理";
      const mock = isPendingChatGPT
        ? null
        : createMockAnalysis({
            subject,
            mastery_status: masteryStatus,
            user_note: userNote,
            imagePreview,
          });

      const { error: uploadError } = await supabase.storage
        .from(supabaseBucket)
        .upload(imagePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        setMessage(`图片上传失败：${uploadError.message}`);
        return;
      }

      const { error: insertError } = await supabase.from("questions").insert({
        id: questionId,
        user_id: user.id,
        subject,
        mastery_status: masteryStatus,
        user_note: isPendingChatGPT ? pendingNote : noteText,
        image_path: imagePath,
        question_text_status: isPendingChatGPT ? "needs_fix" : "ai_unverified",
        needs_manual_check: isPendingChatGPT ? true : false,
        question_text: mock?.question_text ?? null,
        chapter: mock?.chapter ?? null,
        knowledge_point: mock?.knowledge_point ?? null,
        mistake_types: mock?.mistake_types ?? [],
        solution_summary: mock?.solution_summary ?? null,
        one_sentence_tip: mock?.one_sentence_tip ?? null,
        review_priority: mock?.review_priority ?? "medium",
        confidence: mock?.confidence ?? "low",
        source: isPendingChatGPT ? "pending_chatgpt" : "ai_analysis",
        analyzed_at: isPendingChatGPT ? null : new Date().toISOString(),
      });

      if (insertError) {
        await supabase.storage.from(supabaseBucket).remove([imagePath]);
        setMessage(`数据库写入失败，已尝试清理刚上传图片：${insertError.message}`);
        return;
      }

      const reviewPlan = buildInitialReviewPlan({
        userId: user.id,
        questionId,
        masteryStatus,
      });

      if (reviewPlan.length > 0) {
        const { error: reviewError } = await supabase
          .from("reviews")
          .upsert(reviewPlan, { onConflict: "question_id,scheduled_date" });

        if (reviewError) {
          setAnalysis(mock);
          setSavedQuestionId(questionId);
          setMessage(`错题已保存，但复习计划生成失败：${reviewError.message}`);
          return;
        }
      }

      setAnalysis(mock);
      setSavedQuestionId(questionId);
      setMessage(
        isPendingChatGPT
          ? "已保存原题。晚上可让 ChatGPT 生成包含答案的错题卡，再导入或补充。"
          : "保存成功：图片、错题记录和复习计划已写入。",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="拍题上传"
        subtitle="默认先保存原图和卡点，稍后用 ChatGPT 整理；也可以立即自动分析。"
      />

      {!supabase ? (
        <MobileSection>
          <Notice tone="amber">
            请配置 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
            后再上传。页面仍可访问，但真实保存会被禁用。
          </Notice>
        </MobileSection>
      ) : null}

      <MobileSection title="步骤 1：选择题图" subtitle="原图是证据，后续整理都绑定这张图。">
        <label className="block rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-4 text-center active:scale-[0.99]">
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleImageChange}
          />
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
                <img
              src={imagePreview}
              alt="题目图片预览"
              decoding="async"
              className="mx-auto max-h-72 w-full rounded-lg object-contain"
            />
          ) : (
            <div className="py-8">
              <p className="text-lg font-bold text-blue-700">拍照 / 从相册选择</p>
              <p className="mt-2 text-sm text-blue-700/80">原图是证据，必须保存 image_path</p>
            </div>
          )}
        </label>
        {imagePreview ? (
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="mt-3 min-h-11 w-full rounded-lg bg-white px-4 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
          >
            放大查看题图
          </button>
        ) : null}
      </MobileSection>

      <MobileSection title="步骤 2：记录当前卡点">
        <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">科目</span>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value as Subject)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-blue-500"
          >
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-800">掌握状态</span>
          <select
            value={masteryStatus}
            onChange={(event) => setMasteryStatus(event.target.value as MasteryStatus)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-blue-500"
          >
            {masteryStatuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-800">一句卡点备注</span>
          <textarea
            value={userNote}
            onChange={(event) => setUserNote(event.target.value)}
            rows={3}
            maxLength={120}
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-blue-500"
            placeholder="我卡在哪？"
          />
        </label>
        </div>
      </MobileSection>

      <MobileSection title="步骤 3：选择保存方式">
        <div className="space-y-4">
        <fieldset className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
          <legend className="px-1 text-sm font-bold text-slate-800">保存方式</legend>
          <div className="mt-3 grid gap-2">
            <label
              className={`min-h-16 rounded-lg p-3 ring-1 ${
                saveMode === "pending_chatgpt"
                  ? "bg-blue-50 text-blue-800 ring-blue-100"
                  : "bg-slate-50 text-slate-700 ring-slate-100"
              }`}
            >
              <input
                type="radio"
                name="saveMode"
                value="pending_chatgpt"
                checked={saveMode === "pending_chatgpt"}
                onChange={() => setSaveMode("pending_chatgpt")}
                className="mr-2"
              />
              <span className="font-bold">只保存图片，稍后用 ChatGPT 整理</span>
              <span className="mt-1 block text-xs opacity-75">推荐：白天先留图，晚上导入整理好的 JSON。</span>
            </label>
            <label
              className={`min-h-16 rounded-lg p-3 ring-1 ${
                saveMode === "auto_analysis"
                  ? "bg-blue-50 text-blue-800 ring-blue-100"
                  : "bg-slate-50 text-slate-700 ring-slate-100"
              }`}
            >
              <input
                type="radio"
                name="saveMode"
                value="auto_analysis"
                checked={saveMode === "auto_analysis"}
                onChange={() => setSaveMode("auto_analysis")}
                className="mr-2"
              />
              <span className="font-bold">保存并自动分析</span>
              <span className="mt-1 block text-xs opacity-75">保留原流程，适合快速生成一版待核对内容。</span>
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isCompressing}
          className="min-h-14 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm disabled:bg-slate-300"
        >
          {isSaving
            ? "保存中..."
            : saveMode === "pending_chatgpt"
              ? "保存图片，稍后整理"
              : "上传并保存错题"}
        </button>

        {selectedFile ? (
          <MobileCard className="text-sm leading-6 text-slate-600">
            <p>原图大小：{formatFileSize(originalFileSize)}</p>
            <p>上传大小：{formatFileSize(selectedFile.size)}</p>
            <p>{isCompressing ? "压缩中..." : compressionMessage}</p>
          </MobileCard>
        ) : null}

        {message ? (
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
            {message}
          </p>
        ) : null}

        {savedQuestionId && !analysis ? (
          <div className="grid gap-2 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
            <p>已保存，已生成复习计划。</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/questions/${savedQuestionId}`}
                className="grid min-h-11 place-items-center rounded-lg bg-white px-3 font-semibold text-emerald-700"
              >
                去错题详情
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setImagePreview("");
                  setSavedQuestionId("");
                  setMessage("");
                }}
                className="min-h-11 rounded-lg bg-white px-3 font-semibold text-emerald-700"
              >
                继续上传
              </button>
            </div>
          </div>
        ) : null}
        </div>
      </MobileSection>

      {analysis ? (
        <MobileSection>
          <MobileCard>
            <div className="flex flex-wrap gap-2">
              <StatusPill label={getQuestionTextStatusLabel(analysis.question_text_status)} tone="amber" />
              <StatusPill label={getReviewPriorityLabel(analysis.review_priority)} tone="blue" />
              <StatusPill label={getConfidenceLabel(analysis.confidence)} tone="slate" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-950">自动分析结果</h2>
            {savedQuestionId ? (
              <Link
                href={`/questions/${savedQuestionId}`}
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700"
              >
                查看错题详情
              </Link>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-slate-600">{analysis.question_text}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-800">知识点</dt>
                <dd className="mt-1 text-slate-600">
                  {analysis.chapter} / {analysis.knowledge_point}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">错因</dt>
                <dd className="mt-1 text-slate-600">{analysis.mistake_types.join("、")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">正确思路摘要</dt>
                <dd className="mt-1 text-slate-600">{analysis.solution_summary}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">一句话提醒</dt>
                <dd className="mt-1 text-slate-600">{analysis.one_sentence_tip}</dd>
              </div>
            </dl>
          </MobileCard>
        </MobileSection>
      ) : null}

      {isPreviewOpen && imagePreview ? (
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
              src={imagePreview}
              alt="放大的题目图片"
              className="mx-auto h-auto max-w-none"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
