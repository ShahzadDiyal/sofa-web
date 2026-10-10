import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings, saveSettings } from "@/lib/db";

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
  return NextResponse.json({ settings });
}
