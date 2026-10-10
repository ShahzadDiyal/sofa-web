/* One-time import: Firestore → MySQL.
   ------------------------------------------------------------------
   Run ONCE from the project root after creating the schema:

     node scripts/import-firestore-to-mysql.mjs

   Needs .env with BOTH:
     FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
     DATABASE_URL  (mysql://user:pass@host:3306/dbname)

   Idempotent — every row is upserted, so re-running is safe. Firestore
   is left untouched. */

import admin from "firebase-admin";
import mysql from "mysql2/promise";
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const fsdb = admin.firestore();
const pool = mysql.createPool({ uri: env.DATABASE_URL, dateStrings: true });

const B = (v) => (v ? 1 : 0);
const N = (v) => (v === undefined || v === null ? null : v);
const J = (v) => (v === undefined || v === null ? null : JSON.stringify(v));

async function upsert(table, row) {
  const cols = Object.keys(row);
  const updates = cols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(",");
  await pool.query(
    `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES (${cols.map(() => "?").join(",")}) ON DUPLICATE KEY UPDATE ${updates}`,
    cols.map((c) => row[c])
  );
}

const counts = {};
async function importCollection(fsCol, table, map) {
  const snap = await fsdb.collection(fsCol).get();
  let n = 0;
  for (const d of snap.docs) {
    await upsert(table, map(d.id, d.data()));
    n++;
  }
  counts[table] = n;
  console.log(`${fsCol} → ${table}: ${n} rows`);
}

await importCollection("products", "products", (id, d) => ({
  id, slug: N(d.slug), name: d.name, sub: N(d.sub), description: N(d.description),
  price: d.price ?? 0, wasPrice: N(d.wasPrice), category: N(d.category), type: N(d.type),
  fabric: N(d.fabric), fabricName: N(d.fabricName), bg: N(d.bg), accent: N(d.accent),
  tag: N(d.tag), imageUrl: N(d.imageUrl), colorImages: J(d.colorImages), sku: N(d.sku),
  seats: N(d.seats), fabricType: N(d.fabricType), colourName: N(d.colourName),
  features: J(d.features), rating: N(d.rating), reviewCount: N(d.reviewCount),
  inStock: B(d.inStock !== false), featured: B(d.featured),
  details: J(d.details), createdAt: N(d.createdAt), updatedAt: N(d.updatedAt),
}));

await importCollection("categories", "categories", (id, d) => ({
  id, slug: N(d.slug), name: d.name, type: N(d.type), fabric: N(d.fabric), bg: N(d.bg),
  blurb: N(d.blurb), menu: N(d.menu), imageUrl: N(d.imageUrl),
}));

await importCollection("colors", "colors", (id, d) => ({
  id, name: d.name, hex: N(d.hex), imageUrl: N(d.imageUrl),
  createdAt: N(d.createdAt), updatedAt: N(d.updatedAt),
}));

await importCollection("productReviews", "product_reviews", (id, d) => ({
  id, productId: d.productId, productSlug: N(d.productSlug), productName: N(d.productName),
  author: d.author, location: N(d.location), rating: d.rating ?? 5, title: N(d.title),
  body: N(d.body), verified: B(d.verified), createdAt: N(d.createdAt),
}));

await importCollection("queries", "queries", (id, d) => ({
  id, name: d.name, email: d.email, phone: N(d.phone), subject: N(d.subject),
  message: N(d.message), status: d.status ?? "new", reply: N(d.reply),
  repliedAt: N(d.repliedAt), createdAt: N(d.createdAt), updatedAt: N(d.updatedAt),
}));

await importCollection("coupons", "coupons", (id, d) => ({
  id, code: d.code, type: d.type ?? "percent", value: d.value ?? 0,
  minSubtotal: N(d.minSubtotal), maxUses: N(d.maxUses), usedCount: d.usedCount ?? 0,
  startsAt: N(d.startsAt), endsAt: N(d.endsAt), active: B(d.active !== false),
  createdAt: N(d.createdAt), updatedAt: N(d.updatedAt),
}));

