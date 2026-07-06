"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { getQuestionSourceInfo } from "@/lib/questions/source-info";

type CountItem = {
  label: string;
  count: number;
};

type SubjectOverview = {
  subject: string;
  total: number;
  choiceCount: number;
  answeredCount: number;
  chapters: string[];
  years: string[];
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function topCounts(values: string[], limit = 6): CountItem[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"))
    .slice(0, limit);
}

function uniqueSorted(values: string[], limit = 6) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN")).slice(0, limit);
}

function extractYear(question: QuestionWithImage) {
  const info = getQuestionSourceInfo(question);
  const sourceText = [info.raw, info.name, info.paper, info.volume].filter(Boolean).join(" ");
  return sourceText.match(/20\d{2}/)?.[0] ?? "";
}

function buildSubjectOverview(questions: QuestionWithImage[]): SubjectOverview[] {
  const groups = new Map<string, QuestionWithImage[]>();

  for (const question of questions) {
    const list = groups.get(question.subject) ?? [];
    list.push(question);
    groups.set(question.subject, list);
  }

  return Array.from(groups, ([subject, items]) => ({
    subject,
    total: items.length,
    choiceCount: items.filter((item) => (item.choices?.length ?? 0) > 0).length,
    answeredCount: items.filter((item) => hasText(item.standard_answer) || hasText(item.answer_explanation)).length,
    chapters: uniqueSorted(items.map((item) => item.chapter ?? "未分类")),
    years: uniqueSorted(items.map(extractYear).filter(Boolean)),
  })).sort((a, b) => b.total - a.total || a.subject.localeCompare(b.subject, "zh-CN"));
}

function buildSourceDistribution(questions: QuestionWithImage[]) {
  return topCounts(
    questions.map((question) => {
      const sourceInfo = getQuestionSourceInfo(question);
      return sourceInfo.name || sourceInfo.raw || "未标来源";
    }),
  );
}

export default function ExamOverviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看真题总览。");
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
          setMessage(items.length === 0 ? "还没有可统计的题卡，先导入 408 真题或练习题。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "真题总览读取失败。");
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

  const subjectOverview = useMemo(() => buildSubjectOverview(questions), [questions]);
  const sourceDistribution = useMemo(() => buildSourceDistribution(questions), [questions]);
  const chapterCoverage = useMemo(() => topCounts(questions.map((item) => item.chapter ?? "未分类")), [questions]);
  const choiceCount = useMemo(() => questions.filter((item) => (item.choices?.length ?? 0) > 0).length, [questions]);
  const answeredCount = useMemo(
    () => questions.filter((item) => hasText(item.standard_answer) || hasText(item.answer_explanation)).length,
    [questions],
  );

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 错题复盘"
        title="真题总览"
        subtitle="按科目、章节、题源和年份线索汇总现有题库；没有新增表，数据直接来自你的错题卡。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="题卡" value={questions.length} helper="总量" />
          <SprintStatCard label="选择题" value={choiceCount} helper="可直接刷" tone="green" />
          <SprintStatCard label="有解析" value={answeredCount} helper="可复盘" tone="cyan" />
        </div>
      </MobileSection>

      <MobileSection>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/questions"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
          >
            查看题库
          </Link>
          <Link
            href="/practice?mode=exam408-choice"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
          >
            刷 408 选择题
          </Link>
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
          <LoadingState label="正在读取真题总览..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader title="科目覆盖" subtitle="先看四门 408 和数学题卡在哪些科目上有积累。" />
        <div className="grid gap-3">
          {subjectOverview.map((item) => (
            <StudyCard key={item.subject} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-950">{item.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.total} 题 / {item.choiceCount} 道选择题 / {item.answeredCount} 题有解析
                  </p>
                </div>
                <StudyBadge tone="green">{item.chapters.length} 章</StudyBadge>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.chapters.map((chapter) => (
                  <StudyBadge key={chapter} tone="slate">
                    {chapter}
                  </StudyBadge>
                ))}
                {item.years.map((year) => (
                  <StudyBadge key={year} tone="amber">
                    {year}
                  </StudyBadge>
                ))}
              </div>
            </StudyCard>
          ))}

          {!isLoading && subjectOverview.length === 0 ? (
            <StudyCard>
              <p className="text-sm font-black text-slate-950">还没有真题数据</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                导入时填好 source_info，后续这里会自动聚合题源、卷套、年份和章节。
              </p>
              <Link
                href="/import"
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
              >
                去导入
              </Link>
            </StudyCard>
          ) : null}
        </div>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="章节覆盖" subtitle="按章节统计题量，辅助决定下一轮刷题范围。" />
        <StudyCard className="space-y-3">
          {chapterCoverage.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="text-sm font-black text-slate-800">{item.label}</span>
              <span className="text-sm font-black text-blue-700">{item.count} 题</span>
            </div>
          ))}
          {!isLoading && chapterCoverage.length === 0 ? (
            <p className="text-sm leading-6 text-slate-600">暂无章节统计。</p>
          ) : null}
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="来源分布" subtitle="按 source_info 汇总真题、练习册或导入来源。" />
        <StudyCard className="space-y-3">
          {sourceDistribution.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="text-sm font-black text-slate-800">{item.label}</span>
              <span className="text-sm font-black text-blue-700">{item.count} 题</span>
            </div>
          ))}
          {!isLoading && sourceDistribution.length === 0 ? (
            <p className="text-sm leading-6 text-slate-600">暂无来源统计。</p>
          ) : null}
        </StudyCard>
      </MobileSection>
    </MobilePageShell>
  );
}
