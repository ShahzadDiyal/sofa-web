import { NextResponse } from "next/server";
import { identifyVisit, recordVisit } from "@/lib/db";

/* Public: the chat widget calls this when a visitor opens it, and again
   (PATCH) with their identity after they submit the chat form.
   Never fails the storefront — tracking must not break browsing. */

function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  return ip || undefined;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const page = String(body?.page ?? "").trim().slice(0, 512);
  if (!page) return NextResponse.json({ error: "Missing page." }, { status: 400 });
  const timeOnSite = Number.isFinite(Number(body?.timeOnSite)) ? Math.max(0, Math.round(Number(body.timeOnSite))) : undefined;
  const visit = await recordVisit({
    page,
    timeOnSite,
    name: typeof body?.name === "string" ? body.name : undefined,
    email: typeof body?.email === "string" ? body.email : undefined,
    phone: typeof body?.phone === "string" ? body.phone : undefined,
    ip: clientIp(req),
  });
  return NextResponse.json({ visit }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const ok = await identifyVisit(id, {
    name: typeof body?.name === "string" ? body.name : undefined,
    email: typeof body?.email === "string" ? body.email : undefined,
    phone: typeof body?.phone === "string" ? body.phone : undefined,
  });
  return NextResponse.json({ ok });
}
