import { getAiProviderName } from "@/lib/env";
import {
  enhanceQuestionWithDeepSeek,
  generateMotivationLineWithDeepSeek,
  generateLearningInsightWithDeepSeek,
  getDeepSeekStatus,
} from "@/lib/ai/deepseek";
import {
  enhanceQuestionWithGemini,
  generateMotivationLineWithGemini,
  generateLearningInsightWithGemini,
  getGeminiStatus,
} from "@/lib/ai/gemini";

const aiProviderEnvName = "AI_PROVIDER";
const supportedProviders = ["gemini", "deepseek", "none"] as const;

export function getAiProviderStatus() {
  const provider = getAiProviderName();
  const gemini = getGeminiStatus();
  const deepseek = getDeepSeekStatus();

  return {
    provider,
    envName: aiProviderEnvName,
    supportedProviders,
    configured:
      (provider === "gemini" && gemini.configured) ||
      (provider === "deepseek" && deepseek.configured),
    label:
      provider === "gemini"
        ? gemini.configured
          ? "Gemini 已配置"
          : "Gemini 未启用（可选）"
        : provider === "deepseek"
          ? deepseek.configured
            ? "DeepSeek 已配置"
            : "DeepSeek 未启用（可选）"
          : "未启用（可选）",
    model: provider === "gemini" ? gemini.model : provider === "deepseek" ? deepseek.model : "",
    gemini,
    deepseek,
  };
}

export async function enhanceQuestionWithAI(input: unknown) {
  const status = getAiProviderStatus();

  if (status.provider === "gemini") {
    return { source: "gemini", model: status.gemini.model, result: await enhanceQuestionWithGemini(input) };
  }

  if (status.provider === "deepseek") {
    return { source: "deepseek", model: status.deepseek.model, result: await enhanceQuestionWithDeepSeek(input) };
  }

  throw new Error("AI 学习分析未启用（可选）。");
}

export async function generateLearningInsights(input: unknown) {
  const status = getAiProviderStatus();

  if (status.provider === "gemini") {
    return { source: "gemini", model: status.gemini.model, result: await generateLearningInsightWithGemini(input) };
  }

  if (status.provider === "deepseek") {
    return { source: "deepseek", model: status.deepseek.model, result: await generateLearningInsightWithDeepSeek(input) };
  }

  throw new Error("AI 学习分析未启用（可选）。");
}

export async function generateReportWithAI(input: unknown) {
  return generateLearningInsights(input);
}

export async function generateMotivationLineWithAI(input: unknown) {
  const status = getAiProviderStatus();

  if (status.provider === "gemini") {
    return generateMotivationLineWithGemini(input);
  }

  if (status.provider === "deepseek") {
    return generateMotivationLineWithDeepSeek(input);
  }

  throw new Error("AI 每日激励句未启用（可选）。");
}
