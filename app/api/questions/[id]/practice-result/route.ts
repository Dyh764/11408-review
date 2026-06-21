import { NextResponse } from "next/server";
import { todayIsoDate } from "@/lib/dates";
import { areChoiceAnswersEqual, parseAnswerChoiceLabels } from "@/lib/questions/answer-choice";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeSelectedLabels(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-Z]$/.test(item)),
    ),
  );
}

export async function POST(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { selectedLabels?: unknown };
  const selectedLabels = normalizeSelectedLabels(body.selectedLabels);

  if (selectedLabels.length === 0) {
    return NextResponse.json({ error: "请选择答案后再提交。" }, { status: 400 });
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id,standard_answer")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (questionError || !question) {
    return NextResponse.json(
      { error: questionError?.message ?? "错题不存在或已删除。" },
      { status: 404 },
    );
  }

  const parsedAnswer = parseAnswerChoiceLabels(question.standard_answer);
  if (parsedAnswer.labels.length === 0) {
    return NextResponse.json({ error: "这道题没有可自动判定的标准答案。" }, { status: 400 });
  }

  const correct = areChoiceAnswersEqual(selectedLabels, parsedAnswer.labels);
  const reviewResult = correct ? "mastered" : "wrong_again";
  const now = new Date().toISOString();
  const scheduledDate = todayIsoDate();

  const { error: reviewError } = await supabase.from("reviews").upsert(
    {
      user_id: user.id,
      question_id: id,
      scheduled_date: scheduledDate,
      completed_at: now,
      review_result: reviewResult,
    },
    { onConflict: "question_id,scheduled_date" },
  );

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  const { error: questionUpdateError } = await supabase
    .from("questions")
    .update(
      correct
        ? { review_priority: "low", mastery_status: "完全掌握" }
        : { review_priority: "high", mastery_status: "思路对但卡住" },
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (questionUpdateError) {
    return NextResponse.json({ error: questionUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    correct,
    correctLabels: parsedAnswer.labels,
    reviewResult,
  });
}
