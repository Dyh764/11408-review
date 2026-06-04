import { requireCronSecret, jsonResponse } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import {
  buildReportContent,
  listReportUserIds,
  parseJobDate,
  readJsonBody,
  upsertReport,
  weeklyRange,
} from "../_shared/report-utils.ts";

Deno.serve(async (request) => {
  const unauthorized = requireCronSecret(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = await readJsonBody(request);
  const { startDate, endDate } = weeklyRange(parseJobDate(body.date));
  const supabase = createAdminClient();
  const userIds = await listReportUserIds(supabase);
  const results: Array<{ user_id: string; status: "ok" | "failed"; error?: string }> = [];

  for (const userId of userIds) {
    try {
      const content = await buildReportContent(supabase, userId, "weekly", startDate, endDate);
      await upsertReport(supabase, userId, "weekly", startDate, endDate, content);
      results.push({ user_id: userId, status: "ok" });
    } catch (error) {
      console.error("weekly report failed", {
        user_id: userId,
        message: error instanceof Error ? error.message : "unknown error",
      });
      results.push({
        user_id: userId,
        status: "failed",
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return jsonResponse({
    type: "weekly",
    start_date: startDate,
    end_date: endDate,
    generated: results.filter((result) => result.status === "ok").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  });
});
