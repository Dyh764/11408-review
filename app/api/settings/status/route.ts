import { NextResponse } from "next/server";
import { getAiProviderStatus } from "@/lib/ai/provider";
import {
  defaultDeepSeekModel,
  defaultGeminiModel,
  getAiProviderName,
  getSupabasePublicConfig,
  supabaseBucket,
} from "@/lib/env";

export async function GET() {
  const supabaseConfig = getSupabasePublicConfig();
  const ai = getAiProviderStatus();

  return NextResponse.json({
    AI_PROVIDER: getAiProviderName(),
    supabase: {
      configured: Boolean(supabaseConfig),
      urlConfigured: Boolean(supabaseConfig?.url),
      anonKeyConfigured: Boolean(supabaseConfig?.anonKey),
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      modelConfigured: Boolean(process.env.OPENAI_MODEL),
      optional: true,
      label: process.env.OPENAI_API_KEY ? "AI 自动分析：已配置" : "AI 自动分析：未启用（可选）",
    },
    ai,
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL ?? defaultGeminiModel,
      modelConfigured: Boolean(process.env.GEMINI_MODEL),
      optional: true,
      label: process.env.GEMINI_API_KEY ? "Gemini 已配置" : "Gemini 未启用（可选）",
    },
    aiProvider: getAiProviderName(),
    deepseek: {
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      model: process.env.DEEPSEEK_MODEL ?? defaultDeepSeekModel,
      modelConfigured: Boolean(process.env.DEEPSEEK_MODEL),
      optional: true,
      label: process.env.DEEPSEEK_API_KEY
        ? "DeepSeek 学习分析：已配置"
        : "DeepSeek 学习分析：未启用（可选）",
    },
    storage: {
      bucket: supabaseBucket,
      configured: Boolean(supabaseBucket),
    },
  });
}
