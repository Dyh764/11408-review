import { NextResponse } from "next/server";
import { analyzeQuestionById } from "@/lib/ai/analyze-question";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "请先配置 Supabase 环境变量。", source: "mock" },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await _request.json().catch(() => ({}))) as {
      allowOverwriteQuestionText?: boolean;
    };
    const result = await analyzeQuestionById(supabase, id, {
      allowOverwriteQuestionText: body.allowOverwriteQuestionText === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "分析失败。",
      },
      { status: 500 },
    );
  }
}
