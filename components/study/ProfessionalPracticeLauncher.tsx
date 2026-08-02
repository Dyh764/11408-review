"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filterPracticeQuestions,
  type PracticeQuestion,
  type PracticeSourceRange,
} from "@/lib/practice/practice-catalog";
import {
  practiceAnswerModeOptions,
  type PracticeAnswerMode,
} from "@/lib/practice/practice-mode";

const subjectOptions = ["数据结构", "计算机组成原理", "操作系统", "计算机网络"];
const difficultyOptions = ["基础", "中等", "较难", "压轴"];
const sourceOptions: Array<{ key: PracticeSourceRange; label: string }> = [
  { key: "all", label: "全部题源" },
  { key: "book", label: "王道书配套题" },
  { key: "exam", label: "历年真题" },
  { key: "supplement", label: "补充习题" },
];

function buildPracticeHref({
  answerMode,
  sourceRange,
  subject,
  difficulty,
}: {
  answerMode: PracticeAnswerMode;
  sourceRange: PracticeSourceRange;
  subject: string;
  difficulty: string;
}) {
  const params = new URLSearchParams({
    mode: "exam408-choice",
    answerMode,
  });

  if (sourceRange !== "all") {
    params.set("sourceRange", sourceRange);
  }
  if (subject) {
    params.set("subject", subject);
  }
  if (difficulty) {
    params.set("difficulty", difficulty);
  }

  return `/practice?${params.toString()}`;
}

export function ProfessionalPracticeLauncher({
  questions,
  loading = false,
  className = "",
}: {
  questions: PracticeQuestion[];
  loading?: boolean;
  className?: string;
}) {
  const [answerMode, setAnswerMode] =
    useState<Exclude<PracticeAnswerMode, "standard">>("editable");
  const [sourceRange, setSourceRange] = useState<PracticeSourceRange>("all");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const modeCounts = useMemo(
    () =>
      Object.fromEntries(
        practiceAnswerModeOptions.map((option) => [
          option.key,
          filterPracticeQuestions(questions, {
            type: "exam408-choice",
            answerMode: option.key,
            sourceRange,
            subject: subject || undefined,
            difficulty: difficulty || undefined,
          }).length,
        ]),
      ) as Record<Exclude<PracticeAnswerMode, "standard">, number>,
    [difficulty, questions, sourceRange, subject],
  );
  const availableCount = modeCounts[answerMode];
  const availableModeCount = practiceAnswerModeOptions.filter(
    (option) => modeCounts[option.key] > 0,
  ).length;
  const activeMode = practiceAnswerModeOptions.find(
    (option) => option.key === answerMode,
  );
  const practiceHref = buildPracticeHref({
    answerMode,
    sourceRange,
    subject,
    difficulty,
  });

  return (
    <section
      data-testid="professional-practice-section"
      className={`rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)] md:p-5 ${className}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-emerald-600">408 专业刷题</p>
          <h2 className="mt-1 text-xl font-black tracking-normal text-slate-950">
            选择一种刷法，直接开始
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            已自动排除缺题干、缺答案和缺原图的题。
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
            loading
              ? "bg-slate-100 text-slate-500"
              : availableModeCount > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {loading ? "检测中" : `${availableModeCount}/4 可用`}
        </span>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {practiceAnswerModeOptions.map((option) => {
          const selected = answerMode === option.key;
          const count = modeCounts[option.key];

          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setAnswerMode(option.key)}
              className={`min-h-[66px] rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200"
              }`}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span
                className={`mt-1 block text-xs font-bold ${
                  selected ? "text-white/75" : count > 0 ? "text-emerald-700" : "text-slate-400"
                }`}
              >
                {loading ? "正在检测" : count > 0 ? `${count} 题可用` : "暂无可用题"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        <label className="block">
          <span className="sr-only">专业刷题题源</span>
          <select
            aria-label="专业刷题题源"
            value={sourceRange}
            onChange={(event) =>
              setSourceRange(event.target.value as PracticeSourceRange)
            }
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
          >
            {sourceOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">专业刷题科目</span>
          <select
            aria-label="专业刷题科目"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="">全部科目</option>
            {subjectOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block md:col-span-1">
          <span className="sr-only">专业刷题难度</span>
          <select
            aria-label="专业刷题难度"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="">全部难度</option>
            {difficultyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-950 p-3.5 text-white md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black">
            {activeMode?.label} · {availableCount} 题
          </p>
          <p className="mt-1 text-xs leading-5 text-white/65">
            {activeMode?.description}
          </p>
        </div>
        {availableCount > 0 && !loading ? (
          <Link
            href={practiceHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-black text-white"
          >
            开始刷题
          </Link>
        ) : (
          <span className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white/10 px-5 text-sm font-black text-white/45">
            当前条件不可用
          </span>
        )}
      </div>

    </section>
  );
}
