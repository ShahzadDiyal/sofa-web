import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { markNotificationsRead } from "@/lib/db";

/* Marks notifications read. Body: { ids?: string[], all?: true } */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.map(String).filter(Boolean) : [];
  const updated = await markNotificationsRead(body?.all === true ? "all" : ids);
  return NextResponse.json({ updated });
}
