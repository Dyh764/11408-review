import { NextResponse } from "next/server";
import { generateMotivationLineWithAI } from "@/lib/ai/provider";
import {
  buildMotivationCacheKey,
  getDailyMotivation,
  normalizeMotivationResponse,
} from "@/lib/motivation";
import { todayIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const dailyCache = new Map<string, string>();

export async function GET() {
  const dateKey = todayIsoDate();
  const fallback = getDailyMotivation(dateKey);
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    : { data: { user: null } };
  const cacheKey = buildMotivationCacheKey(user?.id ?? null, dateKey);

  if (!user) {
    return NextResponse.json({ message: fallback, fallback, dateKey, cacheKey, source: "fallback" });
  }

  const cached = dailyCache.get(cacheKey);

  if (cached) {
    return NextResponse.json({ message: cached, fallback, dateKey, cacheKey, source: "cache" });
  }

  try {
    const generated = await generateMotivationLineWithAI({
      date: dateKey,
      purpose: "考研 11408 错题复盘每日短句",
      constraints: [
        "原创中文短句",
        "温柔、积极、有一点诗意",
        "不要真实歌词",
        "不要模仿任何歌手",
        "不要声称来自某位歌手",
      ],
    });
    const message = normalizeMotivationResponse(generated, dateKey);

    dailyCache.set(cacheKey, message);

    return NextResponse.json({ message, fallback, dateKey, cacheKey, source: "ai" });
  } catch {
    dailyCache.set(cacheKey, fallback);

    return NextResponse.json({ message: fallback, fallback, dateKey, cacheKey, source: "fallback" });
  }
}
