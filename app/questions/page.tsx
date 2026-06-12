"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, LoadingState, MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import { MathText } from "@/components/mobile/MathText";
import {
  ProgressBar,
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";
import { getQuestionStemAndChoices } from "@/lib/questions/extract-choices";
import { buildQuestionBadges } from "@/lib/questions/question-badges";
import { buildQuestionDirectory, type QuestionChapterGroup, type QuestionSubjectDirectory } from "@/lib/taxonomy/question-taxonomy";
import {
  getQuestionTextStatusLabel,
} from "@/lib/questions/meta-labels";
import type { MasteryStatus, QuestionTextStatus } from "@/lib/types";

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

type QuickScope = "all" | "inbox" | "needs_fix" | "uncategorized";

type FilterPanelProps = {
  quickScope: QuickScope;
  masteryStatus: MasteryStatus | "全部";
  textStatus: QuestionTextStatus | "全部";
  keyword: string;
  showSearch: boolean;
  searchPlaceholder?: string;
  onQuickScopeChange: (scope: QuickScope) => void;
  onMasteryStatusChange: (status: MasteryStatus | "全部") => void;
  onTextStatusChange: (status: QuestionTextStatus | "全部") => void;
  onKeywordChange: (keyword: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getQuestionKind(choiceCount: number) {
  if (choiceCount > 0) {
    return "选择题";
  }

  return "文字题";
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus | "全部">("全部");
  const [textStatus, setTextStatus] = useState<QuestionTextStatus | "全部">("全部");
  const [keyword, setKeyword] = useState("");
  const [quickScope, setQuickScope] = useState<QuickScope>("all");
  const [dueTodayIds, setDueTodayIds] = useState<Set<string>>(new Set());
  const [activeSubject, setActiveSubject] = useState("");
  const [activeChapter, setActiveChapter] = useState("");
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
    Promise.all([
      fetchCurrentUserQuestions(supabase),
      supabase
        .from("reviews")
        .select("question_id")
        .lte("scheduled_date", todayIsoDate())
        .is("completed_at", null),
    ])
      .then(([items, dueResult]) => {
        if (dueResult.error) {
          throw dueResult.error;
        }

        if (isActive) {
          setQuestions(items);
          setDueTodayIds(new Set((dueResult.data ?? []).map((row) => String(row.question_id))));
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
          const isNeedsFix =
            question.question_text_status === "needs_fix" || question.answer_status === "needs_fix";
          const isUncategorized =
            !question.chapter?.trim() || !question.knowledge_point?.trim();
          const isInbox =
            question.needs_manual_check ||
            isNeedsFix ||
            question.chapter === "待整理" ||
            isUncategorized;
          const quickScopeMatch =
            quickScope === "all" ||
            (quickScope === "inbox" && isInbox) ||
            (quickScope === "needs_fix" && isNeedsFix) ||
            (quickScope === "uncategorized" && isUncategorized);

          return masteryMatch && textStatusMatch && keywordMatch && quickScopeMatch;
        });
    },
    [keyword, masteryStatus, questions, quickScope, textStatus],
  );

  const directory = useMemo(
    () => buildQuestionDirectory(filteredQuestions, dueTodayIds),
    [dueTodayIds, filteredQuestions],
  );
  const selectedSubject = directory.find((group) => group.subject === activeSubject) ?? null;
  const selectedChapter =
    selectedSubject?.chapters.find((chapter) => chapter.chapter === activeChapter) ?? null;
  const filterPanelProps: FilterPanelProps = {
    quickScope,
    masteryStatus,
    textStatus,
    keyword,
    showSearch: false,
    onQuickScopeChange: (scope) => {
      setQuickScope(scope);
      setSelectedIds([]);
    },
    onMasteryStatusChange: (status) => {
      setMasteryStatus(status);
      setSelectedIds([]);
    },
    onTextStatusChange: (status) => {
      setTextStatus(status);
      setSelectedIds([]);
    },
    onKeywordChange: (value) => {
      setKeyword(value);
      setSelectedIds([]);
    },
  };

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
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
    <MobilePageShell className="bg-[#f4f0ff]">
      <StudyPageHeader
        title="错题库目录"
        subtitle="按科目、章节、题目三层浏览。数学题会拆到高数、线代和概率统计，找题更快。"
      />

      <MobileSection>
        <StudyCard>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-[#211536]">专项复盘</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                按章节或错因主动开一轮闪卡，不影响今日复习入口。
              </p>
            </div>
            <Link
              href="/practice"
              className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-[#5b2bd6] px-3 text-xs font-black text-white"
            >
              去复盘
            </Link>
          </div>
        </StudyCard>
      </MobileSection>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取错题库..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-[#e4dcff]">
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
        {!selectedSubject ? (
          <SubjectDirectory
            directory={directory}
            onSelectSubject={(subject) => {
              setActiveSubject(subject);
              setActiveChapter("");
            }}
          />
        ) : null}
        {selectedSubject && !selectedChapter ? (
          <ChapterDirectory
            subject={selectedSubject}
            filterPanelProps={filterPanelProps}
            onBack={() => {
              setActiveSubject("");
              setActiveChapter("");
              setSelectedIds([]);
            }}
            onSelectChapter={setActiveChapter}
          />
        ) : null}
        {selectedSubject && selectedChapter ? (
          <QuestionDirectory
            subject={selectedSubject}
            chapter={selectedChapter}
            selectedIds={selectedIds}
            showBatchTools={showBatchTools}
            filterPanelProps={filterPanelProps}
            onBack={() => setActiveChapter("")}
            onSelect={toggleSelected}
            onToggleBatchTools={() => {
              setShowBatchTools((current) => !current);
              setSelectedIds([]);
            }}
            onSelectAll={() => setSelectedIds(selectedChapter.questions.map((question) => question.id))}
            onClearSelected={() => setSelectedIds([])}
            onBatchDelete={handleBatchDelete}
            onBatchAction={handleBatchAction}
            isBatchProcessing={isBatchProcessing}
            dueTodayIds={dueTodayIds}
          />
        ) : null}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}

function FilterPanel({
  quickScope,
  masteryStatus,
  textStatus,
  keyword,
  showSearch,
  searchPlaceholder = "搜索题目文字、知识点、章节或备注",
  onQuickScopeChange,
  onMasteryStatusChange,
  onTextStatusChange,
  onKeywordChange,
}: FilterPanelProps) {
  return (
    <details className="group rounded-lg border border-[#d9cffd] bg-white/80 p-2">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-xs font-black text-[#4f23b6] marker:hidden">
        <span>{showSearch ? "搜索 / 筛选" : "筛选"}</span>
        <span className="text-[11px] font-bold text-slate-400 group-open:hidden">展开</span>
        <span className="hidden text-[11px] font-bold text-slate-400 group-open:inline">收起</span>
      </summary>
      <div className="mt-2 space-y-2">
        {showSearch ? (
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-[#d9cffd] bg-white px-3 text-sm font-semibold text-[#211536] outline-none focus:border-[#5b2bd6]"
            placeholder={searchPlaceholder}
          />
        ) : null}
        <div className="grid grid-cols-4 rounded-lg bg-[#f8f5ff] p-1">
          {[
            { key: "all", label: "全部" },
            { key: "inbox", label: "待整理" },
            { key: "needs_fix", label: "需修正" },
            { key: "uncategorized", label: "未分类" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onQuickScopeChange(item.key as QuickScope)}
              className={`min-h-8 rounded-md px-1 text-[11px] font-black ${
                quickScope === item.key
                  ? "bg-white text-[#4f23b6] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={masteryStatus}
            onChange={(event) => onMasteryStatusChange(event.target.value as MasteryStatus | "全部")}
            className="min-h-10 w-full rounded-lg border border-[#d9cffd] bg-white px-3 text-sm font-semibold text-[#211536] outline-none focus:border-[#5b2bd6]"
          >
            {masteryFilters.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={textStatus}
            onChange={(event) => onTextStatusChange(event.target.value as QuestionTextStatus | "全部")}
            className="min-h-10 w-full rounded-lg border border-[#d9cffd] bg-white px-3 text-sm font-semibold text-[#211536] outline-none focus:border-[#5b2bd6]"
          >
            {textStatusFilters.map((item) => (
              <option key={item} value={item}>
                {item === "全部" ? item : getQuestionTextStatusLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </details>
  );
}

function SubjectDirectory({
  directory,
  onSelectSubject,
}: {
  directory: QuestionSubjectDirectory<QuestionWithImage>[];
  onSelectSubject: (subject: string) => void;
}) {
  return (
    <section>
      <SectionHeader
        title="科目目录"
        subtitle="默认先从科目入口进入，再看章节和题目。"
        action={<StudyBadge tone="purple">{directory.length} 科目</StudyBadge>}
      />
      <div className="grid gap-3">
        {directory.map((subject) => (
          <button
            key={subject.subject}
            type="button"
            onClick={() => onSelectSubject(subject.subject)}
            className="text-left"
          >
            <StudyCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-black text-[#211536]">{subject.subject}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    今日待复习 {subject.dueTodayCount} · 困难 {subject.hardCount} · 需处理 {subject.needsAttentionCount}
                  </p>
                </div>
                <StudyBadge tone={subject.needsAttentionCount > 0 ? "amber" : "green"}>
                  {subject.totalCount} 题
                </StudyBadge>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={subject.masteryRate}
                  label="掌握进度"
                  helper={`${subject.masteryRate}%`}
                />
              </div>
            </StudyCard>
          </button>
        ))}
      </div>
    </section>
  );
}

function ChapterDirectory({
  subject,
  filterPanelProps,
  onBack,
  onSelectChapter,
}: {
  subject: QuestionSubjectDirectory<QuestionWithImage>;
  filterPanelProps: FilterPanelProps;
  onBack: () => void;
  onSelectChapter: (chapter: string) => void;
}) {
  const visibleChapters = subject.chapters.filter(
    (chapter) => chapter.chapter !== "待整理 / 未分类" || chapter.totalCount > 0,
  );

  return (
    <section>
      <SectionHeader
        title={subject.subject}
        subtitle="选择章节后进入题目列表。"
        action={
          <button
            type="button"
            onClick={onBack}
            className="min-h-9 rounded-lg border border-[#d9cffd] bg-white px-3 text-xs font-black text-[#4f23b6]"
          >
            返回科目
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <SprintStatCard label="错题数量" value={subject.totalCount} />
        <SprintStatCard label="需要处理" value={subject.needsAttentionCount} tone="amber" />
      </div>
      <div className="mt-3">
        <FilterPanel {...filterPanelProps} showSearch={false} />
      </div>
      <div className="mt-4 grid gap-3">
        {visibleChapters.map((chapter) => (
          <button
            key={chapter.chapter}
            type="button"
            onClick={() => onSelectChapter(chapter.chapter)}
            className="text-left"
          >
            <StudyCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-[#211536]">{chapter.chapter}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {chapter.totalCount} 题 · 困难 {chapter.hardCount} · 已掌握 {chapter.masteredCount}
                  </p>
                </div>
                {chapter.needsAttentionCount > 0 ? (
                  <span className="shrink-0 pt-0.5 text-[11px] font-semibold text-slate-400">
                    待处理 {chapter.needsAttentionCount}
                  </span>
                ) : null}
              </div>
            </StudyCard>
          </button>
        ))}
      </div>
    </section>
  );
}

function QuestionDirectory({
  subject,
  chapter,
  selectedIds,
  showBatchTools,
  filterPanelProps,
  onBack,
  onSelect,
  onToggleBatchTools,
  onSelectAll,
  onClearSelected,
  onBatchDelete,
  onBatchAction,
  isBatchProcessing,
  dueTodayIds,
}: {
  subject: QuestionSubjectDirectory<QuestionWithImage>;
  chapter: QuestionChapterGroup<QuestionWithImage>;
  selectedIds: string[];
  showBatchTools: boolean;
  filterPanelProps: FilterPanelProps;
  onBack: () => void;
  onSelect: (id: string) => void;
  onToggleBatchTools: () => void;
  onSelectAll: () => void;
  onClearSelected: () => void;
  onBatchDelete: () => void;
  onBatchAction: (action: "mastered" | "needs_fix" | "sprint") => void;
  isBatchProcessing: boolean;
  dueTodayIds: Set<string>;
}) {
  return (
    <section>
      <SectionHeader
        title={chapter.chapter}
        subtitle={`${subject.subject} · ${chapter.totalCount} 题`}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleBatchTools}
              className="min-h-9 rounded-lg border border-[#d9cffd] bg-white px-3 text-xs font-black text-[#4f23b6]"
            >
              {showBatchTools ? "退出选择" : "选择题目"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="min-h-9 rounded-lg border border-[#d9cffd] bg-white px-3 text-xs font-black text-[#4f23b6]"
            >
              返回章节
            </button>
          </div>
        }
      />
      <div className="mb-3 space-y-2">
        <input
          value={filterPanelProps.keyword}
          onChange={(event) => filterPanelProps.onKeywordChange(event.target.value)}
          className="min-h-10 w-full rounded-lg border border-[#d9cffd] bg-white px-3 text-sm font-semibold text-[#211536] outline-none focus:border-[#5b2bd6]"
          placeholder="搜索本章题目"
        />
        <FilterPanel {...filterPanelProps} showSearch={false} />
        <p className="rounded-lg bg-[#f8f5ff] p-3 text-xs leading-5 text-slate-600 ring-1 ring-[#e4dcff]">
          默认按困难优先排序，同难度内优先显示需要处理和高风险题。
        </p>
      </div>
      {selectedIds.length > 0 ? (
        <StudyCard className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-[#211536]">已选择 {selectedIds.length} 题</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="min-h-9 rounded-lg bg-[#ede7ff] px-3 text-xs font-black text-[#4f23b6]"
              >
                全选本章
              </button>
              <button
                type="button"
                onClick={onClearSelected}
                className="min-h-9 rounded-lg bg-[#ede7ff] px-3 text-xs font-black text-[#4f23b6]"
              >
                取消选择
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={onBatchDelete}
              disabled={isBatchProcessing}
              className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              软删除
            </button>
            <button
              type="button"
              onClick={() => onBatchAction("mastered")}
              disabled={isBatchProcessing}
              className="min-h-11 rounded-lg bg-[#5b2bd6] px-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              标记已掌握
            </button>
            <button
              type="button"
              onClick={() => onBatchAction("needs_fix")}
              disabled={isBatchProcessing}
              className="min-h-11 rounded-lg bg-amber-100 px-3 text-sm font-semibold text-amber-800 disabled:text-slate-400"
            >
              标记需修正
            </button>
            <button
              type="button"
              onClick={() => onBatchAction("sprint")}
              disabled={isBatchProcessing}
              className="min-h-11 rounded-lg bg-[#211536] px-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              加入冲刺
            </button>
          </div>
        </StudyCard>
      ) : null}
      <div className="grid gap-3">
        {chapter.questions.map((question) => {
          const questionDisplay = getQuestionStemAndChoices(question.question_text, question.choices);
          const needsFix =
            question.question_text_status === "needs_fix" || question.answer_status === "needs_fix";
          const badges = buildQuestionBadges(question, {
            reviewStatus: dueTodayIds.has(question.id) ? "due_today" : "ready",
            questionKind: getQuestionKind(questionDisplay.choices.length),
          });

          return (
            <StudyCard key={question.id}>
              <div className="flex gap-3">
                {showBatchTools ? (
                  <label className="flex shrink-0 items-start pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(question.id)}
                      onChange={() => onSelect(question.id)}
                      className="h-5 w-5 rounded border-[#d9cffd]"
                      aria-label={`选择 ${question.knowledge_point ?? question.chapter ?? "错题"}`}
                    />
                  </label>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="ml-auto shrink-0 text-[11px] font-bold text-slate-400">
                      {formatDate(question.created_at)}
                    </span>
                  </div>
                  <MathText
                    text={questionDisplay.questionText || question.user_note}
                    fallback="暂无题目摘要，进入详情后补充题干或卡点。"
                    compact
                    className="line-clamp-4 text-base font-black leading-7 text-[#211536]"
                  />
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    <MathText
                      text={question.knowledge_point ?? question.chapter}
                      fallback="待识别知识点"
                      compact
                      className="text-xs leading-5 text-slate-500"
                    />
                    <p>
                      原始章节：{question.chapter ?? "未标章节"}
                      {needsFix ? " · 需要修正" : question.needs_manual_check ? " · 需要核对" : ""}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {badges.map((badge) => (
                      <StudyBadge key={badge.label} tone={badge.tone}>
                        {badge.label}
                      </StudyBadge>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Link
                      href={`/questions/${question.id}`}
                      className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-[#ede7ff] px-3 text-xs font-black text-[#4f23b6]"
                    >
                      进入详情
                    </Link>
                  </div>
                </div>
              </div>
            </StudyCard>
          );
        })}
      </div>
    </section>
  );
}
