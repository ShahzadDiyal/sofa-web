import { NextResponse } from "next/server";
import { listFaqs, saveFaqs } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ faqs: await listFaqs() });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (!Array.isArray(body?.faqs)) {
    return NextResponse.json({ error: "faqs array required" }, { status: 400 });
  }
  return NextResponse.json({ faqs: await saveFaqs(body.faqs) });
}
