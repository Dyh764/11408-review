"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState, MobilePageShell, MobileSection, SectionCard } from "@/components/mobile/primitives";
import { QuestionListCard } from "@/components/mobile/QuestionListCard";
import { PageHeader } from "@/components/page-header";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import { getQuestionStemAndChoices } from "@/lib/questions/extract-choices";
import { groupQuestionsBySubjectAndDifficulty } from "@/lib/questions/question-list-view";
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getQuestionKind(question: QuestionWithImage, choiceCount: number) {
  if (choiceCount > 0) {
    return "选择题";
  }

  if (question.image_path || question.signedImageUrl) {
    return "图片题";
  }

  return "文字题";
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [subject, setSubject] = useState<Subject | "全部">("全部");
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus | "全部">("全部");
  const [textStatus, setTextStatus] = useState<QuestionTextStatus | "全部">("全部");
  const [keyword, setKeyword] = useState("");
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
        });
    },
    [keyword, masteryStatus, questions, subject, textStatus],
  );

  const groupedQuestions = useMemo(
    () => groupQuestionsBySubjectAndDifficulty(filteredQuestions),
    [filteredQuestions],
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

  async function handleBatchDelete() {
    if (selectedIds.length === 0) {
      setMessage("请先选择至少一道错题。");
      return;
    }

    const selectedCount = selectedIds.length;
    const shouldDelete = window.confirm(
      `确定删除选中的 ${selectedCount} 道错题吗？\n删除后它们不会出现在错题库、今日复习和报告统计中。\n此操作暂不提供批量撤销。`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsBatchProcessing(true);
    setMessage("");

    try {
      const response = await fetch("/api/questions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        deletedCount?: number;
        error?: string;
      };

      if (!response.ok) {
        setMessage(result.error ?? "批量删除失败。");
        return;
      }

      setQuestions((current) => current.filter((question) => !selectedIds.includes(question.id)));
      setSelectedIds([]);
      setMessage(`已删除 ${result.deletedCount ?? selectedCount} 道错题。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量删除失败。");
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
        <div className="grid gap-3 sm:grid-cols-2">
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
          {!showBatchTools ? (
            <button
              type="button"
              onClick={() => setShowBatchTools(true)}
              className="min-h-11 w-full rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-700"
            >
              批量管理
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  已选择 {selectedIds.length} 题
                </p>
                <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="min-h-10 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700"
              >
                全选当前页
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="min-h-10 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700"
              >
                取消选择
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setShowBatchTools(false);
                }}
                className="min-h-10 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700"
              >
                退出批量
              </button>
                </div>
            </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={isBatchProcessing || selectedIds.length === 0}
              className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              删除所选
            </button>
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
            </>
          )}
          <p className="mt-2 text-xs leading-5 text-slate-500">
            批量删除只会软删除错题，不会删除 Storage 图片或复习记录。
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
        {groupedQuestions.map((group) => (
          <section key={group.subject} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950">
                {group.subject} · {group.count} 题
              </h2>
            </div>
            <div className="space-y-3">
              {group.items.map((question) => {
                const title = question.knowledge_point ?? question.chapter ?? "待识别知识点";
                const questionDisplay = getQuestionStemAndChoices(
                  question.question_text,
                  question.choices,
                );

                return (
                  <QuestionListCard
                    key={question.id}
                    href={`/questions/${question.id}`}
                    title={title}
                    summary={questionDisplay.questionText || question.user_note}
                    chapter={question.chapter}
                    difficulty={question.difficulty}
                    questionKind={getQuestionKind(question, questionDisplay.choices.length)}
                    createdAt={formatDate(question.created_at)}
                    selected={selectedIds.includes(question.id)}
                    onSelect={showBatchTools ? () => toggleSelected(question.id) : undefined}
                  />
                );
              })}
            </div>
          </section>
        ))}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
