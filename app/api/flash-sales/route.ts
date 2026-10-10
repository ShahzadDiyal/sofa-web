import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listFlashSales, saveFlashSale } from "@/lib/db";

/* GET is public — the storefront reads the active banner from the list. */
export async function GET() {
  const sales = await listFlashSales();
  return NextResponse.json({ sales });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const sale = await saveFlashSale({
    title: body.title,
    subtitle: body.subtitle || undefined,
    imageUrl: body.imageUrl || undefined,
    linkUrl: body.linkUrl || undefined,
    linkLabel: body.linkLabel || undefined,
    startsAt: body.startsAt || undefined,
    endsAt: body.endsAt || undefined,
    active: body.active !== false,
  });
  return NextResponse.json({ sale }, { status: 201 });
}
