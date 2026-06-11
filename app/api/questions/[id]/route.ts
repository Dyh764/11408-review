import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedStatuses = ["verified", "needs_fix"] as const;

async function readDeleteReason(request: Request) {
  try {
    const body = (await request.json()) as { deleted_reason?: unknown };
    return typeof body.deleted_reason === "string" ? body.deleted_reason.trim().slice(0, 240) : null;
  } catch {
    return null;
  }
}

async function readStatusUpdate(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    question_text_status?: unknown;
    answer_status?: unknown;
  };
  const updatePayload: {
    question_text_status?: (typeof allowedStatuses)[number];
    answer_status?: (typeof allowedStatuses)[number];
  } = {};

  if (
    typeof body.question_text_status === "string" &&
    allowedStatuses.includes(body.question_text_status as (typeof allowedStatuses)[number])
  ) {
    updatePayload.question_text_status = body.question_text_status as (typeof allowedStatuses)[number];
  }

  if (
    typeof body.answer_status === "string" &&
    allowedStatuses.includes(body.answer_status as (typeof allowedStatuses)[number])
  ) {
    updatePayload.answer_status = body.answer_status as (typeof allowedStatuses)[number];
  }

  return updatePayload;
}

export async function PATCH(request: Request, context: RouteContext) {
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
  const updatePayload = await readStatusUpdate(request);

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "没有可更新的核对状态。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("questions")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id,question_text_status,answer_status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "错题不存在或已删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    question: data,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
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
  const deletedReason = await readDeleteReason(request);

  // TODO: hard delete storage object after explicit confirmation.
  const { data, error } = await supabase
    .from("questions")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: deletedReason,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id,deleted_at,deleted_reason")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "错题不存在或已删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    question: data,
  });
}
