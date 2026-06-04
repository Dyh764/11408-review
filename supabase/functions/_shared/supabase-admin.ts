import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type AdminClient = SupabaseClient;

export const storageBucket = Deno.env.get("SUPABASE_STORAGE_BUCKET") ?? "question-images";

export function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service configuration is missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
