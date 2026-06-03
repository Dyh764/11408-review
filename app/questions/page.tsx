"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { mockQuestions } from "@/lib/mock-data";

export default function QuestionsPage() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("全部");

  const filteredQuestions = useMemo(() => {
    const keyword = query.trim();

    return mockQuestions.filter((question) => {
      const subjectMatch = subject === "全部" || question.subject === subject;
      const text = `${question.subject} ${question.chapter} ${question.knowledgePoint} ${question.userNote}`;
      const queryMatch = keyword.length === 0 || text.includes(keyword);

      return subjectMatch && queryMatch;
    });
  }, [query, subject]);

  return (
    <div>
      <PageHeader
        title="错题库"
        subtitle="mock 题库支持基础搜索和科目筛选，后续接 questions 表。"
      />

      <section className="space-y-3 px-5 pt-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base outline-none focus:border-blue-500"
          placeholder="搜索题目文字、备注、知识点"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["全部", "数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"].map(
            (item) => (
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
            ),
          )}
        </div>
      </section>

      <section className="space-y-4 px-5 pt-5">
        {filteredQuestions.map((question) => (
          <article
            key={question.id}
            className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {question.knowledgePoint}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {question.chapter} · {question.userNote}
                </p>
              </div>
              <p className="shrink-0 text-lg font-bold text-red-600">
                {question.weaknessScore}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill label={question.subject} tone="blue" />
              <StatusPill label={question.masteryStatus} tone="amber" />
              <StatusPill label={question.nextReviewDate} tone="red" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {question.oneSentenceTip}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
