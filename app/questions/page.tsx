"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState, MobilePageShell, MobileSection, SectionCard } from "@/components/mobile/primitives";
import { QuestionListCard } from "@/components/mobile/QuestionListCard";
import { PageHeader } from "@/components/page-header";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import {
  getQuestionTextStatusLabel,
} from "@/lib/questions/meta-labels";
import type { MasteryStatus, QuestionTextStatus, Subject } from "@/lib/types";

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

const textStatusFilters: Array<QuestionTextStatus | "全部"> = [
  "全部",
  "ai_unverified",
  "verified",
  "needs_fix",
];

type SortMode = "created_desc" | "created_asc" | "weak_first";

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
  const [textStatus, setTextStatus] = useState<QuestionTextStatus | "全部">("全部");
  const [keyword, setKeyword] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("created_desc");
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState(
    supabase ? "" : "请配置 Supabase 环境变量后查看真实错题库。",
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [showBatchTools, setShowBatchTools] = useState(false);

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
    () => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      const priorityRank = { high: 3, medium: 2, low: 1 } as const;

      return questions
        .filter((question) => {
        const subjectMatch = subject === "全部" || question.subject === subject;
        const masteryMatch =
          masteryStatus === "全部" || question.mastery_status === masteryStatus;
          const textStatusMatch =
            textStatus === "全部" || question.question_text_status === textStatus;
          const keywordMatch =
            normalizedKeyword.length === 0 ||
            [
              question.knowledge_point,
              question.question_text,
              question.chapter,
              question.user_note,
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(normalizedKeyword));

          return subjectMatch && masteryMatch && textStatusMatch && keywordMatch;
        })
        .sort((a, b) => {
          if (sortMode === "created_asc") {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }

          if (sortMode === "weak_first") {
            return (
              (priorityRank[b.review_priority ?? "low"] ?? 0) -
                (priorityRank[a.review_priority ?? "low"] ?? 0) ||
              Number(b.needs_manual_check) - Number(a.needs_manual_check) ||
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }

          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    },
    [keyword, masteryStatus, questions, sortMode, subject, textStatus],
  );

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function selectAllFiltered() {
    setSelectedIds(filteredQuestions.map((question) => question.id));
  }

  async function handleBatchAction(action: "mastered" | "needs_fix" | "sprint") {
    if (!supabase) {
      setMessage("Supabase 尚未配置，无法批量操作。");
      return;
    }

    if (selectedIds.length === 0) {
      setMessage("请先选择至少一道错题。");
      return;
    }

    const actionLabel =
      action === "mastered"
        ? "批量标记为已掌握"
        : action === "needs_fix"
          ? "批量标记为题目需修正"
          : "批量加入冲刺复习";

    if (!window.confirm(`确认${actionLabel}？本操作不会删除错题。`)) {
      return;
    }

    setIsBatchProcessing(true);
    setMessage("");

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setMessage("请先登录，再批量操作错题。");
        return;
      }

      if (action === "mastered") {
        const { error: updateError } = await supabase
          .from("questions")
          .update({ mastery_status: "完全掌握", review_priority: "low" })
          .in("id", selectedIds)
          .eq("user_id", user.id)
          .is("deleted_at", null);

        if (updateError) {
          setMessage(`批量标记已掌握失败：${updateError.message}`);
          return;
        }

        setQuestions((current) =>
          current.map((question) =>
            selectedIds.includes(question.id)
              ? { ...question, mastery_status: "完全掌握", review_priority: "low" }
              : question,
          ),
        );
      }

      if (action === "needs_fix") {
        const { error: updateError } = await supabase
          .from("questions")
          .update({ question_text_status: "needs_fix", needs_manual_check: true })
          .in("id", selectedIds)
          .eq("user_id", user.id)
          .is("deleted_at", null);

        if (updateError) {
          setMessage(`批量标记题目需修正失败：${updateError.message}`);
          return;
        }

        setQuestions((current) =>
          current.map((question) =>
            selectedIds.includes(question.id)
              ? { ...question, question_text_status: "needs_fix", needs_manual_check: true }
              : question,
          ),
        );
      }

      if (action === "sprint") {
        const scheduledDate = todayIsoDate();
        const reviewRows = selectedIds.map((questionId) => ({
          user_id: user.id,
          question_id: questionId,
          scheduled_date: scheduledDate,
        }));
        const { error: reviewError } = await supabase
          .from("reviews")
          .upsert(reviewRows, { onConflict: "question_id,scheduled_date" });

        if (reviewError) {
          setMessage(`加入冲刺复习失败：${reviewError.message}`);
          return;
        }

        const { error: updateError } = await supabase
          .from("questions")
          .update({ review_priority: "high" })
          .in("id", selectedIds)
          .eq("user_id", user.id)
          .is("deleted_at", null);

        if (updateError) {
          setMessage(`已加入冲刺复习，但更新优先级失败：${updateError.message}`);
          return;
        }

        setQuestions((current) =>
          current.map((question) =>
            selectedIds.includes(question.id)
              ? { ...question, review_priority: "high" }
              : question,
          ),
        );
      }

      setSelectedIds([]);
      setMessage(`${actionLabel}成功，已处理 ${selectedIds.length} 道错题。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${actionLabel}失败。`);
    } finally {
      setIsBatchProcessing(false);
    }
  }

  return (
    <MobilePageShell>
      <PageHeader
        title="错题库"
        subtitle="这里用于浏览和筛选，做题、看答案和编辑都放到详情页。"
      />

      <section className="space-y-3 px-5">
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
        <div className="grid gap-3 sm:grid-cols-3">
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
          <select
            value={textStatus}
            onChange={(event) =>
              setTextStatus(event.target.value as QuestionTextStatus | "全部")
            }
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base outline-none focus:border-blue-500"
          >
            {textStatusFilters.map((item) => (
              <option key={item} value={item}>
                {item === "全部" ? item : getQuestionTextStatusLabel(item)}
              </option>
            ))}
          </select>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base outline-none focus:border-blue-500"
          >
            <option value="created_desc">最新优先</option>
            <option value="created_asc">最早优先</option>
            <option value="weak_first">薄弱优先</option>
          </select>
        </div>
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base outline-none focus:border-blue-500"
          placeholder="搜索题目文字、知识点、章节或备注"
        />
      </section>

      <section className="px-5">
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">
              已选择 {selectedIds.length} 道
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBatchTools((value) => !value)}
                className="min-h-10 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700"
              >
                {showBatchTools ? "收起批量" : "批量操作"}
              </button>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="min-h-10 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700"
              >
                全选当前
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="min-h-10 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700"
              >
                清空
              </button>
            </div>
          </div>
          {showBatchTools ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleBatchAction("mastered")}
              disabled={isBatchProcessing}
              className="min-h-11 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              标记已掌握
            </button>
            <button
              type="button"
              onClick={() => handleBatchAction("needs_fix")}
              disabled={isBatchProcessing}
              className="min-h-11 rounded-lg bg-amber-100 px-3 text-sm font-semibold text-amber-800 disabled:text-slate-400"
            >
              标记需修正
            </button>
            <button
              type="button"
              onClick={() => handleBatchAction("sprint")}
              disabled={isBatchProcessing}
              className="min-h-11 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              加入冲刺复习
            </button>
          </div>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-slate-500">
            不提供批量删除，避免误删原图和错题记录。
          </p>
        </SectionCard>
      </section>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取错题库..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-100">
            {message}
          </p>
        </MobileSection>
      ) : null}

      <MobileSection>
        <div className="space-y-4">
        {!isLoading && filteredQuestions.length === 0 ? (
          <EmptyState
            title="还没有符合条件的错题"
            description="可以清空筛选条件，或先拍一题、导入 ChatGPT 错题卡。"
            action={{ href: "/upload", label: "去拍题" }}
          />
        ) : null}
        {filteredQuestions.map((question) => {
          const hasAnswer = Boolean(question.standard_answer?.trim());
          const title = question.knowledge_point ?? question.chapter ?? "待识别知识点";

          return (
          <QuestionListCard
            key={question.id}
            href={`/questions/${question.id}`}
            title={title}
            summary={question.question_text ?? question.user_note}
            subject={question.subject}
            difficulty={question.difficulty}
            masteryStatus={question.mastery_status}
            hasAnswer={hasAnswer}
            createdAt={`创建：${formatDate(question.created_at)}`}
            imageUrl={question.signedImageUrl}
            hasImagePath={Boolean(question.image_path)}
            selected={selectedIds.includes(question.id)}
            onSelect={() => toggleSelected(question.id)}
          />
          );
        })}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
