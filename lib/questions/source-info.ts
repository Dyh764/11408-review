import type { QuestionSourceInfo } from "@/lib/types";

export const unmarkedSourceInfo: QuestionSourceInfo = {
  type: "未标来源",
  name: "未标来源",
  section: "",
  part: "",
  volume: "",
  paper: "",
  page: "",
  problem_number: "",
  raw: "未标来源",
};

type SourceInfoInput = Partial<QuestionSourceInfo> | string | null | undefined;

type SourceStatsQuestion = {
  id: string;
  source?: string | null;
  source_info?: SourceInfoInput;
  chapter?: string | null;
  mistake_types?: string[] | null;
  created_at?: string | null;
};

export type QuestionSourceStats = {
  key: string;
  type: string;
  name: string;
  section: string;
  parts: string[];
  total_questions: number;
  wrong_questions: number;
  weak_chapters: string[];
  frequent_mistake_types: string[];
  latest_added_at: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function inferSection(raw: string) {
  if (/高数|高等数学|三重积分|二重积分|曲线曲面|级数|极限|微分|积分/.test(raw)) {
    return "高等数学";
  }

  if (/线代|线性代数|矩阵|行列式|特征值|二次型/.test(raw)) {
    return "线性代数";
  }

  if (/概率|数理统计|随机|分布|期望|方差/.test(raw)) {
    return "概率论与数理统计";
  }

  return "";
}

function inferType(raw: string) {
  if (/真题/.test(raw)) return "真题";
  if (/套卷|模拟卷|模拟/.test(raw)) return "模拟卷";
  if (/ChatGPT|AI|生成题/i.test(raw)) return "AI生成";
  if (/课本|教材|例题/.test(raw)) return "课本";
  if (raw && raw !== "未标来源") return "练习册";
  return "未标来源";
}

function inferName(raw: string) {
  if (!raw) return "未标来源";
  const normalized = raw.replace(/\s+/g, "");

  if (/李林.*880|李林八百八十/.test(normalized)) return "李林880题";
  if (/武忠祥/.test(normalized)) return "武忠祥严选题";
  if (/张宇.*1000/.test(normalized)) return "张宇1000题";
  if (/李林.*6|李林六/.test(normalized)) return "李林6套卷";
  if (/李林.*4|李林四/.test(normalized)) return "李林4套卷";
  if (/真题/.test(normalized)) return "数学真题";
  if (/ChatGPT|AI/i.test(normalized)) return "ChatGPT 生成题";

  return raw.split(/[-_—\s]/).filter(Boolean)[0] || raw;
}

function inferPart(raw: string) {
  const normalized = raw.replace(/\s+/g, "");

  if (/基础题|基础篇|基础部分/.test(normalized)) return "基础题";
  if (/综合题|综合篇|综合部分|综合体/.test(normalized)) return "综合题";
  if (/拓展题|拓展篇|提高题|提高篇/.test(normalized)) return "拓展题";
  return "";
}

function inferPaper(raw: string) {
  return raw.match(/第\s*\d+\s*套/)?.[0].replace(/\s+/g, "") ?? "";
}

export function normalizeQuestionSourceInfo(input: SourceInfoInput): QuestionSourceInfo {
  if (typeof input === "string") {
    const raw = input.trim() || unmarkedSourceInfo.raw;
    return {
      type: inferType(raw),
      name: inferName(raw),
      section: inferSection(raw),
      part: inferPart(raw),
      volume: "",
      paper: inferPaper(raw),
      page: "",
      problem_number: "",
      raw,
    };
  }

  if (!input || typeof input !== "object") {
    return { ...unmarkedSourceInfo };
  }

  const raw = clean(input.raw) || clean(input.name) || unmarkedSourceInfo.raw;
  return {
    type: clean(input.type) || inferType(raw),
    name: clean(input.name) || inferName(raw),
    section: clean(input.section) || inferSection(raw),
    part: clean(input.part) || inferPart(raw),
    volume: clean(input.volume),
    paper: clean(input.paper) || inferPaper(raw),
    page: clean(input.page),
    problem_number: clean(input.problem_number),
    raw,
  };
}

export function getQuestionSourceInfo(question: {
  source?: string | null;
  source_info?: SourceInfoInput;
}) {
  return normalizeQuestionSourceInfo(question.source_info);
}

function topValues(values: string[], limit = 3) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "zh-CN"))
    .slice(0, limit)
    .map((item) => item.value);
}

export function buildQuestionSourceStats(
  questions: SourceStatsQuestion[],
): QuestionSourceStats[] {
  const groups = new Map<string, SourceStatsQuestion[]>();

  for (const question of questions) {
    const sourceInfo = getQuestionSourceInfo(question);
    const key = `${sourceInfo.type}::${sourceInfo.name}`;
    const list = groups.get(key) ?? [];
    list.push(question);
    groups.set(key, list);
  }

  return Array.from(groups, ([key, items]) => {
    const firstSource = getQuestionSourceInfo(items[0]);
    const latest = items
      .map((item) => item.created_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => b.localeCompare(a))[0] ?? null;

    return {
      key,
      type: firstSource.type,
      name: firstSource.name,
      section: firstSource.section,
      parts: topValues(items.map((item) => getQuestionSourceInfo(item).part || "未分部分")),
      total_questions: items.length,
      wrong_questions: items.length,
      weak_chapters: topValues(items.map((item) => item.chapter ?? "待整理 / 未分类")),
      frequent_mistake_types: topValues(items.flatMap((item) => item.mistake_types ?? [])),
      latest_added_at: latest,
    };
  }).sort((a, b) => b.total_questions - a.total_questions || a.name.localeCompare(b.name, "zh-CN"));
}
