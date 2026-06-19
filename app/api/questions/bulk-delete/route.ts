import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 100);
}

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown; all?: unknown };
  const ids = normalizeIds(body.ids);
  const deleteAll = body.all === true;

  if (!deleteAll && ids.length === 0) {
    return NextResponse.json({ error: "请选择要删除的错题。" }, { status: 400 });
  }

  let query = supabase
    .from("questions")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: deleteAll ? "bulk_clear_user_library" : "bulk_user_deleted",
    })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (!deleteAll) {
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deletedCount: data?.length ?? 0,
  });
}
