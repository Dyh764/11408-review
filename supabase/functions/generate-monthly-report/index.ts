import { requireCronSecret, jsonResponse } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import {
  buildReportContent,
  isLastDayOfMonth,
  listReportUserIds,
  monthlyRange,
  parseJobDate,
  readJsonBody,
  upsertReport,
} from "../_shared/report-utils.ts";

Deno.serve(async (request) => {
  const unauthorized = requireCronSecret(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = await readJsonBody(request);
  const jobDate = parseJobDate(body.date);
  const force = body.force === true;

  if (!force && !isLastDayOfMonth(jobDate)) {
    return jsonResponse({
      type: "monthly",
      skipped: true,
      reason: "not_last_day_of_month",
      date: jobDate.toISOString().slice(0, 10),
    });
  }

  const { startDate, endDate } = monthlyRange(jobDate);
  const supabase = createAdminClient();
  const userIds = await listReportUserIds(supabase);
  const results: Array<{ user_id: string; status: "ok" | "failed"; error?: string }> = [];

  for (const userId of userIds) {
    try {
      const content = await buildReportContent(supabase, userId, "monthly", startDate, endDate);
      await upsertReport(supabase, userId, "monthly", startDate, endDate, content);
      results.push({ user_id: userId, status: "ok" });
    } catch (error) {
      console.error("monthly report failed", {
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
    type: "monthly",
    start_date: startDate,
    end_date: endDate,
    generated: results.filter((result) => result.status === "ok").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  });
});
