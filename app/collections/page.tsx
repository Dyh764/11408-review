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
import { buildCollectionPrintHtml } from "@/lib/collections/collection-print";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserQuestions, type QuestionWithImage } from "@/lib/questions";

type CollectionKey = "weak" | "inbox" | "mastered" | "recent" | "choice408";

type CollectionGroup = {
  key: CollectionKey;
  title: string;
  description: string;
  href: string;
  items: QuestionWithImage[];
  tone: "green" | "amber" | "cyan" | "slate";
};

const examSubjects = ["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"];

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function isWeakQuestion(question: QuestionWithImage) {
  const mastery = question.mastery_status?.trim() ?? "";

  return (
    question.review_priority === "high" ||
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    mastery.includes("没思路") ||
    mastery.includes("有一点思路") ||
    mastery.includes("不稳") ||
    mastery.includes("卡住")
  );
}

function needsOrganizing(question: QuestionWithImage) {
  return (
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    question.answer_status === "ai_unverified" ||
    !hasText(question.question_text) ||
    !hasText(question.standard_answer)
  );
}

function isMastered(question: QuestionWithImage) {
  return question.mastery_status === "完全掌握" || question.review_priority === "low";
}

function isChoice408(question: QuestionWithImage) {
  return examSubjects.includes(question.subject) && (question.choices?.length ?? 0) > 0;
}

