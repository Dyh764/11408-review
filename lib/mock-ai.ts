import type { MasteryStatus, MockAnalysis, Subject } from "@/lib/types";

type MockAnalysisInput = {
  subject: Subject;
  mastery_status: MasteryStatus;
  user_note: string;
  imagePreview?: string;
};

const subjectDefaults: Record<
  Subject,
  { chapter: string; knowledgePoint: string; solution: string; tip: string }
> = {
  数学: {
    chapter: "线性代数",
    knowledgePoint: "矩阵秩与线性相关",
    solution: "先判断向量组关系，再用初等变换确认秩的变化。",
    tip: "先看结构，再算秩，不要直接硬展开。",
  },
  数据结构: {
    chapter: "树",
    knowledgePoint: "二叉树遍历",
    solution: "根据遍历序列确定根节点，再递归拆分左右子树。",
    tip: "根的位置决定拆分边界。",
  },
  计算机组成原理: {
    chapter: "存储系统",
    knowledgePoint: "Cache 地址映射",
    solution: "拆分地址位，依次确定标记、组号和块内偏移。",
    tip: "先画地址位宽，再代入映射方式。",
  },
  操作系统: {
    chapter: "同步互斥",
    knowledgePoint: "信号量 PV 操作",
    solution: "先明确临界资源，再安排 P/V 顺序避免死锁。",
    tip: "P 是申请资源，V 是释放资源。",
  },
  计算机网络: {
    chapter: "传输层",
    knowledgePoint: "TCP 可靠传输",
    solution: "抓住序号、确认号和窗口变化判断传输状态。",
    tip: "看到 TCP 题先标序号和 ACK。",
  },
};

function priorityFromMastery(status: MasteryStatus): MockAnalysis["review_priority"] {
  if (status === "完全没思路" || status === "有一点思路") {
    return "high";
  }

  if (status === "完全掌握" || status === "做对但不稳") {
    return "low";
  }

  return "medium";
}

function mistakeTypesFromMastery(status: MasteryStatus): string[] {
  const map: Record<MasteryStatus, string[]> = {
    完全没思路: ["完全没思路", "概念不清"],
    有一点思路: ["有一点思路但入口不清", "方法选择错误"],
    思路对但卡住: ["思路对但步骤不熟"],
    计算错误: ["计算错误"],
    做对但不稳: ["做对但不稳"],
    完全掌握: ["做对但不稳"],
  };

  return map[status];
}

export function createMockAnalysis(input: MockAnalysisInput): MockAnalysis {
  const fallback = subjectDefaults[input.subject];
  const note = input.user_note.trim();
  const hasImage = Boolean(input.imagePreview);

  return {
    question_text: hasImage
      ? `Mock AI 识别：这是一道${input.subject}错题，题目文字仍需人工核对。`
      : "Mock AI 识别：尚未提供图片，保留为需要修正。",
    question_text_status: hasImage ? "ai_unverified" : "needs_fix",
    subject: input.subject,
    chapter: fallback.chapter,
    knowledge_point: fallback.knowledgePoint,
    mistake_types: mistakeTypesFromMastery(input.mastery_status),
    solution_summary: note
      ? `${fallback.solution} 当前卡点：${note}`
      : fallback.solution,
    one_sentence_tip: fallback.tip,
    review_priority: priorityFromMastery(input.mastery_status),
    confidence: hasImage ? "medium" : "low",
    needs_manual_check: true,
  };
}
