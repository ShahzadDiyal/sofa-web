import { NextResponse } from "next/server";
import { listProducts, saveProduct } from "@/lib/db";

export async function GET() {
  const products = await listProducts();
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || typeof body.price !== "number") {
    return NextResponse.json({ error: "name and numeric price are required" }, { status: 400 });
  }
  const product = await saveProduct(body);
  return NextResponse.json({ product }, { status: 201 });
}
