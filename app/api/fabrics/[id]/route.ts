import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { deleteFabric, logAudit, saveFabric } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  if (body?.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    return NextResponse.json({ error: "name must not be empty" }, { status: 400 });
  }
  const fabric = await saveFabric({
    id,
    name: body.name,
  });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "fabric.update", entity: "fabric", entityId: id, summary: `Updated fabric "${fabric.name}"`, ip });
  return NextResponse.json({ fabric });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteFabric(id);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "fabric.delete", entity: "fabric", entityId: id, summary: `Deleted fabric ${id}`, ip });
  return NextResponse.json({ ok: true });
}
