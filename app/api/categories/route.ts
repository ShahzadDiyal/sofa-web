import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { listCategories, logAudit, saveCategory } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ categories: await listCategories() });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const category = await saveCategory(body);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "category.create", entity: "category", entityId: category.id, summary: `Created category "${category.name}"`, ip });
  return NextResponse.json({ category }, { status: 201 });
}
