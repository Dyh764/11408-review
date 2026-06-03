"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { mockQuestions } from "@/lib/mock-data";
import type { ReviewResult } from "@/lib/types";

const resultLabels: Record<ReviewResult, string> = {
  still_wrong: "仍不会",
  improved: "有进步",
  mastered: "已掌握",
  wrong_again: "复习后又错",
};

export default function ReviewPage() {
  const [completed, setCompleted] = useState<Record<string, ReviewResult>>({});

  return (
    <div>
      <PageHeader
        title="今日复习"
        subtitle="先用 mock 复习卡验证交互，后续接 reviews 表写入和调度。"
      />

      <section className="px-5 pt-5">
        <div className="rounded-lg bg-blue-600 p-4 text-white">
          <p className="text-sm text-blue-100">今日剩余</p>
          <p className="mt-1 text-3xl font-bold">
            {mockQuestions.length - Object.keys(completed).length}
          </p>
        </div>
      </section>

      <section className="space-y-4 px-5 pt-5">
        {mockQuestions.map((question) => {
          const result = completed[question.id];

          return (
            <article
              key={question.id}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex gap-3">
                <div className="grid h-20 w-24 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs text-slate-500">
                  原题缩略图
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={question.subject} tone="blue" />
                    <StatusPill label={question.nextReviewDate} tone="red" />
                  </div>
                  <h2 className="mt-2 font-semibold text-slate-950">
                    {question.knowledgePoint}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{question.oneSentenceTip}</p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                上次错因：{question.mistakeTypes.join("、")}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(Object.keys(resultLabels) as ReviewResult[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCompleted((current) => ({ ...current, [question.id]: key }))}
                    className={`min-h-12 rounded-lg px-3 text-sm font-semibold ${
                      result === key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {resultLabels[key]}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
