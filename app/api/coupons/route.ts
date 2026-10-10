import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listCoupons, saveCoupon } from "@/lib/db";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const coupons = await listCoupons();
  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body?.code || typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  if (body.type !== "percent" && body.type !== "fixed") {
    return NextResponse.json({ error: "type must be percent or fixed" }, { status: 400 });
  }
  const value = Number(body.value);
  if (!value || value <= 0 || (body.type === "percent" && value > 90)) {
    return NextResponse.json({ error: "enter a valid value (percent: 1–90)" }, { status: 400 });
  }
  const coupon = await saveCoupon({
    code: body.code,
    type: body.type,
    value,
    minSubtotal: body.minSubtotal ? Number(body.minSubtotal) : undefined,
    maxUses: body.maxUses ? Number(body.maxUses) : undefined,
    startsAt: body.startsAt || undefined,
    endsAt: body.endsAt || undefined,
    active: body.active !== false,
  });
  return NextResponse.json({ coupon }, { status: 201 });
}
