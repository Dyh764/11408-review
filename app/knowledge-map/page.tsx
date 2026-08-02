"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LoadingState,
  MobilePageShell,
  MobileSection,
} from "@/components/mobile/primitives";
import {
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyPageHeader,
} from "@/components/study/study-ui";
import {
  buildQuestionBankSubjectInsights,
  extractQuestionBankExamYear,
} from "@/lib/question-bank/question-bank-insights";
import {
  fetchCurrentUserQuestions,
  type QuestionWithImage,
} from "@/lib/questions";
import { createClient } from "@/lib/supabase/client";

type QuestionRange = "all" | "exam" | "choice";

const rangeOptions: Array<{
  key: QuestionRange;
  label: string;
  description: string;
}> = [
  { key: "all", label: "全部题", description: "当前账号题库" },
  { key: "exam", label: "历年真题", description: "题源带年份" },
  { key: "choice", label: "选择题", description: "可进入刷题" },
];

function filterQuestions(
  questions: QuestionWithImage[],
  range: QuestionRange,
) {
  if (range === "exam") {
    return questions.filter((question) =>
      Boolean(extractQuestionBankExamYear(question)),
    );
  }

  if (range === "choice") {
    return questions.filter((question) => (question.choices?.length ?? 0) > 0);
  }

  return questions;
}

function FrequencyStars({ level }: { level: number }) {
  return (
    <span
      aria-label={`题库考频 ${level} 星`}
      className="tracking-[0.12em] text-amber-500"
    >
      {[0, 1, 2].map((index) => (index < level ? "★" : "☆")).join("")}
    </span>
  );
}

export default function KnowledgeMapPage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [range, setRange] = useState<QuestionRange>("all");
  const [message, setMessage] = useState(
    supabase ? "" : "当前未连接错题数据，暂时无法查看考点刷题。",
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
          setMessage(
            items.length === 0
              ? "还没有可统计的 408 题卡，先导入题目后再按考点刷题。"
              : "",
          );
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(
            error instanceof Error ? error.message : "读取考点数据失败。",
          );
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

  const visibleQuestions = useMemo(
    () => filterQuestions(questions, range),
    [questions, range],
  );
  const subjectInsights = useMemo(
    () => buildQuestionBankSubjectInsights(visibleQuestions),
    [visibleQuestions],
  );
  const visibleSubjectCount = subjectInsights.filter(
    (subject) => subject.total > 0,
  ).length;
  const choiceCount = visibleQuestions.filter(
    (question) => (question.choices?.length ?? 0) > 0,
  ).length;
  const examYears = Array.from(
    new Set(questions.map(extractQuestionBankExamYear).filter(Boolean)),
  );
  const maxSubjectTotal = Math.max(
    1,
    ...subjectInsights.map((subject) => subject.total),
  );

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 题库"
        title="考点刷题与考频"
        subtitle="按你的真实题库统计科目、章节、掌握进度和历年真题频次；考频只认已导入且带年份的题源。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard
            label="题卡"
            value={visibleQuestions.length}
            helper="当前范围"
          />
          <SprintStatCard
            label="科目"
            value={visibleSubjectCount}
            helper="有题数据"
            tone="green"
          />
          <SprintStatCard
            label="真题年份"
            value={examYears.length}
            helper="题源已标注"
            tone="amber"
          />
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader
          title="题源范围"
          subtitle="对应视频里的王道教材、408 真题和补充习题筛选；这里按现有可核实字段筛选。"
        />
        <div className="grid grid-cols-3 gap-2">
          {rangeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              className={`min-h-14 rounded-lg px-2 py-2 text-center ${
                range === option.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-100"
              }`}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span className="mt-0.5 block text-[11px] opacity-75">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </MobileSection>

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取题库考点..." />
        </MobileSection>
      ) : null}

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
            {message}
          </p>
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader
          title="四科题量分布"
          subtitle="条形长度按当前筛选范围内的题量计算。"
        />
        <StudyCard className="space-y-4">
          {subjectInsights.map((subject) => (
            <div key={subject.subject}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-black text-slate-800">
                  {subject.subject}
                </span>
                <span className="font-black text-blue-700">
                  {subject.total} 题
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.round(
                      (subject.total / maxSubjectTotal) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <SectionHeader
          title="大纲章节"
          subtitle="展开科目后可看题量、已掌握比例、题库考频和难度分布。"
        />
        <div className="grid gap-3">
          {subjectInsights.map((subject) => (
            <StudyCard key={subject.subject} className="p-0">
              <details className="group" open={subject.total > 0}>
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-base font-black text-slate-950">
                      {subject.subject}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {subject.total} 题 · {subject.choiceCount} 道可刷 · 已掌握{" "}
                      {subject.masteryPercent}%
                    </span>
                  </span>
                  <StudyBadge tone={subject.total > 0 ? "green" : "slate"}>
                    {subject.chapters.length} 章
                  </StudyBadge>
                </summary>

                <div className="border-t border-slate-100 p-4 pt-3">
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${subject.masteryPercent}%` }}
                    />
                  </div>

                  <div className="grid gap-3">
                    {subject.chapters.map((chapter) => {
                      const content = (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-black text-slate-900">
                              {chapter.chapter}
                            </span>
                            <span className="shrink-0 text-xs font-black text-blue-700">
                              {chapter.masteredCount}/{chapter.total}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <FrequencyStars level={chapter.frequencyLevel} />
                            <span>真题 {chapter.examQuestionCount} 道</span>
                            <span>
                              {chapter.examYears.length > 0
                                ? `${chapter.examYears.join("、")} 年`
                                : "年份未标注"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(chapter.difficultyCounts).map(
                              ([difficulty, count]) => (
                                <StudyBadge key={difficulty} tone="slate">
                                  {difficulty} {count}
                                </StudyBadge>
                              ),
                            )}
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${chapter.masteryPercent}%` }}
                            />
                          </div>
                        </>
                      );

                      return chapter.choiceCount > 0 ? (
                        <Link
                          key={chapter.chapter}
                          href={`/practice?mode=exam408-choice&subject=${encodeURIComponent(
                            subject.subject,
                          )}&chapter=${encodeURIComponent(chapter.chapter)}`}
                          className="block rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100 active:scale-[0.99]"
                        >
                          {content}
                          <p className="mt-2 text-xs font-black text-blue-700">
                            开始刷本章 {chapter.choiceCount} 道选择题 →
                          </p>
                        </Link>
                      ) : (
                        <div
                          key={chapter.chapter}
                          className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100"
                        >
                          {content}
                          <p className="mt-2 text-xs text-slate-400">
                            本章暂无已拆选项的可刷题
                          </p>
                        </div>
                      );
                    })}

                    {!isLoading && subject.chapters.length === 0 ? (
                      <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-500">
                        当前范围没有该科目的题卡。
                      </p>
                    ) : null}
                  </div>
                </div>
              </details>
            </StudyCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <StudyCard>
          <p className="text-sm font-black text-slate-950">数据说明</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            星级按当前章节覆盖的真题年份数计算，最多 3 星；它表示你的题库覆盖，不代表官方命题概率。当前范围共有{" "}
            {choiceCount} 道可刷选择题。
          </p>
          <div className="mt-3">
            <Link
              href="/practice"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-black text-white"
            >
              返回刷题
            </Link>
          </div>
        </StudyCard>
      </MobileSection>
    </MobilePageShell>
  );
}
