"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TextQuestionPreview } from "@/components/mobile/TextQuestionPreview";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { updateKnowledgeStatsForQuestionId } from "@/lib/knowledge-stats";
import { fetchCurrentUserQuestions } from "@/lib/questions";
import { getQuestionSourceLabel } from "@/lib/questions/source-label";
import {
  buildSprintItems,
  type SprintItem,
  type SprintKnowledgeStatInput,
  type SprintReviewInput,
} from "@/lib/sprint/sprint";
import { createClient } from "@/lib/supabase/client";
import type { Subject } from "@/lib/types";

const subjectFilters: Array<Subject | "全部"> = [
  "全部",
  "数学",
  "数据结构",
  "计算机组成原理",
  "操作系统",
  "计算机网络",
];

export default function SprintPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<SprintItem[]>([]);
  const [subject, setSubject] = useState<Subject | "全部">("全部");
  const [processingQuestionId, setProcessingQuestionId] = useState("");
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看考前冲刺模式。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;

    async function loadSprintItems() {
      try {
        const {
          data: { user },
          error,
        } = await client.auth.getUser();

        if (error || !user) {
          setMessage("请先登录，再查看考前冲刺模式。");
          return;
        }

        const [questions, reviewsResult, statsResult] = await Promise.all([
          fetchCurrentUserQuestions(client),
          client
            .from("reviews")
            .select("id,question_id,scheduled_date,completed_at,review_result")
            .eq("user_id", user.id),
          client
            .from("knowledge_stats")
            .select("subject,chapter,knowledge_point,weakness_score")
            .eq("user_id", user.id),
        ]);

        if (reviewsResult.error) {
          throw reviewsResult.error;
        }

        if (statsResult.error) {
          throw statsResult.error;
        }

        const nextItems = buildSprintItems({
          questions,
          reviews: (reviewsResult.data ?? []) as SprintReviewInput[],
          stats: (statsResult.data ?? []) as SprintKnowledgeStatInput[],
        });

        if (isActive) {
          setItems(nextItems);
          setMessage(nextItems.length === 0 ? "暂无高危错题。可以先去错题库或拍题上传。" : "");
        }
      } catch (error) {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取冲刺错题失败。");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadSprintItems();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  async function handleMarkMastered(item: SprintItem) {
    if (!supabase) {
      setMessage("Supabase 尚未配置。");
      return;
    }

    setProcessingQuestionId(item.question.id);
    setMessage("");

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setMessage("请先登录，再标记已掌握。");
        return;
      }

      const { error: updateError } = await supabase
        .from("questions")
        .update({ mastery_status: "完全掌握", review_priority: "low" })
        .eq("id", item.question.id)
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (updateError) {
        setMessage(`标记已掌握失败：${updateError.message}`);
        return;
      }

      const { error: reviewError } = await supabase
        .from("reviews")
        .delete()
        .eq("question_id", item.question.id)
        .eq("user_id", user.id)
        .is("completed_at", null);

      if (reviewError) {
        setMessage(`题目已标记掌握，但清理待复习任务失败：${reviewError.message}`);
        return;
      }

      try {
        await updateKnowledgeStatsForQuestionId(supabase, item.question.id);
      } catch {
        // 统计失败不阻断用户完成冲刺操作，下一次报告或复习仍可重新计算。
      }

      setItems((current) => current.filter((currentItem) => currentItem.question.id !== item.question.id));
      setMessage("已标记为完全掌握，并取消未完成的待复习任务。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "标记已掌握失败。");
    } finally {
      setProcessingQuestionId("");
    }
  }

  const filteredItems = items.filter(
    (item) => subject === "全部" || item.question.subject === subject,
  );

  return (
    <div>
      <PageHeader
        title="考前冲刺"
        subtitle="优先处理复习后又错、仍不会、完全没思路、逾期和高危知识点。"
      />

      <section className="space-y-3 px-5 pt-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjectFilters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSubject(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                subject === item
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <p className="px-5 pt-5 text-sm text-slate-500">正在读取冲刺错题...</p>
      ) : null}

      {message ? (
        <section className="px-5 pt-5">
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </section>
      ) : null}

      <section className="space-y-4 px-5 pt-5">
        {!isLoading && filteredItems.length === 0 ? (
          <div className="rounded-lg bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-slate-100">
            当前筛选下暂无冲刺错题。
          </div>
        ) : null}

        {filteredItems.map((item) => {
          const isProcessing = processingQuestionId === item.question.id;

          return (
            <article
              key={item.question.id}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex gap-3">
                {item.question.signedImageUrl || item.question.image_path ? (
                  <Link
                    href={`/questions/${item.question.id}`}
                    className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-xs text-slate-500"
                  >
                    {item.question.signedImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.question.signedImageUrl}
                        alt="原题缩略图"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "无预览"
                    )}
                  </Link>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={item.question.subject} tone="blue" />
                    <StatusPill label={item.question.mastery_status} tone="amber" />
                    <StatusPill label={getQuestionSourceLabel(item.question)} tone="blue" />
                  </div>
                  <p className="mt-2 break-words text-xs font-semibold leading-5 text-slate-500">
                    {item.question.knowledge_point ?? item.question.chapter ?? "待识别知识点"}
                  </p>
                  {!item.question.image_path ? (
                    <div className="mt-2">
                      <TextQuestionPreview
                        subject={item.question.subject}
                        chapter={item.question.chapter}
                        knowledge_point={item.question.knowledge_point}
                        question_text={item.question.question_text}
                        mastery_status={item.question.mastery_status}
                        question_text_status={item.question.question_text_status}
                        source={item.question.source}
                        compact
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.reasons.slice(0, 4).map((reason) => (
                  <StatusPill key={reason} label={reason} tone={reason.includes("错") || reason.includes("逾期") ? "red" : "slate"} />
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={`/questions/${item.question.id}`}
                  className="grid min-h-12 place-items-center rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700"
                >
                  查看详情
                </Link>
                <button
                  type="button"
                  onClick={() => handleMarkMastered(item)}
                  disabled={Boolean(processingQuestionId)}
                  className="min-h-12 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {isProcessing ? "写入中..." : "已掌握"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
