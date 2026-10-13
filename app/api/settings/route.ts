import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { getSettings, logAudit, saveSettings } from "@/lib/db";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  const settings = await saveSettings(body);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "settings.update", entity: "settings", summary: "Updated store settings", ip });
  return NextResponse.json({ settings });
}