function sortQuestions(questions: QuestionWithImage[]) {
  return [...questions].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function collectionPreviewTitle(question: QuestionWithImage) {
  return question.knowledge_point?.trim() || question.chapter?.trim() || "待整理题卡";
}

function buildCollections(questions: QuestionWithImage[]): CollectionGroup[] {
  const sorted = sortQuestions(questions);

  return [
    {
      key: "weak",
      title: "薄弱复习",
      description: "合并不会、不稳、需要人工核对和薄弱章节中的题。",
      href: "/questions?scope=weak",
      items: sorted.filter(isWeakQuestion),
      tone: "amber",
    },
    {
      key: "inbox",
      title: "待整理",
      description: "集中修补缺题干、缺答案、AI 未核对或状态异常的题。",
      href: "/questions?scope=inbox",
      items: sorted.filter(needsOrganizing),
      tone: "cyan",
    },
    {
      key: "mastered",
      title: "已掌握",
      description: "复盘后标记为掌握或低优先级的题，用来回看稳定区。",
      href: "/questions",
      items: sorted.filter(isMastered),
      tone: "green",
    },
    {
      key: "recent",
      title: "最近错题",
      description: "按最近导入或最近维护顺序快速回到新题。",
      href: "/questions?scope=recent",
      items: sorted.slice(0, 20),
      tone: "slate",
    },
    {
      key: "choice408",
      title: "408 选择题",
      description: "直接进入四门 408 选择题刷题流，提交后先看解析再点下一题。",
      href: "/practice?mode=exam408-choice",
      items: sorted.filter(isChoice408),
      tone: "green",
    },
  ];
}

export default function CollectionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "当前未连接错题数据，暂时无法查看题目分组。");
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [activeKey, setActiveKey] = useState<CollectionKey>("weak");
  const [printMessage, setPrintMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    fetchCurrentUserQuestions(supabase)
      .then((items) => {
        if (isActive) {
          setQuestions(items);
          setMessage(items.length === 0 ? "还没有可归类的题目，先导入错题后再查看分组。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "题目分组读取失败。");
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

  const collections = useMemo(() => buildCollections(questions), [questions]);
  const activeCollection = collections.find((item) => item.key === activeKey) ?? collections[0];
  const masteredCount = useMemo(() => questions.filter(isMastered).length, [questions]);

  function printActiveCollection() {
    if (activeCollection.items.length === 0) {
      setPrintMessage("当前题本是空的，暂时没有可打印内容。");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "popup,width=960,height=760",
    );

    if (!printWindow) {
      setPrintMessage("浏览器拦截了打印窗口，请允许本站弹出窗口后重试。");
      return;
    }

    printWindow.addEventListener(
      "load",
      () => {
        printWindow.focus();
        printWindow.print();
      },
      { once: true },
    );
    printWindow.document.open();
    printWindow.document.write(
      buildCollectionPrintHtml({
        title: `11408 复盘题单 · ${activeCollection.title}`,
        questions: activeCollection.items,
      }),
    );
    printWindow.document.close();
    setPrintMessage("已生成打印题单；在打印窗口中选择“另存为 PDF”即可导出。");
  }

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 考试平台"
        title="题目分组与导出"
        subtitle="按掌握度自动归类题本，并支持生成“题目在前、答案在后”的打印版或 PDF。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="题卡" value={questions.length} helper="错题库总量" />
          <SprintStatCard
            label="不熟"
            value={collections.find((item) => item.key === "weak")?.items.length ?? 0}
            helper="优先处理"
            tone="amber"
          />
          <SprintStatCard label="掌握" value={masteredCount} helper="稳定回看" tone="green" />
        </div>
      </MobileSection>

      {message ? (
        <MobileSection>
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
            {message}
          </p>
        </MobileSection>
      ) : null}

      {printMessage ? (
        <MobileSection>
          <p className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-800 ring-1 ring-blue-100">
            {printMessage}
          </p>
        </MobileSection>
      ) : null}

      {isLoading ? (
        <MobileSection>
          <LoadingState label="正在读取题目分组..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader title="自动分组" subtitle="系统按当前题目状态自动归类，这不是手动收藏。" />
        <div className="grid gap-2">
          {collections.map((collection) => (
            <button
              key={collection.key}
              type="button"
              onClick={() => setActiveKey(collection.key)}
              className={`flex min-h-14 items-center justify-between rounded-lg px-3 text-left ${
                activeKey === collection.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-100"
              }`}
            >
              <span>
                <span className="block text-sm font-black">{collection.title}</span>
                <span className="block text-xs opacity-80">{collection.description}</span>
              </span>
              <span className="ml-3 text-lg font-black">{collection.items.length}</span>
            </button>
          ))}
        </div>
      </MobileSection>

      <MobileSection>
        <StudyCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <StudyBadge tone={activeCollection.tone}>{activeCollection.title}</StudyBadge>
                <StudyBadge tone="slate">{activeCollection.items.length} 题</StudyBadge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activeCollection.description}</p>
            </div>
            <Link
              href={activeCollection.href}
              className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-blue-600 px-3 text-sm font-black text-white"
            >
              打开题组
            </Link>
          </div>

          <button
            type="button"
            onClick={printActiveCollection}
            disabled={activeCollection.items.length === 0}
            className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
          >
            打印 / 保存 PDF（{activeCollection.items.length} 题）
          </button>

          <div className="grid gap-3">
            {activeCollection.items.slice(0, 8).map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="block rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100"
              >
                <div className="flex flex-wrap gap-2">
                  <StudyBadge tone="green">{question.subject}</StudyBadge>
                  {question.mastery_status ? <StudyBadge tone="amber">{question.mastery_status}</StudyBadge> : null}
                </div>
                <p className="mt-2 text-sm font-black text-slate-950">{collectionPreviewTitle(question)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {question.chapter ?? "未分类"} / {question.difficulty ?? "未标难度"}
                </p>
                <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  <MathText text={question.question_text} fallback="这道题暂时没有题干。" />
                </div>
              </Link>
            ))}

            {!isLoading && activeCollection.items.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-sm font-black text-slate-950">这个分组暂时为空</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  先导入题卡，或者回到错题库补齐掌握度、答案状态和人工核对标记。
                </p>
                <Link
                  href="/questions"
                  className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
                >
                  去错题库
                </Link>
              </div>
            ) : null}
          </div>
        </StudyCard>
      </MobileSection>
    </MobilePageShell>
  );
}
