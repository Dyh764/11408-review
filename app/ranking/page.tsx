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

type RankItem = {
  label: string;
  total: number;
  passed: number;
  passRate: number;
};

function isPassed(question: QuestionWithImage) {
  return question.mastery_status === "完全掌握" || question.review_priority === "low";
}

function rankByGroup(questions: QuestionWithImage[], groupBy: (question: QuestionWithImage) => string) {
  const groups = new Map<string, QuestionWithImage[]>();

  for (const question of questions) {
    const key = groupBy(question).trim() || "未分类";
    const list = groups.get(key) ?? [];
    list.push(question);
    groups.set(key, list);
  }

  return Array.from(groups, ([label, items]) => {
    const passed = items.filter(isPassed).length;
    const passRate = items.length > 0 ? Math.round((passed / items.length) * 100) : 0;

    return {
      label,
      total: items.length,
      passed,
      passRate,
    };
  }).sort((a, b) => b.passRate - a.passRate || b.total - a.total || a.label.localeCompare(b.label, "zh-CN"));
}

function totalPassRate(questions: QuestionWithImage[]) {
  if (questions.length === 0) return 0;
  return Math.round((questions.filter(isPassed).length / questions.length) * 100);
}

function RankingList({ items, empty }: { items: RankItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-600">{empty}</p>;
  }

  return (
    <div className="grid gap-3">
      {items.slice(0, 8).map((item, index) => (
        <div key={item.label} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <StudyBadge tone={index < 3 ? "green" : "slate"}>第 {index + 1}</StudyBadge>
                <StudyBadge tone="cyan">通关率 {item.passRate}%</StudyBadge>
              </div>
              <p className="mt-2 truncate text-sm font-black text-slate-950">{item.label}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-blue-700">{item.total}</p>
              <p className="text-xs text-slate-500">刷题量</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.passRate}%` }} />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            已掌握 {item.passed} 题 / 总刷题量 {item.total} 题
          </p>
        </div>
      ))}
    </div>
  );
}

export default function RankingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看学习排行榜。");
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
          setMessage(items.length === 0 ? "还没有可生成排行榜的题卡，先导入错题后再查看。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "学习排行榜读取失败。");
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

  const subjectRanking = useMemo(() => rankByGroup(questions, (question) => question.subject), [questions]);
  const chapterRanking = useMemo(
    () => rankByGroup(questions, (question) => question.chapter ?? "未分类章节"),
    [questions],
  );
  const passRate = useMemo(() => totalPassRate(questions), [questions]);
  const masteredCount = useMemo(() => questions.filter(isPassed).length, [questions]);

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="学习排行榜"
        subtitle="参考 408os 的院校榜、个人榜和我的排名，但当前只使用你的题卡数据，不伪造全站排名。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="通关率" value={`${passRate}%`} helper="已掌握占比" tone="green" />
          <SprintStatCard label="刷题量" value={questions.length} helper="当前题卡" />
          <SprintStatCard label="已掌握" value={masteredCount} helper="我的排名依据" tone="cyan" />
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
          <LoadingState label="正在读取学习排行榜..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <StudyCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <StudyBadge tone="green">我的排名</StudyBadge>
            <StudyBadge tone="cyan">个人榜</StudyBadge>
            <StudyBadge tone="slate">院校榜</StudyBadge>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            这里的“院校榜”先映射成科目榜，“个人榜”映射成章节榜。等以后有用户资料、目标院校和全站刷题记录，再接真实跨用户排名。
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/practice?mode=exam408-choice"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
            >
              继续刷题
            </Link>
            <Link
              href="/questions"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
            >
              查看题库
            </Link>
          </div>
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="院校榜" subtitle="当前账号内按科目模拟院校榜，看哪个科目通关率更高。" />
        <StudyCard>
          <RankingList items={subjectRanking} empty="暂无院校榜数据。" />
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="个人榜" subtitle="当前账号内按章节模拟个人榜，看哪些章节刷题量和掌握率更稳定。" />
        <StudyCard>
          <RankingList items={chapterRanking} empty="暂无个人榜数据。" />
        </StudyCard>
      </MobileSection>
    </MobilePageShell>
  );
}
