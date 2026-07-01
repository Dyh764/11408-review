import { NextResponse } from "next/server";
import { exportQuestionCard } from "@/lib/share/question-card";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id,subject,chapter,knowledge_point,difficulty,question_text,choices,mistake_types,one_sentence_tip,standard_answer,answer_explanation",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "错题不存在或已删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    questionId: data.id,
    card: exportQuestionCard(data),
  });
}
