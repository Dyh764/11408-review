import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportType = "daily" | "weekly" | "monthly";

export type ReportRecord = {
  id: string;
  user_id: string;
  type: ReportType;
  start_date: string;
  end_date: string;
  content_json: unknown;
  created_at: string;
};

const reportColumns = `
  id,
  user_id,
  type,
  start_date,
  end_date,
  content_json,
  created_at
`;

export async function fetchCurrentUserReports(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("reports")
    .select(reportColumns)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ReportRecord[];
}
