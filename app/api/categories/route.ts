import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listCategories, saveCategory } from "@/lib/db";

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
  return NextResponse.json({ category }, { status: 201 });
}
