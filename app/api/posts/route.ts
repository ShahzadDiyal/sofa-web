import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listPosts, savePost } from "@/lib/db";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  const tag = searchParams.get("tag")?.trim().toLowerCase();
  const q = searchParams.get("q")?.trim().toLowerCase();

  let posts = await listPosts(!all);
  if (tag) posts = posts.filter((p) => p.tags.some((t) => t.toLowerCase() === tag));
  if (q) {
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const post = await savePost(body);
  return NextResponse.json({ post }, { status: 201 });
}
