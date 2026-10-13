import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { deleteCoupon, logAudit, saveCoupon } from "@/lib/db";

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
    productIds: body.productIds === undefined ? undefined : Array.isArray(body.productIds) ? body.productIds.map(String) : [],
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    active: body.active,
  });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "coupon.update", entity: "coupon", entityId: id, summary: `Updated coupon "${coupon.code}"`, ip });
  return NextResponse.json({ coupon });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteCoupon(id);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "coupon.delete", entity: "coupon", entityId: id, summary: `Deleted coupon ${id}`, ip });
  return NextResponse.json({ ok: true });
}
