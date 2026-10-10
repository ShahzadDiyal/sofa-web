import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteQuery, saveQuery } from "@/lib/db";

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
  return NextResponse.json({ query });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteQuery(id);
  return NextResponse.json({ ok: true });
}
