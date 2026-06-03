"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { supabaseBucket } from "@/lib/env";
import { createMockAnalysis } from "@/lib/mock-ai";
import { ensureProfile } from "@/lib/profile";
import { buildInitialReviewPlan } from "@/lib/review-scheduler";
import { createClient } from "@/lib/supabase/client";
import type { MasteryStatus, MockAnalysis, Subject } from "@/lib/types";

const subjects: Subject[] = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];

const masteryStatuses: MasteryStatus[] = [
  "完全没思路",
  "有一点思路",
  "思路对但卡住",
  "计算错误",
  "做对但不稳",
  "完全掌握",
];

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 8 * 1024 * 1024;

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export default function UploadPage() {
  const [subject, setSubject] = useState<Subject>("数据结构");
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus>("思路对但卡住");
  const [userNote, setUserNote] = useState("递归边界没想清楚");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analysis, setAnalysis] = useState<MockAnalysis | null>(null);
  const [savedQuestionId, setSavedQuestionId] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const canSave = useMemo(
    () => Boolean(supabase) && selectedFile !== null && userNote.trim().length > 0 && !isSaving,
    [isSaving, selectedFile, supabase, userNote],
  );

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setMessage("");
    setSavedQuestionId("");
    setAnalysis(null);

    if (!allowedTypes.includes(file.type)) {
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

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
    };
    reader.readAsDataURL(file);
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
      const ext = extensionFromFile(selectedFile);
      const imagePath = `users/${user.id}/questions/${questionId}.${ext}`;
      const mock = createMockAnalysis({
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
        user_note: userNote.trim(),
        image_path: imagePath,
        question_text_status: "ai_unverified",
        needs_manual_check: false,
        question_text: mock.question_text,
        chapter: mock.chapter,
        knowledge_point: mock.knowledge_point,
        mistake_types: mock.mistake_types,
        solution_summary: mock.solution_summary,
        one_sentence_tip: mock.one_sentence_tip,
        review_priority: mock.review_priority,
        confidence: mock.confidence,
        analyzed_at: new Date().toISOString(),
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
      setMessage("保存成功：图片、错题记录和复习计划已写入。");
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
        subtitle="选择图片、科目、掌握状态和一句卡点，保存到 Supabase Storage 与 questions。"
      />

      {!supabase ? (
        <section className="px-5 pt-5">
          <div className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
            请配置 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
            后再上传。页面仍可访问，但真实保存会被禁用。
          </div>
        </section>
      ) : null}

      <section className="px-5 pt-5">
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
              className="mx-auto max-h-72 w-full rounded-lg object-contain"
            />
          ) : (
            <div className="py-8">
              <p className="text-lg font-semibold text-blue-700">选择或拍摄题目图片</p>
              <p className="mt-2 text-sm text-blue-700/80">原图是证据，必须保存 image_path</p>
            </div>
          )}
        </label>
      </section>

      <section className="space-y-4 px-5 pt-5">
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

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="min-h-14 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm disabled:bg-slate-300"
        >
          {isSaving ? "保存中..." : "上传并保存错题"}
        </button>

        {message ? (
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        ) : null}
      </section>

      {analysis ? (
        <section className="px-5 pt-5">
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-wrap gap-2">
              <StatusPill label={analysis.question_text_status} tone="amber" />
              <StatusPill label={analysis.review_priority} tone="blue" />
              <StatusPill label={analysis.confidence} tone="slate" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-950">mock AI 分析结果</h2>
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
          </div>
        </section>
      ) : null}
    </div>
  );
}
