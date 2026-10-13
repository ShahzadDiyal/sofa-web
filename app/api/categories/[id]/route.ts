import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { deleteCategory, listCategories, logAudit, saveCategory } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const categories = await listCategories();
  const category = categories.find((c) => c.id === id || c.slug === id);
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json({ category });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  const category = await saveCategory({ ...body, id });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "category.update", entity: "category", entityId: id, summary: `Updated category "${category.name}"`, ip });
  return NextResponse.json({ category });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deleteCategory(id);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "category.delete", entity: "category", entityId: id, summary: `Deleted category ${id}`, ip });
  return NextResponse.json({ ok: true });
}
