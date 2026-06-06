export const supabaseBucket =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ??
  process.env.SUPABASE_STORAGE_BUCKET ??
  "question-images";

export const defaultDeepSeekModel = "deepseek-v4-flash";
export const defaultGeminiModel = "gemini-2.5-flash";

export type AiProviderName = "gemini" | "deepseek" | "none";

export function getAiProviderName(): AiProviderName {
  const value = process.env.AI_PROVIDER;

  if (value === "gemini" || value === "deepseek" || value === "none") {
    return value;
  }

  return process.env.DEEPSEEK_API_KEY ? "deepseek" : "none";
}

export function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    model: process.env.DEEPSEEK_MODEL ?? defaultDeepSeekModel,
  };
}

export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? defaultGeminiModel,
  };
}

export function isDeepSeekConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabasePublicConfig() !== null;
}
