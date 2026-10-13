import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { auditLogFacets, listAuditLogs } from "@/lib/db";

/* Admin audit trail. GET params: limit (default 50, max 200), offset,
   action, adminEmail, q (searches summary, entity id, admin email). */
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);
  const action = sp.get("action")?.trim() || undefined;
  const adminEmail = sp.get("adminEmail")?.trim() || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const [{ logs, total }, facets] = await Promise.all([
    listAuditLogs({ limit, offset, action, adminEmail, q }),
    auditLogFacets(),
  ]);
  return NextResponse.json({ logs, total, facets });
}
