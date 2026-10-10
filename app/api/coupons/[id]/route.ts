import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteCoupon, saveCoupon } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const coupon = await saveCoupon({
    id,
    code: body.code,
    type: body.type,
    value: body.value !== undefined ? Number(body.value) : undefined,
    minSubtotal: body.minSubtotal === undefined ? undefined : body.minSubtotal === "" ? "" : Number(body.minSubtotal),
    maxUses: body.maxUses === undefined ? undefined : body.maxUses === "" ? "" : Number(body.maxUses),
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    active: body.active,
  });
  return NextResponse.json({ coupon });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteCoupon(id);
  return NextResponse.json({ ok: true });
}
