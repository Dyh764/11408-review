import type { QuestionCard } from "@/lib/types";

export const dashboardStats = {
  dueToday: 8,
  addedToday: 3,
  weeklyCompletionRate: "76%",
  weakestTop3: [
    { name: "Cache 地址映射", score: 31 },
    { name: "二叉树遍历", score: 27 },
    { name: "信号量 PV 操作", score: 24 },
  ],
};

export const mockQuestions: QuestionCard[] = [
  {
    id: "q-cache-001",
    subject: "计算机组成原理",
    chapter: "存储系统",
    knowledgePoint: "Cache 地址映射",
    masteryStatus: "思路对但卡住",
    userNote: "组号和块内偏移位数混了",
    mistakeTypes: ["知识点混淆", "条件漏看"],
    oneSentenceTip: "先拆地址位，再判断映射方式。",
    weaknessScore: 31,
    nextReviewDate: "今天",
  },
  {
    id: "q-tree-002",
    subject: "数据结构",
    chapter: "树",
    knowledgePoint: "二叉树遍历",
    masteryStatus: "有一点思路",
    userNote: "递归拆分边界不稳",
    mistakeTypes: ["有一点思路但入口不清"],
    oneSentenceTip: "根节点决定左右子树范围。",
    weaknessScore: 27,
    nextReviewDate: "今天",
  },
  {
    id: "q-os-003",
    subject: "操作系统",
    chapter: "同步互斥",
    knowledgePoint: "信号量 PV 操作",
    masteryStatus: "完全没思路",
    userNote: "不知道先 P 哪个信号量",
    mistakeTypes: ["完全没思路", "方法选择错误"],
    oneSentenceTip: "先列共享资源，再写 P/V。",
    weaknessScore: 24,
    nextReviewDate: "明天",
  },
];

export const reportMock = {
  daily: {
    title: "今日复盘",
    newQuestions: 3,
    completionRate: "80%",
    focus: ["Cache 地址映射", "二叉树遍历", "PV 操作"],
    nextActions: ["今晚先复盘 3 道高优先级题", "明早补看 Cache 地址位拆分"],
  },
  weekly: {
    title: "本周报告",
    newQuestions: 18,
    completionRate: "76%",
    focus: ["存储系统", "树", "同步互斥"],
    nextActions: ["用 2 天专项突破 Cache", "把二叉树遍历题按模板重做"],
  },
  monthly: {
    title: "本月趋势",
    newQuestions: 64,
    completionRate: "71%",
    focus: ["计算机组成原理", "数据结构", "操作系统"],
    nextActions: ["下月优先做计组存储系统专题", "降低已掌握数学题重复投入"],
  },
};
