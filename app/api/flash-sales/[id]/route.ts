import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteFlashSale, saveFlashSale } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const sale = await saveFlashSale({
    id,
    title: body.title,
    subtitle: body.subtitle,
    imageUrl: body.imageUrl,
    linkUrl: body.linkUrl,
    linkLabel: body.linkLabel,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    active: body.active,
  });
  return NextResponse.json({ sale });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteFlashSale(id);
  return NextResponse.json({ ok: true });
}
