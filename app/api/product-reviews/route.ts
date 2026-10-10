import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createProductReview, listProductReviews } from "@/lib/db";

/* GET is public — product pages and /reviews read from here. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") ?? undefined;
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit")) || 200));
  const reviews = (await listProductReviews(productId)).slice(0, limit);
  return NextResponse.json({ reviews, total: reviews.length });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body?.productId || !body?.productSlug || !body?.productName) {
    return NextResponse.json({ error: "productId, productSlug and productName are required" }, { status: 400 });
  }
  if (!body?.author || !body?.body) {
    return NextResponse.json({ error: "author and body are required" }, { status: 400 });
  }
  const review = await createProductReview({
    productId: String(body.productId),
    productSlug: String(body.productSlug),
    productName: String(body.productName),
    author: String(body.author),
    rating: Number(body.rating) || 5,
    title: typeof body.title === "string" ? body.title : undefined,
    body: String(body.body),
    location: typeof body.location === "string" ? body.location : undefined,
    verified: body.verified !== false,
  });
  return NextResponse.json({ review }, { status: 201 });
}
