import { NextResponse } from "next/server";
import { getSupabasePublicConfig, supabaseBucket } from "@/lib/env";

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
    },
    storage: {
      bucket: supabaseBucket,
      configured: Boolean(supabaseBucket),
    },
  });
}
