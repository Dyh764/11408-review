import type {
  AnswerStatus,
  Difficulty,
  MasteryStatus,
  QuestionTextStatus,
  ReviewPriority,
} from "../types";
import { sortQuestionsForChapterList } from "../questions/question-sort.ts";

export type DisplaySubject =
  | "高等数学"
  | "线性代数"
  | "概率论与数理统计"
  | "数据结构"
  | "计算机组成原理"
  | "操作系统"
  | "计算机网络"
  | "待整理 / 未分类";

export type TaxonomyQuestion = {
  id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  difficulty: Difficulty | string | null;
  mastery_status: MasteryStatus | string | null;
  question_text_status: QuestionTextStatus | string | null;
  answer_status: AnswerStatus | string | null;
  needs_manual_check: boolean;
  review_priority: ReviewPriority | string | null;
  question_text?: string | null;
  priority_score?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuestionChapterGroup<T extends TaxonomyQuestion> = {
  chapter: string;
  totalCount: number;
  hardCount: number;
  masteredCount: number;
  needsAttentionCount: number;
  questions: T[];
};

export type QuestionSubjectDirectory<T extends TaxonomyQuestion> = {
  subject: DisplaySubject;
  totalCount: number;
  dueTodayCount: number;
  hardCount: number;
  masteredCount: number;
  needsAttentionCount: number;
  masteryRate: number;
  chapters: QuestionChapterGroup<T>[];
};

const subjectOrder: DisplaySubject[] = [
  "高等数学",
  "线性代数",
  "概率论与数理统计",
  "数据结构",
  "计算机组成原理",
  "操作系统",
  "计算机网络",
  "待整理 / 未分类",
];

export const higherMathChapterOrder = [
  "函数、极限与连续",
  "一元函数微分学",
  "一元函数积分学",
  "常微分方程",
  "中值定理",
  "多元函数微分学",
  "二重积分",
  "三重积分",
  "曲线曲面积分",
  "无穷级数",
  "向量代数与空间解析几何",
  "待整理 / 未分类",
] as const;

type HigherMathChapter = (typeof higherMathChapterOrder)[number];

const linearAlgebraChapterOrder = [
  "行列式",
  "矩阵",
  "向量",
  "线性方程组",
  "相似矩阵",
  "二次型",
  "待整理 / 未分类",
] as const;

const probabilityChapterOrder = [
  "随机事件和概率",
  "一维随机变量及其分布",
  "多维随机变量及其分布",
  "随机变量的数字特征",
  "大数定律与中心极限定理",
  "数理统计的基本概念",
  "参数估计",
  "假设检验",
  "待整理 / 未分类",
] as const;

const dataStructureChapterOrder = [
  "绪论",
  "线性表",
  "栈、队列和数组",
  "串",
  "树与二叉树",
  "图",
  "查找",
  "排序",
  "待整理 / 未分类",
] as const;

const computerOrganizationChapterOrder = [
  "计算机系统概述",
  "数据的表示和运算",
  "存储系统",
  "指令系统",
  "中央处理器",
  "总线",
  "输入/输出系统",
  "待整理 / 未分类",
] as const;

const operatingSystemChapterOrder = [
  "计算机系统概述",
  "进程与线程",
  "内存管理",
  "文件管理",
  "输入/输出管理",
  "待整理 / 未分类",
] as const;

const computerNetworkChapterOrder = [
  "计算机网络体系结构",
  "物理层",
  "数据链路层",
  "网络层",
  "传输层",
  "应用层",
  "待整理 / 未分类",
] as const;

type OrderedChapter =
  | (typeof linearAlgebraChapterOrder)[number]
  | (typeof probabilityChapterOrder)[number]
  | (typeof dataStructureChapterOrder)[number]
  | (typeof computerOrganizationChapterOrder)[number]
  | (typeof operatingSystemChapterOrder)[number]
  | (typeof computerNetworkChapterOrder)[number];

type ChapterRule = {
  chapter: OrderedChapter;
  keywords: string[];
};

const chapterCatalog: Partial<Record<DisplaySubject, readonly OrderedChapter[]>> = {
  线性代数: linearAlgebraChapterOrder,
  概率论与数理统计: probabilityChapterOrder,
  数据结构: dataStructureChapterOrder,
  计算机组成原理: computerOrganizationChapterOrder,
  操作系统: operatingSystemChapterOrder,
  计算机网络: computerNetworkChapterOrder,
};

const chapterRules: Partial<Record<DisplaySubject, ChapterRule[]>> = {
  线性代数: [
    { chapter: "行列式", keywords: ["行列式", "余子式", "代数余子式", "克拉默"] },
    { chapter: "矩阵", keywords: ["矩阵", "逆矩阵", "伴随矩阵", "初等变换", "分块矩阵"] },
    { chapter: "向量", keywords: ["向量", "线性相关", "线性无关", "极大无关组", "秩"] },
    { chapter: "线性方程组", keywords: ["线性方程组", "齐次方程组", "非齐次方程组", "基础解系"] },
    { chapter: "相似矩阵", keywords: ["相似矩阵", "特征值", "特征向量", "对角化"] },
    { chapter: "二次型", keywords: ["二次型", "正定", "合同", "规范形", "标准形"] },
  ],
  概率论与数理统计: [
    { chapter: "随机事件和概率", keywords: ["随机事件", "概率", "条件概率", "全概率", "贝叶斯", "独立性"] },
    { chapter: "一维随机变量及其分布", keywords: ["一维随机变量", "分布函数", "密度函数", "离散型", "连续型", "正态分布", "二项分布"] },
    { chapter: "多维随机变量及其分布", keywords: ["多维随机变量", "二维随机变量", "联合分布", "边缘分布", "条件分布"] },
    { chapter: "随机变量的数字特征", keywords: ["数学期望", "期望", "方差", "协方差", "相关系数", "矩"] },
    { chapter: "大数定律与中心极限定理", keywords: ["大数定律", "中心极限定理", "切比雪夫", "依概率收敛"] },
    { chapter: "数理统计的基本概念", keywords: ["总体", "样本", "统计量", "抽样分布", "卡方分布", "t 分布", "F 分布"] },
    { chapter: "参数估计", keywords: ["参数估计", "点估计", "区间估计", "最大似然", "矩估计", "置信区间"] },
    { chapter: "假设检验", keywords: ["假设检验", "显著性", "拒绝域", "P 值", "原假设", "备择假设"] },
  ],
  数据结构: [
    { chapter: "绪论", keywords: ["绪论", "数据结构基本概念", "算法", "时间复杂度", "空间复杂度"] },
    { chapter: "线性表", keywords: ["线性表", "顺序表", "链表", "单链表", "双链表", "循环链表"] },
    { chapter: "栈、队列和数组", keywords: ["栈", "队列", "数组", "串", "特殊矩阵", "稀疏矩阵"] },
    { chapter: "串", keywords: ["串", "字符串", "KMP", "模式匹配"] },
    { chapter: "树与二叉树", keywords: ["树", "二叉树", "森林", "哈夫曼", "线索二叉树", "遍历"] },
    { chapter: "图", keywords: ["图", "邻接矩阵", "邻接表", "最短路径", "拓扑排序", "关键路径"] },
    { chapter: "查找", keywords: ["查找", "顺序查找", "折半查找", "B 树", "B+树", "Hash", "哈希", "散列"] },
    { chapter: "排序", keywords: ["排序", "插入排序", "交换排序", "选择排序", "归并排序", "基数排序", "外部排序"] },
  ],
  计算机组成原理: [
    { chapter: "计算机系统概述", keywords: ["计算机系统概述", "冯·诺依曼", "性能指标", "层次结构"] },
    { chapter: "数据的表示和运算", keywords: ["数据的表示", "定点数", "浮点数", "补码", "运算器", "ALU"] },
    { chapter: "存储系统", keywords: ["存储系统", "主存储器", "高速缓冲", "Cache", "虚拟存储器"] },
    { chapter: "指令系统", keywords: ["指令系统", "寻址方式", "机器级代码", "CISC", "RISC"] },
    { chapter: "中央处理器", keywords: ["中央处理器", "CPU", "控制器", "数据通路", "流水线", "指令执行"] },
    { chapter: "总线", keywords: ["总线", "总线仲裁", "总线事务", "总线定时"] },
    { chapter: "输入/输出系统", keywords: ["输入/输出", "I/O", "DMA", "中断", "接口"] },
  ],
  操作系统: [
    { chapter: "计算机系统概述", keywords: ["计算机系统概述", "操作系统概述", "发展历程"] },
    { chapter: "进程与线程", keywords: ["进程", "线程", "CPU 调度", "同步", "互斥", "死锁", "信号量"] },
    { chapter: "内存管理", keywords: ["内存管理", "虚拟内存", "分页", "分段", "页面置换"] },
    { chapter: "文件管理", keywords: ["文件管理", "目录", "文件系统", "文件分配", "磁盘"] },
    { chapter: "输入/输出管理", keywords: ["输入/输出", "I/O", "设备", "缓冲", "磁盘调度"] },
  ],
  计算机网络: [
    { chapter: "计算机网络体系结构", keywords: ["网络体系结构", "OSI", "TCP/IP", "参考模型", "协议"] },
    { chapter: "物理层", keywords: ["物理层", "通信基础", "传输介质", "物理层设备"] },
    { chapter: "数据链路层", keywords: ["数据链路层", "组帧", "差错控制", "流量控制", "局域网", "广域网", "MAC"] },
    { chapter: "网络层", keywords: ["网络层", "IPv4", "IPv6", "IP", "路由", "路由算法", "移动 IP"] },
    { chapter: "传输层", keywords: ["传输层", "UDP", "TCP", "拥塞控制", "可靠传输"] },
    { chapter: "应用层", keywords: ["应用层", "DNS", "文件传输", "电子邮件", "万维网", "HTTP"] },
  ],
};

const higherMathChapterRules: Array<{ chapter: HigherMathChapter; keywords: string[] }> = [
  {
    chapter: "曲线曲面积分",
    keywords: [
      "曲线积分",
      "第一类曲线积分",
      "第二类曲线积分",
      "空间曲线积分",
      "平面曲线积分",
      "格林公式",
      "路径无关",
      "保守场",
      "环流量",
      "闭合曲线",
      "曲面积分",
      "第一类曲面积分",
      "第二类曲面积分",
      "高斯公式",
      "斯托克斯公式",
      "通量",
      "散度",
      "旋度",
      "法向量",
      "曲面方向",
      "有向曲面",
    ],
  },
  {
    chapter: "三重积分",
    keywords: ["三重积分", "\\iiint", "柱坐标", "球坐标", "空间区域", "体积元", "形心", "质心", "椭球", "雅可比", "变量代换", "绕 x 轴柱坐标", "绕 y 轴柱坐标", "绕 z 轴柱坐标"],
  },
  {
    chapter: "二重积分",
    keywords: ["二重积分", "\\iint", "极坐标", "平面区域", "积分区域", "交换积分次序", "累次积分", "二重积分计算"],
  },
  {
    chapter: "多元函数微分学",
    keywords: ["多元函数微分", "偏导", "全微分", "方向导数", "梯度", "多元函数极值", "条件极值", "拉格朗日乘数", "隐函数", "全微分判定", "偏导数", "可微"],
  },
  {
    chapter: "无穷级数",
    keywords: ["无穷级数", "数项级数", "正项级数", "交错级数", "幂级数", "函数项级数", "求和函数", "收敛半径", "收敛域", "泰勒级数", "傅里叶级数"],
  },
  {
    chapter: "常微分方程",
    keywords: ["微分方程", "可分离变量", "齐次方程", "一阶线性", "二阶常系数", "特征方程", "通解", "特解"],
  },
  {
    chapter: "函数、极限与连续",
    keywords: ["函数、极限、连续", "函数、极限与连续", "极限", "无穷小", "无穷大", "等价无穷小", "连续", "间断点", "渐近线", "函数极限", "数列极限"],
  },
  {
    chapter: "一元函数微分学",
    keywords: ["导数", "微分", "洛必达", "单调性", "凹凸性", "拐点", "极值", "最值", "曲率", "方程根", "零点"],
  },
  {
    chapter: "中值定理",
    keywords: ["中值定理", "罗尔定理", "拉格朗日中值定理", "柯西中值定理", "泰勒公式", "不等式证明"],
  },
  {
    chapter: "一元函数积分学",
    keywords: ["不定积分", "定积分", "反常积分", "变限积分", "换元积分", "分部积分", "面积", "旋转体体积"],
  },
  {
    chapter: "向量代数与空间解析几何",
    keywords: ["向量代数", "空间解析几何", "向量", "平面", "直线", "距离", "夹角", "法向量", "方向向量"],
  },
];

const mathSubjectRules: Array<{ subject: DisplaySubject; keywords: string[] }> = [
  {
    subject: "线性代数",
    keywords: ["行列式", "矩阵", "向量", "线性方程组", "特征值", "特征向量", "二次型", "秩"],
  },
  {
    subject: "概率论与数理统计",
    keywords: ["概率", "随机", "分布", "期望", "方差", "统计", "估计", "假设检验"],
  },
  {
    subject: "高等数学",
    keywords: [
      "函数",
      "极限",
      "连续",
      "导数",
      "微分",
      "积分",
      "级数",
      "多元",
      "微分方程",
      "无穷小",
    ],
  },
];

function includesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeChapterText(chapter: string) {
  return chapter
    .trim()
    .replace(/^高等数学[-/：:\s]*/, "")
    .replace(/^数学[-/：:\s]*/, "");
}

function getQuestionText(question: TaxonomyQuestion) {
  return [
    normalizeChapterText(question.chapter ?? ""),
    question.knowledge_point ?? "",
    question.question_text ?? "",
  ].join(" ");
}

function classifyByQuestionTextIntegralSymbol(questionText: string) {
  if (
    questionText.includes("\\iiint") ||
    questionText.includes("三重积分") ||
    questionText.includes("三重积分计算")
  ) {
    return "三重积分";
  }

  if (questionText.includes("\\iint") || questionText.includes("二重积分")) {
    return "二重积分";
  }

  return null;
}

function classifyByPriorityFormula(text: string): HigherMathChapter | null {
  if (includesAnyKeyword(text, higherMathChapterRules[0].keywords)) {
    return "曲线曲面积分";
  }

  return null;
}

function classifyHigherMathChapter(question: TaxonomyQuestion): HigherMathChapter {
  const symbolChapter = classifyByQuestionTextIntegralSymbol(question.question_text ?? "");

  if (symbolChapter) {
    return symbolChapter;
  }

  const text = getQuestionText(question);
  const formulaChapter = classifyByPriorityFormula(text);

  if (formulaChapter) {
    return formulaChapter;
  }

  const exact = higherMathChapterOrder.find(
    (chapter) => chapter !== "待整理 / 未分类" && text.includes(chapter),
  );

  if (exact) {
    return exact;
  }

  const matched = higherMathChapterRules.find((rule) => includesAnyKeyword(text, rule.keywords));
  return matched?.chapter ?? "待整理 / 未分类";
}

export function getDisplaySubject(question: TaxonomyQuestion): DisplaySubject {
  if (question.subject !== "数学") {
    return subjectOrder.includes(question.subject as DisplaySubject)
      ? (question.subject as DisplaySubject)
      : "待整理 / 未分类";
  }

  const text = getQuestionText(question);
  if (classifyHigherMathChapter(question) !== "待整理 / 未分类") {
    return "高等数学";
  }

  const matched = mathSubjectRules.find((rule) => includesAnyKeyword(text, rule.keywords));

  return matched?.subject ?? "待整理 / 未分类";
}

function normalizeCatalogText(value: string) {
  return value
    .trim()
    .replace(/^第[一二三四五六七八九十\d]+章\s*/, "")
    .replace(/^\d+(\.\d+)*\s*/, "")
    .replace(/[：:]/g, " ")
    .replace(/\s+/g, " ");
}

function classifyByCatalog(subject: DisplaySubject, question: TaxonomyQuestion) {
  const rules = chapterRules[subject];
  const orderedChapters = chapterCatalog[subject];

  if (!rules || !orderedChapters) {
    return null;
  }

  const text = [
    normalizeCatalogText(question.chapter ?? ""),
    question.knowledge_point ?? "",
    question.question_text ?? "",
  ].join(" ");
  const exact = orderedChapters.find(
    (chapter) => chapter !== "待整理 / 未分类" && text.includes(chapter),
  );

  if (exact) {
    return exact;
  }

  const matched = rules.find((rule) => includesAnyKeyword(text, rule.keywords));
  return matched?.chapter ?? null;
}

export function getDisplayChapter(question: TaxonomyQuestion) {
  const subject = getDisplaySubject(question);

  if (subject === "高等数学") {
    return classifyHigherMathChapter(question);
  }

  const catalogChapter = classifyByCatalog(subject, question);
  if (catalogChapter) {
    return catalogChapter;
  }

  if (subject === "待整理 / 未分类") {
    return "待整理 / 未分类";
  }

  const chapter = question.chapter?.trim();
  return chapter && chapter.length > 0 ? chapter : "待整理 / 未分类";
}

function getChapterOrder(subject: DisplaySubject) {
  if (subject === "高等数学") {
    return higherMathChapterOrder;
  }

  return chapterCatalog[subject] ?? null;
}

function isHard(question: TaxonomyQuestion) {
  return question.difficulty === "较难" || question.difficulty === "压轴" || question.difficulty === "困难";
}

function isMastered(question: TaxonomyQuestion) {
  return question.mastery_status === "完全掌握";
}

function needsAttention(question: TaxonomyQuestion) {
  return (
    question.needs_manual_check ||
    question.question_text_status === "needs_fix" ||
    question.answer_status === "needs_fix" ||
    question.review_priority === "high"
  );
}

function summarize<T extends TaxonomyQuestion>(questions: T[]) {
  const totalCount = questions.length;
  const masteredCount = questions.filter(isMastered).length;

  return {
    totalCount,
    hardCount: questions.filter(isHard).length,
    masteredCount,
    needsAttentionCount: questions.filter(needsAttention).length,
    masteryRate: totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0,
  };
}

export function buildQuestionDirectory<T extends TaxonomyQuestion>(
  questions: T[],
  dueTodayIds: Set<string> = new Set(),
): QuestionSubjectDirectory<T>[] {
  const subjectMap = new Map<DisplaySubject, T[]>();

  for (const question of questions) {
    const subject = getDisplaySubject(question);
    const subjectQuestions = subjectMap.get(subject) ?? [];
    subjectQuestions.push(question);
    subjectMap.set(subject, subjectQuestions);
  }

  return subjectOrder.map((subject) => {
    const subjectQuestions = subjectMap.get(subject) ?? [];
    const chapterMap = new Map<string, T[]>();
    const orderedChapters = getChapterOrder(subject);

    for (const question of subjectQuestions) {
      const chapter = getDisplayChapter(question);
      const chapterQuestions = chapterMap.get(chapter) ?? [];
      chapterQuestions.push(question);
      chapterMap.set(chapter, chapterQuestions);
    }

    const summary = summarize(subjectQuestions);

    return {
      subject,
      ...summary,
      dueTodayCount: subjectQuestions.filter((question) => dueTodayIds.has(question.id)).length,
      chapters: Array.from(
        orderedChapters
          ? new Map(
              orderedChapters.map((chapter) => [
                chapter,
                chapterMap.get(chapter) ?? [],
              ]),
            )
          : chapterMap,
        ([chapter, chapterQuestions]) => ({
        chapter,
        ...summarize(chapterQuestions),
        questions: sortQuestionsForChapterList(chapterQuestions, { dueTodayIds }),
      })).sort((a, b) => {
        const chapterOrderA = orderedChapters
          ? orderedChapters.indexOf(a.chapter as never)
          : -1;
        const chapterOrderB = orderedChapters
          ? orderedChapters.indexOf(b.chapter as never)
          : -1;

        if (chapterOrderA !== -1 || chapterOrderB !== -1) {
          return (chapterOrderA === -1 ? 999 : chapterOrderA) - (chapterOrderB === -1 ? 999 : chapterOrderB);
        }

        return b.needsAttentionCount - a.needsAttentionCount || b.totalCount - a.totalCount;
      }),
    };
  });
}

export function filterVisibleQuestionDirectory<T extends TaxonomyQuestion>(
  directory: QuestionSubjectDirectory<T>[],
  options: { hideEmptySubjects?: boolean } = {},
) {
  return directory
    .filter((subject) => !options.hideEmptySubjects || subject.totalCount > 0)
    .map((subject) => ({
      ...subject,
      chapters: subject.chapters.filter((chapter) => chapter.totalCount > 0),
    }));
}
