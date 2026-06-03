"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { createMockAnalysis } from "@/lib/mock-ai";
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

export default function UploadPage() {
  const [subject, setSubject] = useState<Subject>("数据结构");
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus>("思路对但卡住");
  const [userNote, setUserNote] = useState("递归边界没想清楚");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analysis, setAnalysis] = useState<MockAnalysis | null>(null);

  const canSave = useMemo(() => userNote.trim().length > 0, [userNote]);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  }

  function handleMockSave() {
    if (!canSave) {
      return;
    }

    setAnalysis(
      createMockAnalysis({
        subject,
        mastery_status: masteryStatus,
        user_note: userNote,
        imagePreview,
      }),
    );
  }

  return (
    <div>
      <PageHeader
        title="拍题上传"
        subtitle="今晚版本只跑 mock 分析：选图、选科目、选状态、写一句卡点。"
      />

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
              <p className="mt-2 text-sm text-blue-700/80">原图是证据，后续必须保存 image_path</p>
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
          onClick={handleMockSave}
          disabled={!canSave}
          className="min-h-14 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm disabled:bg-slate-300"
        >
          保存并生成 mock 错题卡
        </button>
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
