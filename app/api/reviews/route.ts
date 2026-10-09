import { NextResponse } from "next/server";
import { listReviews, saveReviews } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ reviews: await listReviews() });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (!Array.isArray(body?.reviews)) {
    return NextResponse.json({ error: "reviews array required" }, { status: 400 });
  }
  return NextResponse.json({ reviews: await saveReviews(body.reviews) });
}
