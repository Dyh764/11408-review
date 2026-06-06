import { NextResponse } from "next/server";
import { enhanceQuestionWithAI, getAiProviderStatus } from "@/lib/ai/provider";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const status = getAiProviderStatus();

  if (!status.configured) {
    return NextResponse.json({ error: status.label }, { status: 400 });
  }

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
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select(
      "id,user_id,subject,chapter,knowledge_point,question_text,question_text_status,mastery_status,user_note,mistake_types,solution_summary,one_sentence_tip,review_priority,confidence,needs_manual_check",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: questionError?.message ?? "错题不存在。" }, { status: 404 });
  }

  const { data: reviewRows, error: reviewError } = await supabase
    .from("reviews")
    .select("scheduled_date,completed_at,review_result")
    .eq("question_id", id)
    .eq("user_id", user.id)
    .order("scheduled_date", { ascending: false })
    .limit(12);

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  try {
    const aiResult = await enhanceQuestionWithAI({
      subject: question.subject,
      chapter: question.chapter,
      knowledge_point: question.knowledge_point,
      question_text: question.question_text,
      question_text_status: question.question_text_status,
      mastery_status: question.mastery_status,
      user_note: question.user_note,
      mistake_types: question.mistake_types,
      solution_summary: question.solution_summary,
      one_sentence_tip: question.one_sentence_tip,
      review_history_summary: (reviewRows ?? []).map((review) => ({
        scheduled_date: review.scheduled_date,
        completed: Boolean(review.completed_at),
        result: review.review_result,
      })),
    });
    const enhancement = aiResult.result;

    const { error: updateError } = await supabase
      .from("questions")
      .update({
        chapter: enhancement.chapter,
        knowledge_point: enhancement.knowledge_point,
        mistake_types: enhancement.mistake_types,
        solution_summary: enhancement.solution_summary,
        one_sentence_tip: enhancement.one_sentence_tip,
        review_priority: enhancement.review_priority,
        confidence: enhancement.confidence,
        needs_manual_check: enhancement.needs_manual_check,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      source: aiResult.source,
      model: aiResult.model,
      message: "AI 优化完成，题目文字和用户备注已保留。",
      enhancement,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 优化失败。" },
      { status: 502 },
    );
  }
}
