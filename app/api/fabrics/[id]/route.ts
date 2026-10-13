import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteFabric, saveFabric } from "@/lib/db";

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
  return NextResponse.json({ fabric });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteFabric(id);
  return NextResponse.json({ ok: true });
}
