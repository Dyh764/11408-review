import type { SupabaseClient, User } from "@supabase/supabase-js";
import { defaultTimeZone, normalizeTimeZone } from "@/lib/dates";

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const timezone = normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const displayName = user.email?.split("@")[0] ?? null;

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile) {
    return;
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName,
    timezone,
  });

  if (error) {
    throw error;
  }
}

export async function fetchCurrentProfile(supabase: SupabaseClient, user: User) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, timezone, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    await ensureProfile(supabase, user);
    return {
      id: user.id,
      display_name: user.email?.split("@")[0] ?? null,
      timezone: defaultTimeZone,
      created_at: "",
      updated_at: "",
    } satisfies ProfileRecord;
  }

  return data as ProfileRecord;
}

export async function updateCurrentProfileTimezone(
  supabase: SupabaseClient,
  user: User,
  timezone: string,
) {
  const normalized = normalizeTimeZone(timezone);
  const { error } = await supabase
    .from("profiles")
    .update({ timezone: normalized })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  return normalized;
}
