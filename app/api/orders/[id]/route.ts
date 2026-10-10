import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/db";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import type { Order, OrderStatus } from "@/lib/types";

const VALID: OrderStatus[] = ["new", "confirmed", "out_for_delivery", "delivered", "cancelled", "refused"];

/** Order minus contact PII — what the public confirmation page may show. */
function redactForBuyer(order: Order): Order {
  return {
    ...order,
    publicToken: "",
    customer: {
      name: order.customer.name,
      phone: "",
      email: undefined,
      address: order.customer.address,
      city: order.customer.city,
      postcode: order.customer.postcode,
      notes: undefined,
    },
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Admin sees everything.
  if (await getAdminEmail()) return NextResponse.json({ order });

  // The buyer sees their own order only with the unguessable token issued
  // at checkout (?t=...). Order numbers are sequential and not a secret.
  const token = new URL(req.url).searchParams.get("t");
  if (!token || !order.publicToken || token !== order.publicToken) {
    return NextResponse.json({ error: "Not authorised to view this order." }, { status: 403 });
  }
  return NextResponse.json({ order: redactForBuyer(order) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const order = await updateOrderStatus(id, body.status as OrderStatus, body.note);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ order });
}
