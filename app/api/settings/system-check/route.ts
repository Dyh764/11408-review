import { NextResponse } from "next/server";
import { getProductionConfigCheck } from "@/lib/production-config-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getProductionConfigCheck();

  return NextResponse.json(result);
}
