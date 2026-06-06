import { NextResponse } from "next/server";
import { generateLearningInsights, getAiProviderStatus } from "@/lib/ai/provider";
import { todayIsoDate } from "@/lib/dates";
import { buildRuleReportContent } from "@/lib/reports/rule-report";
import type { ReportType } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportTypes: ReportType[] = ["daily", "weekly", "monthly"];

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(dateKey: string) {
  return `${dateKey.slice(0, 8)}01`;
}

function getReportRange(type: ReportType) {
  const today = todayIsoDate();

  if (type === "daily") {
    return { today, startDate: today, endDate: today };
  }

  if (type === "weekly") {
    return { today, startDate: addDays(today, -6), endDate: today };
  }

  return { today, startDate: startOfMonth(today), endDate: today };
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as { type?: string; source?: string };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const type = reportTypes.includes(body.type as ReportType) ? (body.type as ReportType) : "daily";
  const source = body.source === "deepseek" || body.source === "ai" ? "ai" : "rule";

  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase 未配置。" }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const { today, startDate, endDate } = getReportRange(type);
  const [questionsResult, statsResult] = await Promise.all([
    supabase
      .from("questions")
      .select(
        "id,subject,chapter,knowledge_point,mastery_status,mistake_types,standard_answer,answer_status,created_at",
      )
      .eq("user_id", user.id)
      .is("deleted_at", null),
    supabase
      .from("knowledge_stats")
      .select("subject,chapter,knowledge_point,weakness_score,wrong_count")
      .eq("user_id", user.id),
  ]);

  const error = questionsResult.error ?? statsResult.error;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activeQuestionIds = (questionsResult.data ?? []).map((question) => question.id);
  const reviewsResult =
    activeQuestionIds.length > 0
      ? await supabase
          .from("reviews")
          .select("scheduled_date,completed_at,review_result,question_id")
          .eq("user_id", user.id)
          .in("question_id", activeQuestionIds)
      : { data: [], error: null };

  if (reviewsResult.error) {
    return NextResponse.json({ error: reviewsResult.error.message }, { status: 500 });
  }

  const content = buildRuleReportContent({
    type,
    startDate,
    endDate,
    today,
    questions: questionsResult.data ?? [],
    reviews: reviewsResult.data ?? [],
    knowledgeStats: statsResult.data ?? [],
  });
  let finalContent: Record<string, unknown> = content;
  let finalSource = "rule";

  if (source === "ai" && getAiProviderStatus().configured) {
    try {
      const insightResult = await generateLearningInsights({
        type,
        startDate,
        endDate,
        rule_summary: content.summary,
        frequent_mistake_types: content.frequent_mistake_types,
        weakest_knowledge_points: content.weakest_knowledge_points,
        next_actions: content.next_actions,
        recent_questions: (questionsResult.data ?? []).slice(0, 20).map((question) => ({
          subject: question.subject,
          chapter: question.chapter,
          knowledge_point: question.knowledge_point,
          mastery_status: question.mastery_status,
          mistake_types: question.mistake_types,
        })),
        recent_reviews: (reviewsResult.data ?? []).slice(0, 30).map((review) => ({
          scheduled_date: review.scheduled_date,
          completed: Boolean(review.completed_at),
          result: review.review_result,
        })),
      });
      const insight = insightResult.result;

      finalContent = {
        ...content,
        deepseek_analysis: insight,
        next_actions: insight.recommended_tasks.map((task) => ({
          title: task.title,
          detail: task.reason,
          count: task.estimated_minutes,
        })),
      };
      finalSource = insightResult.source;
    } catch (error) {
      finalContent = {
        ...content,
        ai_error: error instanceof Error ? error.message : "AI 分析失败，已保留规则版报告。",
      };
      finalSource = "rule_fallback";
    }
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .upsert(
      {
        user_id: user.id,
        type,
        start_date: startDate,
        end_date: endDate,
        content_json: {
          ...finalContent,
          source: finalSource,
          generated_by: finalSource,
        },
      },
      { onConflict: "user_id,type,start_date,end_date" },
    )
    .select("id,user_id,type,start_date,end_date,content_json,created_at")
    .single();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  return NextResponse.json({ report, source: finalSource });
}
