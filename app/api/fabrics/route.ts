import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { listFabrics, logAudit, saveFabric } from "@/lib/db";

/* GET is public — the sofa form fabric picker and storefront fabric filter
   read the managed fabric library. */
export async function GET() {
  const fabrics = await listFabrics();
  return NextResponse.json({ fabrics });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const fabric = await saveFabric({ name: body.name.trim() });
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "fabric.create", entity: "fabric", entityId: fabric.id, summary: `Created fabric "${fabric.name}"`, ip });
  return NextResponse.json({ fabric }, { status: 201 });
}
