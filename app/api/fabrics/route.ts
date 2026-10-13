import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listFabrics, saveFabric } from "@/lib/db";

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
  return NextResponse.json({ fabric }, { status: 201 });
}
