import { NextResponse } from "next/server";
import { defaultDeepSeekModel, getSupabasePublicConfig, supabaseBucket } from "@/lib/env";

export async function GET() {
  const supabaseConfig = getSupabasePublicConfig();

  return NextResponse.json({
    supabase: {
      configured: Boolean(supabaseConfig),
      urlConfigured: Boolean(supabaseConfig?.url),
      anonKeyConfigured: Boolean(supabaseConfig?.anonKey),
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      modelConfigured: Boolean(process.env.OPENAI_MODEL),
      optional: true,
      label: process.env.OPENAI_API_KEY ? "AI 自动分析：已启用" : "AI 自动分析：未启用（可选）",
    },
    deepseek: {
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      model: process.env.DEEPSEEK_MODEL ?? defaultDeepSeekModel,
      modelConfigured: Boolean(process.env.DEEPSEEK_MODEL),
      optional: true,
      label: process.env.DEEPSEEK_API_KEY
        ? "DeepSeek 学习分析：已启用"
        : "DeepSeek 学习分析：未启用（可选）",
    },
    storage: {
      bucket: supabaseBucket,
      configured: Boolean(supabaseBucket),
    },
  });
}
