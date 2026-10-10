import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/db";

/* Public: checkout calls this to validate a code before placing the order.
   The order total is always re-validated server-side in createOrder. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim();
  const subtotal = Math.max(0, Number(body?.subtotal) || 0);
  if (!code) return NextResponse.json({ valid: false, discount: 0, reason: "Enter a code." });
  const result = await validateCoupon(code, subtotal);
  if (!result.valid) return NextResponse.json({ valid: false, discount: 0, reason: result.reason });
  return NextResponse.json({
    valid: true,
    discount: result.discount,
    code: result.coupon!.code,
    type: result.coupon!.type,
    value: result.coupon!.value,
  });
}
