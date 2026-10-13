import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { listCoupons, listOrders, logAudit, saveCoupon } from "@/lib/db";
import { sendNewCouponEmails } from "@/lib/email";

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
    productIds: Array.isArray(body.productIds) ? body.productIds.map(String) : [],
    startsAt: body.startsAt || undefined,
    endsAt: body.endsAt || undefined,
    active: body.active !== false,
  });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "coupon.create", entity: "coupon", entityId: coupon.id, summary: `Created coupon "${coupon.code}"`, ip });
  // Announce the new coupon to every customer (unique emails from orders).
  if (coupon.active !== false) {
    const seen = new Set<string>();
    const recipients: { name?: string; email: string }[] = [];
    for (const o of await listOrders().catch(() => [])) {
      const email = o.customer.email?.trim().toLowerCase();
      if (email && !seen.has(email)) {
        seen.add(email);
        recipients.push({ name: o.customer.name, email });
      }
    }
    void sendNewCouponEmails(coupon, recipients);
  }
  return NextResponse.json({ coupon }, { status: 201 });
}
