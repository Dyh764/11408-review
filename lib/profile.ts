import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
  const displayName = user.email?.split("@")[0] ?? null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      timezone,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}
