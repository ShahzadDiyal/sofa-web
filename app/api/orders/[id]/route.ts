import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/db";
import type { OrderStatus } from "@/lib/types";

const VALID: OrderStatus[] = ["new", "confirmed", "out_for_delivery", "delivered", "cancelled", "refused"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const order = await updateOrderStatus(id, body.status as OrderStatus, body.note);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ order });
}
