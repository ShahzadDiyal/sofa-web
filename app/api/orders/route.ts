import { NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export async function GET() {
  // Full order list (names, phones, addresses) — admin only.
  const denied = await requireAdmin();
  if (denied) return denied;
  const orders = await listOrders();
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const body = await req.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  const c = body?.customer ?? {};

  if (items.length === 0) {
    return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  }
  if (!c.name?.trim() || c.name.trim().length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!/^\+?[0-9\s\-()]{7,18}$/.test(c.phone?.trim() ?? "")) {
    return NextResponse.json({ error: "Please enter a valid UK phone number." }, { status: 400 });
  }
  if (!c.address?.trim() || !c.city?.trim()) {
    return NextResponse.json({ error: "Please enter your delivery address and town/city." }, { status: 400 });
  }
  if (!UK_POSTCODE.test(c.postcode?.trim() ?? "")) {
    return NextResponse.json({ error: "Please enter a valid UK postcode." }, { status: 400 });
  }
  if (!["cash", "card", "bank_transfer"].includes(body.paymentMethod)) {
    return NextResponse.json({ error: "Please choose how you'll pay the driver." }, { status: 400 });
  }

  // Never trust client-side prices — re-price from the catalogue.
  const { getProduct } = await import("@/lib/db");
  const priced = [];
  for (const it of items) {
    const p = await getProduct(String(it.productId ?? it.slug));
    if (!p || !p.inStock) {
      return NextResponse.json({ error: `Sorry, "${it.name ?? "an item"}" is no longer available.` }, { status: 400 });
    }
    const qty = Math.max(1, Math.min(10, Number(it.qty) || 1));
    priced.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      qty,
      fabric: p.fabric,
      bg: p.bg,
      type: p.type,
    });
  }

  const order = await createOrder({
    items: priced,
    customer: {
      name: c.name.trim(),
      phone: c.phone.trim(),
      email: c.email?.trim() || undefined,
      address: c.address.trim(),
      city: c.city.trim(),
      postcode: c.postcode.trim().toUpperCase(),
      notes: c.notes?.trim() || undefined,
    },
    deliverySlot: body.deliverySlot || undefined,
    paymentMethod: body.paymentMethod,
    couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
  });

  return NextResponse.json({ order }, { status: 201 });
}
