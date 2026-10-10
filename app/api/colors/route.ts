import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listColors, saveColor } from "@/lib/db";

/* GET is public — the storefront colour filter reads the managed palette. */
export async function GET() {
  const colors = await listColors();
  return NextResponse.json({ colors });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const color = await saveColor({
    name: body.name,
    hex: typeof body.hex === "string" ? body.hex : undefined,
    imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : undefined,
  });
  return NextResponse.json({ color }, { status: 201 });
}
