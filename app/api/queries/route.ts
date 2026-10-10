import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createQuery, listQueries } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* POST is public — the contact page form. Basic validation + length caps
   keep junk out; the admin triages from /admin/queries. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();
  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (subject.length < 3) return NextResponse.json({ error: "Please add a subject." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Please write your message (at least 10 characters)." }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  const query = await createQuery({ name, email, phone: phone || undefined, subject, message });
  return NextResponse.json({ query }, { status: 201 });
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const queries = await listQueries();
  return NextResponse.json({ queries });
}
