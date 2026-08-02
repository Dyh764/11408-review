"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MathText } from "@/components/mobile/MathText";
import { LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import {
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";

type NoteFilter = "all" | "note" | "summary";

const filterLabels: Record<NoteFilter, string> = {
  all: "全部笔记",
  note: "我的备注",
  summary: "正确思路",
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasNoteContent(question: QuestionWithImage) {
  return hasText(question.user_note) || hasText(question.solution_summary);
}

function noteTitle(question: QuestionWithImage) {
  return question.knowledge_point?.trim() || question.chapter?.trim() || "待整理笔记";
}

function sortNotes(notes: QuestionWithImage[]) {
  return [...notes].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export default function NotesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "当前未连接错题数据，暂时无法查看学习笔记。");
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [filter, setFilter] = useState<NoteFilter>("all");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    fetchCurrentUserQuestions(supabase)
      .then((items) => {
        if (isActive) {
          setQuestions(items);
          setMessage(items.length === 0 ? "还没有可汇总的学习笔记。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "学习笔记读取失败。");
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

  const noteItems = useMemo(() => sortNotes(questions.filter(hasNoteContent)), [questions]);
  const userNoteCount = useMemo(() => noteItems.filter((item) => hasText(item.user_note)).length, [noteItems]);
  const summaryCount = useMemo(
    () => noteItems.filter((item) => hasText(item.solution_summary)).length,
    [noteItems],
  );
  const visibleNotes = useMemo(
    () =>
      noteItems.filter((question) => {
        if (filter === "note") return hasText(question.user_note);
        if (filter === "summary") return hasText(question.solution_summary);
        return true;
      }),
    [filter, noteItems],
  );

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="学习笔记"
        subtitle="集中查看错题里的个人备注、正确思路和错因标签，复用现有题卡字段，不新增数据表。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="笔记" value={noteItems.length} helper="有内容题卡" />
          <SprintStatCard label="备注" value={userNoteCount} helper="我的记录" tone="cyan" />
          <SprintStatCard label="思路" value={summaryCount} helper="正确入口" tone="green" />
        </div>
      </MobileSection>

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取学习笔记..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader title="笔记范围" subtitle="按个人备注或正确思路快速筛选。" />
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(filterLabels) as NoteFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-11 rounded-lg px-3 text-sm font-black ${
                filter === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-100"
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <div className="grid gap-3">
          {visibleNotes.map((question) => (
            <StudyCard key={question.id} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StudyBadge tone="green">{question.subject}</StudyBadge>
                {question.mistake_types?.slice(0, 3).map((item) => (
                  <StudyBadge key={item} tone="amber">
                    {item}
                  </StudyBadge>
                ))}
              </div>

              <div>
                <p className="text-base font-black text-slate-950">{noteTitle(question)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {question.chapter ?? "未分类"} / {question.difficulty ?? "未标难度"}
                </p>
              </div>

              <div className="grid gap-3">
                {hasText(question.user_note) ? (
                  <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100">
                    <p className="mb-1 text-xs font-black text-amber-800">我的备注</p>
                    <MathText text={question.user_note} />
                  </div>
                ) : null}

                {hasText(question.solution_summary) ? (
                  <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-100">
                    <p className="mb-1 text-xs font-black text-emerald-800">正确思路</p>
                    <MathText text={question.solution_summary} />
                  </div>
                ) : null}
              </div>

              <Link
                href={`/questions/${question.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
              >
                题目详情
              </Link>
            </StudyCard>
          ))}

          {!isLoading && visibleNotes.length === 0 ? (
            <StudyCard>
              <p className="text-sm font-black text-slate-950">这一组暂时没有笔记</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                可以在题目详情里补充“我的备注”或“正确思路”，之后这里会自动汇总。
              </p>
              <Link
                href="/questions"
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
              >
                去错题库
              </Link>
            </StudyCard>
          ) : null}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
