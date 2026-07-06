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

type AlgorithmTopic = {
  key: string;
  title: string;
  description: string;
  keywords: string[];
  capability: string;
};

type TopicStats = AlgorithmTopic & {
  total: number;
  mastered: number;
  weak: number;
  examples: QuestionWithImage[];
};

const topics: AlgorithmTopic[] = [
  {
    key: "sort",
    title: "排序",
    description: "覆盖快速排序、归并排序、堆排序、插入排序等数据结构高频算法。",
    keywords: ["排序", "快排", "快速排序", "归并", "堆排序", "插入排序", "选择排序", "冒泡"],
    capability: "步骤动画演示",
  },
  {
    key: "search",
    title: "查找",
    description: "覆盖折半查找、散列表、二叉排序树查找等常见查找题。",
    keywords: ["查找", "折半", "二分", "散列", "哈希", "哈夫曼", "索引"],
    capability: "代码高亮联动",
  },
  {
    key: "tree-graph",
    title: "树与图",
    description: "覆盖树遍历、最短路径、最小生成树、拓扑排序和图遍历。",
    keywords: ["树", "二叉树", "遍历", "图", "最短路径", "生成树", "拓扑", "邻接"],
    capability: "步进调试",
  },
  {
    key: "os",
    title: "操作系统算法",
    description: "覆盖进程调度、页面置换、磁盘调度和死锁相关算法。",
    keywords: ["调度", "页面置换", "缺页", "磁盘", "死锁", "银行家", "进程", "时间片"],
    capability: "导出报告",
  },
  {
    key: "network",
    title: "网络算法",
    description: "覆盖路由、子网划分、差错控制和拥塞控制中的计算型题。",
    keywords: ["路由", "子网", "拥塞", "差错", "校验", "滑动窗口", "广播地址"],
    capability: "测试用例",
  },
];

function textOf(question: QuestionWithImage) {
  return [
    question.subject,
    question.chapter,
    question.knowledge_point,
    question.question_text,
    question.solution_summary,
    question.answer_explanation,
    ...(question.mistake_types ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function isMastered(question: QuestionWithImage) {
  return question.mastery_status === "完全掌握" || question.review_priority === "low";
}

function isWeak(question: QuestionWithImage) {
  const mastery = question.mastery_status ?? "";
  return (
    question.review_priority === "high" ||
    question.needs_manual_check ||
    mastery.includes("没思路") ||
    mastery.includes("卡住") ||
    mastery.includes("不稳")
  );
}

function buildTopicStats(questions: QuestionWithImage[]): TopicStats[] {
  return topics.map((topic) => {
    const matched = questions.filter((question) => {
      const source = textOf(question);
      return topic.key === "os"
        ? question.subject === "操作系统" || topic.keywords.some((keyword) => source.includes(keyword))
        : topic.keywords.some((keyword) => source.includes(keyword));
    });

    return {
      ...topic,
      total: matched.length,
      mastered: matched.filter(isMastered).length,
      weak: matched.filter(isWeak).length,
      examples: matched.slice(0, 4),
    };
  });
}

export default function AlgorithmsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [message, setMessage] = useState(supabase ? "" : "请配置 Supabase 后查看算法专题。");
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
          setMessage(items.length === 0 ? "还没有可归类的算法题，先导入数据结构或操作系统错题。" : "");
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "算法专题读取失败。");
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

  const topicStats = useMemo(() => buildTopicStats(questions), [questions]);
  const coveredTopicCount = topicStats.filter((topic) => topic.total > 0).length;
  const algorithmQuestionCount = topicStats.reduce((sum, topic) => sum + topic.total, 0);
  const weakCount = topicStats.reduce((sum, topic) => sum + topic.weak, 0);

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 算法可视化平台"
        title="算法专题"
        subtitle="参考 408os 的算法可视化模块，先把现有错题按算法专题归类；后续可以继续接步骤动画演示和代码高亮联动。"
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="专题" value={coveredTopicCount} helper="已有题目" tone="green" />
          <SprintStatCard label="算法题" value={algorithmQuestionCount} helper="命中题量" />
          <SprintStatCard label="薄弱" value={weakCount} helper="优先复盘" tone="amber" />
        </div>
      </MobileSection>

      <MobileSection>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/questions"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
          >
            查看错题库
          </Link>
          <Link
            href="/practice?mode=exam408-choice"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
          >
            进入刷题
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
          <LoadingState label="正在读取算法专题..." />
        </MobileSection>
      ) : null}

      <MobileSection>
        <SectionHeader title="专题列表" subtitle="先按错题关键词聚合，再回到题库做针对复盘。" />
        <div className="grid gap-3">
          {topicStats.map((topic) => (
            <StudyCard key={topic.key} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StudyBadge tone={topic.total > 0 ? "green" : "slate"}>{topic.title}</StudyBadge>
                    <StudyBadge tone="cyan">{topic.capability}</StudyBadge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black text-blue-700">{topic.total}</p>
                  <p className="text-xs text-slate-500">题</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-base font-black text-slate-950">{topic.mastered}</p>
                  <p className="mt-1 text-xs text-slate-500">已掌握</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-base font-black text-amber-700">{topic.weak}</p>
                  <p className="mt-1 text-xs text-amber-700">薄弱</p>
                </div>
                <div className="rounded-lg bg-cyan-50 p-3">
                  <p className="text-base font-black text-cyan-700">{topic.keywords.length}</p>
                  <p className="mt-1 text-xs text-cyan-700">关键词</p>
                </div>
              </div>

              <Link
                href={`/algorithms/${topic.key}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white"
              >
                开始演示
              </Link>

              {topic.examples.length > 0 ? (
                <div className="grid gap-2">
                  {topic.examples.map((question) => (
                    <Link
                      key={question.id}
                      href={`/questions/${question.id}`}
                      className="rounded-lg bg-slate-50 p-3 text-sm font-black text-slate-800 ring-1 ring-slate-100"
                    >
                      {question.knowledge_point?.trim() || question.chapter?.trim() || "待整理算法题"}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-100">
                  当前还没有命中这个专题的题。导入时补充 chapter、knowledge_point 或题干关键词后会自动归类。
                </p>
              )}
            </StudyCard>
          ))}
        </div>
      </MobileSection>
    </MobilePageShell>
  );
}
