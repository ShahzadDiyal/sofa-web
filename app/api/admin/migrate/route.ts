import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getLocalStore } from "@/lib/db";

/* One-time migration: local JSON store -> Firestore.
   Requires the Admin SDK service-account key (FIREBASE_* env vars).
   Safe to run once; skips collections that already have documents. */

export async function GET() {
  const f = adminDb();
  if (!f) {
    return NextResponse.json({
      configured: false,
      message: "Admin SDK not configured — add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to the server env.",
    });
  }
  const local = await getLocalStore();
  const counts: Record<string, number> = {};
  for (const [key, col] of [
    ["products", "products"],
    ["categories", "categories"],
    ["faqs", "faqs"],
    ["reviews", "reviews"],
    ["orders", "orders"],
  ] as const) {
    const snap = await f.collection(col).limit(1).get();
    counts[key] = snap.empty ? 0 : -1; // -1 = already has data, will be skipped
  }
  const settingsSnap = await f.collection("settings").doc("site").get();
  return NextResponse.json({
    configured: true,
    firestore: counts,
    settingsExists: settingsSnap.exists,
    local: {
      products: local.products.length,
      categories: local.categories.length,
      faqs: local.faqs.length,
      reviews: local.reviews.length,
      orders: local.orders.length,
    },
  });
}

export async function POST() {
  const f = adminDb();
  if (!f) {
    return NextResponse.json(
      { error: "Admin SDK not configured — add the Firebase service-account key to the server env first." },
      { status: 400 }
    );
  }
  const local = await getLocalStore();
  const migrated: Record<string, number> = {};

  const migrateCollection = async (col: string, docs: { id: string }[]) => {
    const snap = await f.collection(col).limit(1).get();
    if (!snap.empty) {
      migrated[col] = 0;
      return; // already has data — don't overwrite
    }
    let batch = f.batch();
    let writes = 0;
    for (const d of docs) {
      batch.set(f.collection(col).doc(d.id), d);
      writes++;
      if (writes >= 400) {
        await batch.commit();
        batch = f.batch();
        writes = 0;
      }
    }
    if (writes > 0) await batch.commit();
    migrated[col] = docs.length;
  };

  await migrateCollection("products", local.products);
  await migrateCollection("categories", local.categories);
  await migrateCollection("faqs", local.faqs);
  await migrateCollection("reviews", local.reviews);
  await migrateCollection("orders", local.orders);

  const batch = f.batch();
  const settingsSnap = await f.collection("settings").doc("site").get();
  if (!settingsSnap.exists) {
    batch.set(f.collection("settings").doc("site"), local.settings);
    migrated["settings"] = 1;
  } else {
    migrated["settings"] = 0;
  }

  const metaSnap = await f.collection("meta").doc("counters").get();
  if (!metaSnap.exists) {
    batch.set(f.collection("meta").doc("counters"), { orderSeq: local.orderSeq });
  }
  await batch.commit();

  return NextResponse.json({ ok: true, migrated });
}
