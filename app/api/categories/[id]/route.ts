import { NextResponse } from "next/server";
import { deleteCategory, listCategories, saveCategory } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await listCategories();
  const category = categories.find((c) => c.id === id || c.slug === id);
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json({ category });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const category = await saveCategory({ ...body, id });
  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteCategory(id);
  return NextResponse.json({ ok: true });
}
