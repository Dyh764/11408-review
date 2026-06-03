"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import type { MasteryStatus, Subject } from "@/lib/types";

const subjectFilters: Array<Subject | "全部"> = [
  "全部",
  "数学",
  "数据结构",
  "计算机组成原理",
  "操作系统",
  "计算机网络",
];

const masteryFilters: Array<MasteryStatus | "全部"> = [
  "全部",
  "完全没思路",
  "有一点思路",
  "思路对但卡住",
  "计算错误",
  "做对但不稳",
  "完全掌握",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [subject, setSubject] = useState<Subject | "全部">("全部");
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus | "全部">("全部");
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实错题库。",
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
          setMessage(items.length === 0 ? "还没有上传真实错题。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "读取错题库失败。");
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

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const subjectMatch = subject === "全部" || question.subject === subject;
        const masteryMatch =
          masteryStatus === "全部" || question.mastery_status === masteryStatus;

        return subjectMatch && masteryMatch;
      }),
    [masteryStatus, questions, subject],
  );

  return (
    <div>
      <PageHeader
        title="错题库"
        subtitle="读取当前登录用户自己的 questions 数据，支持科目和掌握状态筛选。"
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
        <select
          value={masteryStatus}
          onChange={(event) => setMasteryStatus(event.target.value as MasteryStatus | "全部")}
          className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base outline-none focus:border-blue-500"
        >
          {masteryFilters.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      {isLoading ? (
        <p className="px-5 pt-5 text-sm text-slate-500">正在读取错题库...</p>
      ) : null}

      {message ? (
        <section className="px-5 pt-5">
          <p className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        </section>
      ) : null}

      <section className="space-y-4 px-5 pt-5">
        {filteredQuestions.map((question) => (
          <Link
            key={question.id}
            href={`/questions/${question.id}`}
            className="block rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 active:scale-[0.99]"
          >
            <div className="flex gap-3">
              <div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-xs text-slate-500">
                {question.signedImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={question.signedImageUrl}
                    alt="原题图片缩略图"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "无预览"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <StatusPill label={question.subject} tone="blue" />
                  <StatusPill label={question.mastery_status} tone="amber" />
                  <StatusPill label={question.question_text_status} tone="slate" />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-950">
                  {question.knowledge_point ?? "待识别知识点"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  创建时间：{formatDate(question.created_at)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
