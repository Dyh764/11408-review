"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MobilePageShell, MobileSection } from "@/components/mobile/primitives";
import {
  SectionHeader,
  SprintStatCard,
  StudyBadge,
  StudyCard,
  StudyPageHeader,
} from "@/components/study/study-ui";

type DemoStep = {
  title: string;
  operation: string;
  line: number;
  data: number[];
  active: number[];
};

type AlgorithmDemo = {
  key: string;
  title: string;
  description: string;
  testCase: string;
  codeLines: string[];
  steps: DemoStep[];
};

const demos: Record<string, AlgorithmDemo> = {
  sort: {
    key: "sort",
    title: "快速排序",
    description: "用一个小数组演示分区、交换和递归收缩，适合复盘排序题的执行过程。",
    testCase: "[6, 2, 7, 3, 9, 1]",
    codeLines: [
      "quickSort(a, left, right)",
      "  if left >= right return",
      "  pivot = a[right]",
      "  i = left",
      "  for j from left to right - 1",
      "    if a[j] <= pivot swap(a[i++], a[j])",
      "  swap(a[i], a[right])",
      "  quickSort(a, left, i - 1)",
      "  quickSort(a, i + 1, right)",
    ],
    steps: [
      { title: "选择基准", operation: "取最右侧 1 作为 pivot，准备分区。", line: 3, data: [6, 2, 7, 3, 9, 1], active: [5] },
      { title: "扫描元素", operation: "6 大于 pivot，不交换，继续向右扫描。", line: 5, data: [6, 2, 7, 3, 9, 1], active: [0, 5] },
      { title: "完成分区", operation: "把 pivot 放到最终位置，左侧都不大于它。", line: 7, data: [1, 2, 7, 3, 9, 6], active: [0] },
      { title: "递归右侧", operation: "继续处理右侧子数组，问题规模缩小。", line: 9, data: [1, 2, 3, 6, 7, 9], active: [2, 3, 4, 5] },
    ],
  },
  search: {
    key: "search",
    title: "折半查找",
    description: "演示有序表中 low、mid、high 的移动规则，避免边界条件错误。",
    testCase: "在 [1, 3, 4, 6, 8, 9, 12] 中查找 8",
    codeLines: [
      "low = 0; high = n - 1",
      "while low <= high",
      "  mid = floor((low + high) / 2)",
      "  if a[mid] == target return mid",
      "  if a[mid] < target low = mid + 1",
      "  else high = mid - 1",
    ],
    steps: [
      { title: "初始化区间", operation: "low 指向 1，high 指向 12。", line: 1, data: [1, 3, 4, 6, 8, 9, 12], active: [0, 6] },
      { title: "第一次取中", operation: "mid 为 6，小于目标 8，丢弃左半段。", line: 5, data: [1, 3, 4, 6, 8, 9, 12], active: [3] },
      { title: "收缩区间", operation: "low 移到 8，搜索范围只剩右半段。", line: 2, data: [1, 3, 4, 6, 8, 9, 12], active: [4, 6] },
      { title: "命中目标", operation: "mid 指向 8，返回当前位置。", line: 4, data: [1, 3, 4, 6, 8, 9, 12], active: [4] },
    ],
  },
  "tree-graph": {
    key: "tree-graph",
    title: "图的广度优先遍历",
    description: "用队列演示 BFS 的入队、出队和访问顺序。",
    testCase: "A 连接 B/C，B 连接 D，C 连接 E",
    codeLines: [
      "queue.push(start)",
      "mark start visited",
      "while queue is not empty",
      "  v = queue.shift()",
      "  visit(v)",
      "  for each neighbor of v",
      "    if not visited push neighbor",
    ],
    steps: [
      { title: "起点入队", operation: "A 入队并标记访问。", line: 1, data: [1, 0, 0, 0, 0], active: [0] },
      { title: "访问 A", operation: "A 出队，B 和 C 入队。", line: 6, data: [1, 1, 1, 0, 0], active: [1, 2] },
      { title: "访问 B", operation: "B 出队，发现 D 并入队。", line: 7, data: [1, 1, 1, 1, 0], active: [3] },
      { title: "访问 C", operation: "C 出队，发现 E 并入队。", line: 7, data: [1, 1, 1, 1, 1], active: [4] },
    ],
  },
  os: {
    key: "os",
    title: "最近最少使用页面置换",
    description: "演示 LRU 如何根据最近访问时间淘汰页面。",
    testCase: "页框数 3，访问串 1,2,3,4,2,1",
    codeLines: [
      "for page in referenceString",
      "  if page in frames mark hit",
      "  else if frames not full insert page",
      "  else replace least recently used page",
      "  update recent use time",
    ],
    steps: [
      { title: "装入 1", operation: "页框未满，直接装入页面 1。", line: 3, data: [1, 0, 0], active: [0] },
      { title: "装入 2 和 3", operation: "页框继续填充，当前为 1/2/3。", line: 3, data: [1, 2, 3], active: [1, 2] },
      { title: "访问 4 缺页", operation: "淘汰最久未使用的 1，装入 4。", line: 4, data: [4, 2, 3], active: [0] },
      { title: "访问 2 命中", operation: "页面 2 已在页框中，只更新时间。", line: 2, data: [4, 2, 3], active: [1] },
    ],
  },
  network: {
    key: "network",
    title: "滑动窗口确认",
    description: "演示发送窗口、确认号和窗口右移的关系。",
    testCase: "发送窗口大小 4，连续发送 1 到 6 号帧",
    codeLines: [
      "while data remains",
      "  send frames inside window",
      "  wait for ack",
      "  if ack valid slide window",
      "  retransmit timed-out frame",
    ],
    steps: [
      { title: "发送窗口", operation: "窗口覆盖 1-4 号帧，可以连续发送。", line: 2, data: [1, 2, 3, 4, 0, 0], active: [0, 1, 2, 3] },
      { title: "收到 ACK2", operation: "确认 1 号帧，窗口右移一格。", line: 4, data: [0, 2, 3, 4, 5, 0], active: [1, 2, 3, 4] },
      { title: "继续发送", operation: "5 号帧进入窗口并发送。", line: 2, data: [0, 2, 3, 4, 5, 0], active: [4] },
      { title: "超时重传", operation: "3 号帧超时，触发重传。", line: 5, data: [0, 2, 3, 4, 5, 0], active: [2] },
    ],
  },
};

