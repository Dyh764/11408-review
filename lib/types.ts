export type Subject = "数学" | "数据结构" | "计算机组成原理" | "操作系统" | "计算机网络";

export type MasteryStatus =
  | "完全没思路"
  | "有一点思路"
  | "思路对但卡住"
  | "计算错误"
  | "做对但不稳"
  | "完全掌握";

export type ReviewResult = "still_wrong" | "improved" | "mastered" | "wrong_again";

export type QuestionTextStatus = "ai_unverified" | "verified" | "needs_fix";

export type ReviewPriority = "low" | "medium" | "high";

export type Confidence = "low" | "medium" | "high";

export type Difficulty = "基础" | "中等" | "较难" | "压轴";

export type AnswerStatus = "ai_unverified" | "verified" | "needs_fix";

export type AnswerSource = "chatgpt_import" | "manual" | "ai_enhanced" | "unknown";

export type QuestionSource =
  | "upload"
  | "chatgpt_import"
  | "ai_analysis"
  | "manual"
  | "pending_chatgpt";

export type QuestionSourceInfo = {
  type: string;
  name: string;
  section: string;
  volume: string;
  paper: string;
  page: string;
  problem_number: string;
  raw: string;
};

export type ChoiceOption = {
  label: string;
  text: string;
};

export type RelatedPracticeQuestion = {
  question_text: string;
  choices: ChoiceOption[];
  correct_answer: "A" | "B" | "C" | "D";
  answer_explanation: string;
  knowledge_point: string;
  why_related: string;
  difficulty: "简单" | "中等" | "困难";
  rigor_check: string;
};

export type MockAnalysis = {
  question_text: string;
  question_text_status: QuestionTextStatus;
  subject: Subject;
  chapter: string;
  knowledge_point: string;
  mistake_types: string[];
  solution_summary: string;
  one_sentence_tip: string;
  review_priority: ReviewPriority;
  confidence: Confidence;
  needs_manual_check: boolean;
};

export type QuestionCard = {
  id: string;
  subject: Subject;
  chapter: string;
  knowledgePoint: string;
  masteryStatus: MasteryStatus;
  userNote: string;
  mistakeTypes: string[];
  oneSentenceTip: string;
  weaknessScore: number;
  nextReviewDate: string;
};
