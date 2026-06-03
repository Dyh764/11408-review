"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { fetchCurrentUserQuestion, type QuestionWithImage } from "@/lib/questions";
import { createClient } from "@/lib/supabase/client";

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const [question, setQuestion] = useState<QuestionWithImage | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实错题详情。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    fetchCurrentUserQuestion(supabase, params.id)
      .then((item) => {
        if (isActive) {
          setQuestion(item);
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取错题详情失败。");
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
  }, [params.id, supabase]);

  return (
    <div>
      <PageHeader
        title="错题详情"
        subtitle="展示原题图片和写入 questions 的 mock 错题卡字段。"
      />

      {isLoading ? (
        <p className="px-5 pt-5 text-sm text-slate-500">正在读取错题详情...</p>
      ) : null}

      {message ? (
        <section className="px-5 pt-5">
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </section>
      ) : null}

      {question ? (
        <section className="space-y-4 px-5 pt-5">
          <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
            {question.signedImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={question.signedImageUrl}
                alt="原题图片"
                className="max-h-[520px] w-full object-contain"
              />
            ) : (
              <div className="grid h-64 place-items-center bg-slate-100 text-sm text-slate-500">
                原题图片暂不可预览
              </div>
            )}
          </div>

          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-wrap gap-2">
              <StatusPill label={question.subject} tone="blue" />
              <StatusPill label={question.mastery_status} tone="amber" />
              <StatusPill label={question.question_text_status} tone="slate" />
            </div>

            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-800">题目文字</dt>
                <dd className="mt-1 leading-6 text-slate-600">
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
                <dd className="mt-1 leading-6 text-slate-600">
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
          </article>
        </section>
      ) : null}
    </div>
  );
}
