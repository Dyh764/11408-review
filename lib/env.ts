export const supabaseBucket =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ??
  process.env.SUPABASE_STORAGE_BUCKET ??
  "question-images";

export const defaultDeepSeekModel = "deepseek-v4-flash";

export function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    model: process.env.DEEPSEEK_MODEL ?? defaultDeepSeekModel,
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