function getParamKey(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AlgorithmDetailPage() {
  const params = useParams<{ key: string }>();
  const demo = demos[getParamKey(params.key) ?? "sort"] ?? demos.sort;
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const step = demo.steps[stepIndex] ?? demo.steps[0];

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % demo.steps.length);
    }, speed);

    return () => window.clearInterval(timer);
  }, [demo.steps.length, isPlaying, speed]);

  const activeLine = step.line;
  const maxValue = useMemo(() => Math.max(...step.data, 1), [step.data]);

  return (
    <MobilePageShell className="bg-slate-50">
      <StudyPageHeader
        eyebrow="408 算法可视化平台"
        title={demo.title}
        subtitle={`${demo.description} 这里提供步骤动画演示和代码高亮联动，方便把抽象过程拆成可复盘的动作。`}
      />

      <MobileSection>
        <div className="grid grid-cols-3 gap-3">
          <SprintStatCard label="步骤" value={demo.steps.length} helper="可步进" tone="green" />
          <SprintStatCard label="代码行" value={demo.codeLines.length} helper="高亮联动" tone="cyan" />
          <SprintStatCard label="调速" value={`${speed}ms`} helper="播放间隔" tone="amber" />
        </div>
      </MobileSection>

      <MobileSection>
        <StudyCard className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StudyBadge tone="green">步骤动画演示</StudyBadge>
            <StudyBadge tone="cyan">代码高亮联动</StudyBadge>
            <StudyBadge tone="slate">测试用例</StudyBadge>
          </div>

          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">测试用例</p>
            <p className="mt-1 text-sm font-black text-slate-950">{demo.testCase}</p>
          </div>

          <div className="flex min-h-44 items-end gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-100">
            {step.data.map((value, index) => {
              const isActive = step.active.includes(index);
              const height = value > 0 ? 34 + Math.round((value / maxValue) * 96) : 18;

              return (
                <div key={`${index}-${value}`} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-t-lg ${isActive ? "bg-blue-600" : value > 0 ? "bg-cyan-400" : "bg-slate-200"}`}
                    style={{ height }}
                  />
                  <span className="text-xs font-black text-slate-600">{value > 0 ? value : "-"}</span>
                </div>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-950">
                步骤 {stepIndex + 1} / {demo.steps.length}
              </p>
              <StudyBadge tone="amber">代码行 {activeLine}</StudyBadge>
            </div>
            <p className="mt-2 text-sm font-black text-slate-800">{step.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">操作内容：{step.operation}</p>
          </div>
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <StudyCard className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg bg-white px-3 text-sm font-black text-blue-700 ring-1 ring-blue-100"
              onClick={() => setStepIndex((current) => (current === 0 ? demo.steps.length - 1 : current - 1))}
            >
              返回
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg bg-blue-600 px-3 text-sm font-black text-white"
              onClick={() => setIsPlaying((current) => !current)}
            >
              {isPlaying ? "暂停" : "播放"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg bg-white px-3 text-sm font-black text-blue-700 ring-1 ring-blue-100"
              onClick={() => setStepIndex((current) => (current + 1) % demo.steps.length)}
            >
              步进
            </button>
          </div>

          <label className="block text-sm font-black text-slate-700">
            调速
            <input
              className="mt-2 w-full accent-blue-600"
              type="range"
              min="400"
              max="1600"
              step="100"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
          </label>
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <SectionHeader title="代码实现" subtitle="高亮行会跟随当前步骤变化。" />
        <StudyCard>
          <div className="grid gap-2">
            {demo.codeLines.map((line, index) => {
              const lineNumber = index + 1;
              const isActive = lineNumber === activeLine;

              return (
                <div
                  key={line}
                  className={`grid grid-cols-[3rem_1fr] gap-2 rounded-lg px-3 py-2 text-sm ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className={isActive ? "font-black text-white/80" : "font-black text-slate-400"}>
                    {lineNumber}
                  </span>
                  <code className="whitespace-pre-wrap break-words font-mono">{line}</code>
                </div>
              );
            })}
          </div>
        </StudyCard>
      </MobileSection>

      <MobileSection>
        <Link
          href="/algorithms"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-blue-700 ring-1 ring-blue-100"
        >
          返回算法专题
        </Link>
      </MobileSection>
    </MobilePageShell>
  );
}
