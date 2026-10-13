import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { listFlashSales, logAudit, saveFlashSale } from "@/lib/db";

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
    template: body.template || undefined,
    animation: body.animation || undefined,
    displayMode: body.displayMode || undefined,
    closeable: body.closeable,
    bgColor: body.bgColor || undefined,
    contentHtml: body.contentHtml || undefined,
    customCss: body.customCss || undefined,
    productIds: Array.isArray(body.productIds) ? body.productIds.map(String) : [],
    pages: Array.isArray(body.pages) ? body.pages.map(String) : [],
    startsAt: body.startsAt || undefined,
    endsAt: body.endsAt || undefined,
    active: body.active !== false,
  });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "flashsale.create", entity: "flash_sale", entityId: sale.id, summary: `Created flash sale "${sale.title}"`, ip });
  return NextResponse.json({ sale }, { status: 201 });
}
