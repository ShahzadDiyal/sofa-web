import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { listFaqs, logAudit, saveFaqs } from "@/lib/db";

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
  const faqs = await saveFaqs(body.faqs);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "faq.update", entity: "faq", summary: `Updated FAQs (${faqs.length} items)`, ip });
  return NextResponse.json({ faqs });
}
