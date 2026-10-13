import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listVisits } from "@/lib/db";

/* Admin: visitor tracking rows (chat widget opens). */

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  const q = url.searchParams.get("q") ?? undefined;
  const { visits, total } = await listVisits({ limit, offset, q });
  return NextResponse.json({ visits, total });
}
