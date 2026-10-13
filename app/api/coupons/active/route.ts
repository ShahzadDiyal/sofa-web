import { NextResponse } from "next/server";
import { listActiveCoupons } from "@/lib/db";

/* Public: the storefront coupons page and checkout coupon visibility read
   the currently-usable coupons. Only the fields a shopper needs are exposed. */
export async function GET() {
  const coupons = await listActiveCoupons();
  return NextResponse.json({
    coupons: coupons.map((c) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      minSubtotal: c.minSubtotal ?? null,
      productIds: c.productIds ?? [],
      endsAt: c.endsAt ?? null,
    })),
  });
}
