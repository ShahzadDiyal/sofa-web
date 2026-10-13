import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { deletePost, getPost, logAudit, savePost } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const lookup = searchParams.get("slug") ?? id;
  const post = await getPost(lookup);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const post = await savePost({ ...body, id });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "post.update", entity: "post", entityId: id, summary: `Updated blog post "${post.title}"`, ip });
  return NextResponse.json({ post });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await deletePost(id);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "post.delete", entity: "post", entityId: id, summary: `Deleted blog post ${id}`, ip });
  return NextResponse.json({ ok: true });
}
