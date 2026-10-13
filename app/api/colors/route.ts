import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { listColors, logAudit, saveColor } from "@/lib/db";

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
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "color.create", entity: "color", entityId: color.id, summary: `Created colour "${color.name}"`, ip });
  return NextResponse.json({ color }, { status: 201 });
}
