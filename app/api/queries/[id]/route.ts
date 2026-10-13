import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { deleteQuery, logAudit, saveQuery } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: { status?: "new" | "read" | "replied"; reply?: string } = {};
  if (body?.status === "new" || body?.status === "read" || body?.status === "replied") {
    patch.status = body.status;
  }
  if (typeof body?.reply === "string") patch.reply = body.reply;
  const query = await saveQuery(id, patch);
  if (!query) return NextResponse.json({ error: "Query not found." }, { status: 404 });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  if (patch.reply !== undefined) {
    await logAudit({ adminEmail, action: "query.reply", entity: "query", entityId: id, summary: `Replied to query from "${query.name}"`, ip });
  } else if (patch.status) {
    await logAudit({ adminEmail, action: "query.status", entity: "query", entityId: id, summary: `Query from "${query.name}" → ${patch.status}`, ip });
  }
  return NextResponse.json({ query });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteQuery(id);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "query.delete", entity: "query", entityId: id, summary: `Deleted query ${id}`, ip });
  return NextResponse.json({ ok: true });
}
