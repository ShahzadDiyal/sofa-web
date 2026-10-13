import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/db";

/* Public: checkout calls this to validate a code before placing the order.
   The order total is always re-validated server-side in createOrder. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim();
  const subtotal = Math.max(0, Number(body?.subtotal) || 0);
  const items = Array.isArray(body?.items)
    ? body.items
        .filter((i: unknown) => i && typeof i === "object")
        .map((i: { productId?: unknown; price?: unknown; qty?: unknown }) => ({
          productId: String(i.productId ?? ""),
          price: Math.max(0, Number(i.price) || 0),
          qty: Math.max(0, Number(i.qty) || 0),
        }))
        .filter((i: { productId: string }) => i.productId)
    : undefined;
  if (!code) return NextResponse.json({ valid: false, discount: 0, reason: "Enter a code." });
  const result = await validateCoupon(code, subtotal, items);
  if (!result.valid) return NextResponse.json({ valid: false, discount: 0, reason: result.reason });
  return NextResponse.json({
    valid: true,
    discount: result.discount,
    code: result.coupon!.code,
    type: result.coupon!.type,
    value: result.coupon!.value,
  });
}
