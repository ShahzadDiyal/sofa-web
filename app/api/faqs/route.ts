import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listFaqs, saveFaqs } from "@/lib/db";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ faqs: await listFaqs() });
}

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  if (!Array.isArray(body?.faqs)) {
    return NextResponse.json({ error: "faqs array required" }, { status: 400 });
  }
  return NextResponse.json({ faqs: await saveFaqs(body.faqs) });
}
