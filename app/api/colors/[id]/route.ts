import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteColor, saveColor } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  if (body?.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    return NextResponse.json({ error: "name must not be empty" }, { status: 400 });
  }
  const color = await saveColor({
    id,
    // undefined = leave unchanged; "" = clear the field.
    name: body.name,
    hex: body.hex === undefined ? undefined : body.hex || null,
    imageUrl: body.imageUrl === undefined ? undefined : body.imageUrl.trim() || null,
  });
  return NextResponse.json({ color });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteColor(id);
  return NextResponse.json({ ok: true });
}
