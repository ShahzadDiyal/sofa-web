import { NextResponse } from "next/server";
import { getAdminEmail, requireAdmin } from "@/lib/admin-auth";
import { listProducts, logAudit, saveProduct } from "@/lib/db";

export async function GET() {
  const products = await listProducts();
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  if (!body?.name || typeof body.price !== "number") {
    return NextResponse.json({ error: "name and numeric price are required" }, { status: 400 });
  }
  const product = await saveProduct(body);
  const adminEmail = (await getAdminEmail()) ?? "unknown";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await logAudit({ adminEmail, action: "product.create", entity: "product", entityId: product.id, summary: `Created product "${product.name}"`, ip });
  return NextResponse.json({ product }, { status: 201 });
}