await importCollection("flashSales", "flash_sales", (id, d) => ({
  id, title: d.title, subtitle: N(d.subtitle), imageUrl: N(d.imageUrl),
  linkUrl: N(d.linkUrl), linkLabel: N(d.linkLabel), startsAt: N(d.startsAt),
  endsAt: N(d.endsAt), active: B(d.active !== false),
  createdAt: N(d.createdAt), updatedAt: N(d.updatedAt),
}));

await importCollection("posts", "posts", (id, d) => ({
  id, slug: N(d.slug), title: d.title, excerpt: N(d.excerpt), content: N(d.content),
  coverColor: N(d.coverColor), tags: J(d.tags ?? []), status: d.status ?? "draft",
  metaTitle: N(d.metaTitle), metaDescription: N(d.metaDescription),
  publishedAt: N(d.publishedAt), updatedAt: N(d.updatedAt),
  readingMinutes: d.readingMinutes ?? 1, authorName: N(d.authorName), faqJson: J(d.faqJson),
}));

await importCollection("reviews", "reviews", (id, d) => ({
  id, quote: N(d.quote), author: N(d.author), location: N(d.location),
  rating: d.rating ?? 5, order: d.order ?? 0,
}));

await importCollection("orders", "orders", (id, d) => ({
  id, number: d.number, publicToken: N(d.publicToken), items: J(d.items ?? []),
  subtotal: d.subtotal ?? 0, deliveryFee: d.deliveryFee ?? 0, discount: N(d.discount),
  couponCode: N(d.couponCode), total: d.total ?? 0, customer: J(d.customer ?? {}),
  deliverySlot: N(d.deliverySlot), paymentMethod: d.paymentMethod ?? "cash",
  status: d.status ?? "new", timeline: J(d.timeline ?? []),
  createdAt: N(d.createdAt), updatedAt: N(d.updatedAt),
}));

await importCollection("users", "users", (id, d) => ({
  email: (d.email ?? id).toLowerCase(), password: d.password ?? "",
  role: d.role === "admin" ? "admin" : "user",
  createdAt: N(d.createdAt), updatedAt: N(d.updatedAt),
}));

// settings/site → settings row
{
  const doc = await fsdb.collection("settings").doc("site").get();
  if (doc.exists) {
    const d = doc.data();
    await upsert("settings", {
      id: "site",
      announcementBar: J(d.announcementBar ?? []),
      freeDeliveryThreshold: d.freeDeliveryThreshold ?? 0,
      acceptedPayments: J(d.acceptedPayments ?? []),
      deliveryTimeText: N(d.deliveryTimeText),
      confirmationCallText: N(d.confirmationCallText),
      refusalPolicy: N(d.refusalPolicy),
      phone: N(d.phone), email: N(d.email), address: N(d.address),
      trustpilotRating: N(d.trustpilotRating),
    });
    counts["settings"] = 1;
    console.log("settings/site → settings: 1 row");
  }
}

// Carry the order-number counter across so numbers don't restart/collide.
{
  const doc = await fsdb.collection("meta").doc("counters").get();
  const fsSeq = doc.exists ? Number(doc.data().orderSeq) || 1001 : 1001;
  const [rows] = await pool.query("SELECT value FROM counters WHERE id = 'orderSeq'");
  const mySeq = rows.length ? Number(rows[0].value) : 1001;
  const next = Math.max(fsSeq, mySeq);
  await pool.query("INSERT INTO counters (id, value) VALUES ('orderSeq', ?) ON DUPLICATE KEY UPDATE value = GREATEST(value, VALUES(value))", [next]);
  console.log(`counters: orderSeq → ${next}`);
}

console.log("\nDone.", JSON.stringify(counts));
await pool.end();
process.exit(0);
