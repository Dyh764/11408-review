"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import { createClient } from "@/lib/supabase/client";
import type { ReviewResult } from "@/lib/types";

const resultLabels: Record<ReviewResult, string> = {
  still_wrong: "仍不会",
  improved: "有进步",
  mastered: "已掌握",
  wrong_again: "复习后又错",
};

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2,
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReviewPage() {
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [completed, setCompleted] = useState<Record<string, ReviewResult>>({});
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实今日复习。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    fetchCurrentUserQuestions(supabase)
      .then((items) => {
        if (isActive) {
          setQuestions(items);
          setMessage(items.length === 0 ? "还没有可复盘的真实错题。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取今日复习失败。");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [supabase]);

  const reviewQuestions = useMemo(
    () =>
      [...questions].sort((a, b) => {
        const aRank = priorityRank[a.review_priority ?? "medium"];
        const bRank = priorityRank[b.review_priority ?? "medium"];

        if (aRank !== bRank) {
          return aRank - bRank;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [questions],
  );

  async function handleReview(question: QuestionWithImage, result: ReviewResult) {
    if (!supabase) {
      setMessage("请配置 Supabase 环境变量后再记录复习结果。");
      return;
    }

    const { error } = await supabase.from("reviews").upsert(
      {
        user_id: question.user_id,
        question_id: question.id,
        scheduled_date: todayIsoDate(),
        completed_at: new Date().toISOString(),
        review_result: result,
      },
      { onConflict: "question_id,scheduled_date" },
    );

    if (error) {
      setMessage(`复习记录写入失败：${error.message}`);
      return;
    }

    setCompleted((current) => ({ ...current, [question.id]: result }));
    setMessage("复习结果已写入 reviews。调度规则后续阶段继续完善。");
  }

  return (
    <div>
      <PageHeader
        title="今日复习"
        subtitle="第二阶段按 review_priority 和创建时间展示当前用户错题，并写入基础 reviews 记录。"
      />

      <section className="px-5 pt-5">
        <div className="rounded-lg bg-blue-600 p-4 text-white">
          <p className="text-sm text-blue-100">今日剩余</p>
          <p className="mt-1 text-3xl font-bold">
            {Math.max(reviewQuestions.length - Object.keys(completed).length, 0)}
          </p>
          <p className="mt-2 text-xs text-blue-100">
            TODO: 第三阶段接入完整 review scheduler。
          </p>
        </div>
      </section>

      {isLoading ? (
        <p className="px-5 pt-5 text-sm text-slate-500">正在读取今日复习...</p>
      ) : null}

      {message ? (
        <section className="px-5 pt-5">
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </section>
      ) : null}

      <section className="space-y-4 px-5 pt-5">
        {reviewQuestions.map((question) => {
          const result = completed[question.id];

          return (
            <article
              key={question.id}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex gap-3">
                <Link
                  href={`/questions/${question.id}`}
                  className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-xs text-slate-500"
                >
                  {question.signedImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={question.signedImageUrl}
                      alt="原题缩略图"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "原题缩略图"
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={question.subject} tone="blue" />
                    <StatusPill label={question.review_priority ?? "medium"} tone="red" />
                  </div>
                  <h2 className="mt-2 font-semibold text-slate-950">
                    {question.knowledge_point ?? "待识别知识点"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {question.one_sentence_tip ?? "暂无一句话提醒"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                上次错因：{question.mistake_types?.join("、") || "待分析"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(Object.keys(resultLabels) as ReviewResult[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleReview(question, key)}
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
