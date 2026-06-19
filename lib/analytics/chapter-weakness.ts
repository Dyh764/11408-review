type ChapterWeaknessQuestion = {
  knowledge_point?: string | null;
  mistake_types?: string[] | null;
  one_sentence_tip?: string | null;
  answer_explanation?: string | null;
};

export type FrequencyItem = {
  label: string;
  count: number;
};

export type ChapterWeaknessAnalysis = {
  total_questions: number;
  frequent_knowledge_points: FrequencyItem[];
  frequent_mistake_types: FrequencyItem[];
  weakness_summary: string[];
  next_review_suggestions: string[];
  one_sentence_diagnosis: string;
};

function topValues(values: string[], limit = 3): FrequencyItem[] {
  const counts = new Map<string, number>();
  const firstIndexes = new Map<string, number>();

  for (const [index, rawValue] of values.entries()) {
    const value = rawValue.trim();
    if (!value) continue;
    if (!firstIndexes.has(value)) {
      firstIndexes.set(value, index);
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || (firstIndexes.get(a.label) ?? 0) - (firstIndexes.get(b.label) ?? 0))
    .slice(0, limit);
}

function suggestionForMistake(type: string) {
  if (type.includes("概念") || type.includes("边界")) {
    return "先把高频知识点的概念边界写成对照表，再做同知识点选择题。";
  }

  if (type.includes("关键词") || type.includes("条件") || type.includes("题干")) {
    return "做题时先圈出题干关键词和限定条件，再看选项。";
  }

  if (type.includes("记忆")) {
    return "下一轮先复背本章高频术语和结论，再用题目检验记忆是否稳定。";
  }

  if (type.includes("选项")) {
    return "重做本章选项辨析题，逐项写出 A/B/C/D 错在哪里。";
  }

  return "优先复盘本章高频错因对应的题目，并把错因写成可检查的做题提醒。";
}

export function analyzeChapterWeakness(
  questions: ChapterWeaknessQuestion[],
): ChapterWeaknessAnalysis {
  const totalQuestions = questions.length;
  const frequentKnowledgePoints = topValues(
    questions.map((question) => question.knowledge_point ?? ""),
  );
  const frequentMistakeTypes = topValues(
    questions.flatMap((question) => question.mistake_types ?? []),
  );

  if (totalQuestions < 2 || (frequentKnowledgePoints.length === 0 && frequentMistakeTypes.length === 0)) {
    return {
      total_questions: totalQuestions,
      frequent_knowledge_points: frequentKnowledgePoints,
      frequent_mistake_types: frequentMistakeTypes,
      weakness_summary: ["本章错题数量较少，暂时只能做初步判断。"],
      next_review_suggestions: ["先补齐本章错题的知识点、错因和解析，再做稳定的章节判断。"],
      one_sentence_diagnosis: "本章数据还不够稳定，先补齐错题信息，再判断主要欠缺。",
    };
  }

  const primaryKnowledge = frequentKnowledgePoints[0]?.label;
  const primaryMistake = frequentMistakeTypes[0]?.label;
  const weaknessSummary = [
    primaryKnowledge ? `对“${primaryKnowledge}”相关概念掌握不够稳定。` : "",
    primaryMistake ? `高频错因集中在“${primaryMistake}”，需要先处理这一类判断失误。` : "",
    frequentKnowledgePoints.length > 1
      ? `本章还反复暴露在 ${frequentKnowledgePoints.slice(1).map((item) => `“${item.label}”`).join("、")}。`
      : "",
  ].filter(Boolean);
  const nextReviewSuggestions = [
    primaryKnowledge ? `先重背“${primaryKnowledge}”的定义、边界和典型陷阱。` : "",
    primaryMistake ? suggestionForMistake(primaryMistake) : "",
    "做题后逐项复述每个选项为什么对或错，避免只记答案。",
  ].filter(Boolean);

  return {
    total_questions: totalQuestions,
    frequent_knowledge_points: frequentKnowledgePoints,
    frequent_mistake_types: frequentMistakeTypes,
    weakness_summary: weaknessSummary.slice(0, 3),
    next_review_suggestions: [...new Set(nextReviewSuggestions)].slice(0, 3),
    one_sentence_diagnosis: primaryMistake
      ? `这一章的主要问题集中在 ${primaryMistake}，需要用高频知识点做概念边界校准。`
      : "这一章的主要问题集中在高频知识点，需要继续用错题校准概念边界。",
  };
}
