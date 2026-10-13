import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { deleteFlashSale, logAudit, saveFlashSale } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const sale = await saveFlashSale({
    id,
    title: body.title,
    subtitle: body.subtitle,
    imageUrl: body.imageUrl,
    linkUrl: body.linkUrl,
    linkLabel: body.linkLabel,
    template: body.template,
    animation: body.animation,
    displayMode: body.displayMode,
    closeable: body.closeable,
    bgColor: body.bgColor,
    contentHtml: body.contentHtml,
    customCss: body.customCss,
    productIds: body.productIds === undefined ? undefined : Array.isArray(body.productIds) ? body.productIds.map(String) : [],
    pages: body.pages === undefined ? undefined : Array.isArray(body.pages) ? body.pages.map(String) : [],
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    active: body.active,
  });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "flashsale.update", entity: "flash_sale", entityId: id, summary: `Updated flash sale "${sale.title}"`, ip });
  return NextResponse.json({ sale });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteFlashSale(id);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "flashsale.delete", entity: "flash_sale", entityId: id, summary: `Deleted flash sale ${id}`, ip });
  return NextResponse.json({ ok: true });
}
