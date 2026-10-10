/* Unified data access layer.
   - When Firebase Admin credentials are configured (FIREBASE_PROJECT_ID etc.),
     everything reads/writes real Firestore collections.
   - Otherwise a local seeded store is used (persisted to data/store.json so
     admin edits survive restarts). The API and pages never need to care. */

import { promises as fs } from "fs";
import path from "path";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import {
  seedCategories,
  seedColors,
  seedFaqs,
  seedPosts,
  seedProducts,
  seedReviews,
  seedSettings,
} from "./seed";
import type {
  Category,
  Color,
  ContactQuery,
  Coupon,
  Faq,
  FlashSale,
  Order,
  OrderStatus,
  Post,
  Product,
  ProductReview,
  Review,
  SiteSettings,
} from "./types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

interface LocalStore {
  products: Product[];
  categories: Category[];
  colors: Color[];
  queries: ContactQuery[];
  coupons: Coupon[];
  flashSales: FlashSale[];
  productReviews: ProductReview[];
  faqs: Faq[];
  reviews: Review[];
  orders: Order[];
  settings: SiteSettings;
  orderSeq: number;
  posts: Post[];
}

/* Local JSON store (dev/demo fallback when Firebase Admin is not configured). */
let writeChain: Promise<void> = Promise.resolve();
/* In-memory copy used when the filesystem is read-only (e.g. Vercel /var/task):
   the app keeps serving the seeded catalog instead of throwing EROFS. */
let memoryStore: LocalStore | null = null;
let diskWritable: boolean | null = null;

async function tryPersist(s: LocalStore): Promise<boolean> {
  if (diskWritable === false) return false;
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await atomicWrite(STORE_PATH, JSON.stringify(s, null, 2));
    diskWritable = true;
    return true;
  } catch (err) {
    diskWritable = false;
    console.warn("[db] local store is not writable (read-only filesystem?) — using in-memory fallback.", (err as Error)?.message ?? err);
    return false;
  }
}

/** Firestore rejects `undefined` document fields — drop them before .set(). */
function stripUndefined<T extends object>(obj: T): T {
  for (const k of Object.keys(obj)) {
    if ((obj as Record<string, unknown>)[k] === undefined) delete (obj as Record<string, unknown>)[k];
  }
  return obj;
}

function freshLocal(): LocalStore {
  return {
    products: structuredClone(seedProducts),
    categories: structuredClone(seedCategories),
    colors: structuredClone(seedColors),
    queries: [],
    coupons: [],
    flashSales: [],
    productReviews: [],
    faqs: structuredClone(seedFaqs),
    reviews: structuredClone(seedReviews),
    orders: [],
    settings: structuredClone(seedSettings),
    orderSeq: 1001,
    posts: structuredClone(seedPosts),
  };
}

async function readLocalFile(): Promise<LocalStore> {
  if (memoryStore) return memoryStore;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    const fresh = freshLocal();
    // The file may predate newer collections (colors, coupons, …) — fill
    // gaps from the seed shape instead of crashing the fallback path.
    const store: LocalStore = {
      ...fresh,
      ...parsed,
      settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
    };
    for (const k of [
      "products",
      "categories",
      "colors",
      "queries",
      "coupons",
      "flashSales",
      "productReviews",
      "faqs",
      "reviews",
      "orders",
      "posts",
    ] as const) {
      if (!Array.isArray(store[k])) store[k] = [] as never;
    }
    if (typeof store.orderSeq !== "number") store.orderSeq = 1001;
    memoryStore = store;
    return memoryStore;
  } catch {
    const fresh = freshLocal();
    memoryStore = fresh;
    // Best-effort persist; never throws on read-only hosts.
    await tryPersist(fresh);
    return fresh;
  }
}

async function atomicWrite(filePath: string, data: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, data, "utf-8");
  await fs.rename(tmp, filePath);
}

/** Read-modify-write, serialized so concurrent requests can't clobber each other. */
async function mutateLocal<T>(fn: (s: LocalStore) => T | Promise<T>): Promise<T> {
  const run = writeChain.then(async () => {
    const s = await readLocalFile();
    const result = await fn(s);
    // Best-effort persist; on read-only filesystems the mutation still
    // applies to the in-memory store for the lifetime of the instance.
    await tryPersist(s);
    return result;
  });
  // Keep the chain alive even if one mutation fails.
  writeChain = run.then(() => undefined, () => undefined);
  return run;
}

async function loadLocal(): Promise<LocalStore> {
  return readLocalFile();
}

/** Raw local store — used by the one-time Firestore migration. */
export async function getLocalStore(): Promise<LocalStore> {
  return readLocalFile();
}

const db = () => adminDb();

/* ---------- read cache ---------- */
/* Short-lived in-memory cache for Firestore reads. A production build
   prerenders ~200 pages; without this, every page re-reads the same
   collections and a handful of builds can exhaust the Firestore free
   read quota (50k/day). With the cache, one build costs a few hundred
   reads instead of ~10k. Mutations invalidate it (see below). */
/* Catalog content (products, categories, FAQs, posts, reviews, settings) changes
   rarely, and every admin mutation invalidates the cache immediately — so it
   can be cached for 10 minutes. Orders stay on a short TTL so the admin panel
   and order lookups always see fresh data. Note: the cache is per server
   instance, so cross-instance staleness is bounded by these TTLs. */
const READ_CACHE_TTL_MS = 600_000; // 10 minutes
const ORDER_CACHE_TTL_MS = 60_000; // 1 minute
const readCache = new Map<string, { at: number; value: unknown }>();

type FirestoreDb = NonNullable<ReturnType<typeof adminDb>>;

/* Last-known-good snapshots: when Firestore is reachable we remember what it
   returned, so a later outage (quota, network) serves real data instead of
   the seed catalog. Per-instance memory only. */
const lastGood = new Map<string, unknown>();

/**
 * Resilient read pipeline:
 *  1. short-lived cache (60s) — also slashes build-time reads ~30x
 *  2. Firestore (when configured)
 *  3. last-known-good snapshot from this instance
 *  4. local seeded store (never throws, even on read-only filesystems)
 * Firestore errors are logged, never thrown to pages.
 */
async function resilientRead<T>(
  key: string,
  fromFirestore: (f: FirestoreDb) => Promise<T>,
  fromLocal: () => Promise<T>,
  ttlMs: number = READ_CACHE_TTL_MS
): Promise<T> {
  const hit = readCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return structuredClone(hit.value) as T;
  const f = db();
  if (f) {
    try {
      const value = await fromFirestore(f);
      readCache.set(key, { at: Date.now(), value });
      lastGood.set(key, value);
      return structuredClone(value) as T;
    } catch (err) {
      console.warn(
        `[db] Firestore read "${key}" failed; serving last-known data.`,
        (err as Error)?.message ?? err
      );
    }
  }
  if (lastGood.has(key)) return structuredClone(lastGood.get(key)) as T;
  const value = await fromLocal();
  readCache.set(key, { at: Date.now(), value });
  return structuredClone(value) as T;
}

/** Clear the read cache — called after every mutation. Exported so the
    one-time admin migration route can also invalidate. */
export function invalidateReadCache(): void {
  readCache.clear();
}

/* ---------- helpers ---------- */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let s = base;
  let i = 2;
  while (taken.has(s)) s = `${base}-${i++}`;
  return s;
}

/* ---------- products ---------- */

export async function listProducts(): Promise<Product[]> {
  return resilientRead(
    "products:all",
    async (f) => {
        const snap = await f.collection("products").orderBy("createdAt", "desc").get();
        return snap.docs.map((d) => d.data() as Product);
    
    },
    async () => {
      const s = await loadLocal();
      return [...s.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  );
}

export async function getProduct(slugOrId: string): Promise<Product | null> {
  return resilientRead(
    `product:${slugOrId}`,
    async (f) => {
        const byId = await f.collection("products").doc(slugOrId).get();
        if (byId.exists) return byId.data() as Product;
        const q = await f.collection("products").where("slug", "==", slugOrId).limit(1).get();
        return q.empty ? null : (q.docs[0].data() as Product);
    
    },
    async () => {
      const s = await loadLocal();
      return s.products.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
    }
  );
}

export async function saveProduct(input: Partial<Product> & { name: string }): Promise<Product> {
  try {
    const f = db();
    const nowIso = new Date().toISOString();
    if (f) {
      const col = f.collection("products");
      if (input.id) {
        const ref = col.doc(input.id);
        const existing = (await ref.get()).data() as Product | undefined;
        const merged: Product = {
          ...(existing as Product),
          ...input,
          slug: input.slug || existing?.slug || slugify(input.name),
          updatedAt: nowIso,
        } as Product;
        // Explicit nulls clear a field (e.g. removing a photo).
        for (const [k, v] of Object.entries(input)) {
          if (v === null) (merged as unknown as Record<string, unknown>)[k] = FieldValue.delete();
        }
        await ref.set(merged, { merge: true });
        for (const [k, v] of Object.entries(input)) {
          if (v === null) delete (merged as unknown as Record<string, unknown>)[k];
        }
        return merged;
        await ref.set(merged, { merge: true });
        return merged;
      }
      // Fresh read for slug uniqueness (bypass the 60s read cache).
      invalidateReadCache();
      const all = await listProducts();
      const id = `prod-${Date.now()}`;
      const product: Product = {
        id,
        slug: uniqueSlug(slugify(input.name), new Set(all.map((p) => p.slug))),
        sub: "",
        description: "",
        price: 0,
        category: "3-seater-sofas",
        type: "three",
        fabric: "#D8CBB4",
        bg: "#EFE8DC",
        accent: "#B65A35",
        inStock: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...input,
      } as Product;
      await col.doc(id).set(product);
      return product;
    }
    return mutateLocal((s) => {
      if (input.id) {
        const i = s.products.findIndex((p) => p.id === input.id);
        if (i >= 0) {
          s.products[i] = { ...s.products[i], ...input, updatedAt: nowIso } as Product;
          return s.products[i];
        }
      }
      const product: Product = {
        id: `prod-${Date.now()}`,
        slug: uniqueSlug(slugify(input.name), new Set(s.products.map((p) => p.slug))),
        sub: "",
        description: "",
        price: 0,
        category: "3-seater-sofas",
        type: "three",
        fabric: "#D8CBB4",
        bg: "#EFE8DC",
        accent: "#B65A35",
        inStock: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...input,
      } as Product;
      s.products.push(product);
      return product;
    });

  } finally {
    invalidateReadCache();
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("products").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.products = s.products.filter((p) => p.id !== id);
    });

  } finally {
    invalidateReadCache();
  }
}

export async function listCategories(): Promise<Category[]> {
  return resilientRead(
    "categories:all",
    async (f) => {
        const snap = await f.collection("categories").get();
        if (snap.empty) {
          // first run: seed categories
          const batch = f.batch();
          for (const c of seedCategories) batch.set(f.collection("categories").doc(c.id), c);
          await batch.commit();
          return seedCategories;
        }
        return snap.docs.map((d) => d.data() as Category);
    
    },
    async () => {
      const s = await loadLocal();
      return s.categories;
    }
  );
}

export async function saveCategory(input: Partial<Category> & { name: string }): Promise<Category> {
  try {
    const f = db();
    if (f) {
      const col = f.collection("categories");
      if (input.id) {
        const ref = col.doc(input.id);
        const existing = (await ref.get()).data() as Category | undefined;
        const merged = { ...(existing as Category), ...input } as Category;
        // Explicit nulls clear a field (e.g. removing a photo).
        for (const [k, v] of Object.entries(input)) {
          if (v === null) (merged as unknown as Record<string, unknown>)[k] = FieldValue.delete();
        }
        await ref.set(merged, { merge: true });
        for (const [k, v] of Object.entries(input)) {
          if (v === null) delete (merged as unknown as Record<string, unknown>)[k];
        }
        return merged;
      }
      const slugBase = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      // Fresh read for slug uniqueness (bypass the 60s read cache).
      invalidateReadCache();
      const all = await listCategories();
      const taken = new Set(all.map((c) => c.slug));
      let slug = slugBase;
      let i = 2;
      while (taken.has(slug)) slug = `${slugBase}-${i++}`;
      const category: Category = {
        id: `cat-${slug}`,
        slug,
        type: "three",
        fabric: "#D8CBB4",
        bg: "#EFE8DC",
        ...input,
      } as Category;
      await col.doc(category.id).set(category);
      return category;
    }
    return mutateLocal((s) => {
      if (input.id) {
        const idx = s.categories.findIndex((c) => c.id === input.id);
        if (idx >= 0) {
          s.categories[idx] = { ...s.categories[idx], ...input } as Category;
          return s.categories[idx];
        }
      }
      if (input.slug && s.categories.some((c) => c.slug === input.slug)) {
        return s.categories.find((c) => c.slug === input.slug)!;
      }
      const slugBase = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const taken = new Set(s.categories.map((c) => c.slug));
      let slug = slugBase;
      let i = 2;
      while (taken.has(slug)) slug = `${slugBase}-${i++}`;
      const category: Category = {
        id: `cat-${slug}`,
        slug,
        type: "three",
        fabric: "#D8CBB4",
        bg: "#EFE8DC",
        ...input,
      } as Category;
      s.categories.push(category);
      return category;
    });

  } finally {
    invalidateReadCache();
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("categories").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.categories = s.categories.filter((c) => c.id !== id);
    });

  } finally {
    invalidateReadCache();
  }
}

/* ---------- orders ---------- */

export async function listOrders(): Promise<Order[]> {
  return resilientRead(
    "orders:all",
    async (f) => {
        const snap = await f.collection("orders").orderBy("createdAt", "desc").get();
        return snap.docs.map((d) => d.data() as Order);
    
    },
    async () => {
      const s = await loadLocal();
      return [...s.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    ORDER_CACHE_TTL_MS
  );
}

export async function getOrder(idOrNumber: string): Promise<Order | null> {
  return resilientRead(
    `order:${idOrNumber}`,
    async (f) => {
        const byId = await f.collection("orders").doc(idOrNumber).get();
        if (byId.exists) return byId.data() as Order;
        const q = await f.collection("orders").where("number", "==", idOrNumber.toUpperCase()).limit(1).get();
        return q.empty ? null : (q.docs[0].data() as Order);
    
    },
    async () => {
      const s = await loadLocal();
      return (
        s.orders.find((o) => o.id === idOrNumber || o.number === idOrNumber.toUpperCase()) ?? null
      );
    },
    ORDER_CACHE_TTL_MS
  );
}

export async function createOrder(input: {
  items: Order["items"];
  customer: Order["customer"];
  deliverySlot?: string;
  paymentMethod: Order["paymentMethod"];
  couponCode?: string;
}): Promise<Order> {
  try {
    const nowIso = new Date().toISOString();
    const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
    const settings = await getSettings();
    const deliveryFee = subtotal >= settings.freeDeliveryThreshold || subtotal === 0 ? 0 : 29;
    // Coupons are validated server-side — never trust the client's discount.
    let discount = 0;
    let couponCode: string | undefined;
    let couponId: string | undefined;
    if (input.couponCode?.trim()) {
      const v = await validateCoupon(input.couponCode, subtotal);
      if (v.valid && v.coupon) {
        discount = v.discount;
        couponCode = v.coupon.code;
        couponId = v.coupon.id;
      }
    }
    const total = Math.max(0, subtotal - discount) + deliveryFee;
    const f = db();
    if (f) {
      const counter = f.collection("meta").doc("counters");
      const seq = await f.runTransaction(async (tx) => {
        const snap = await tx.get(counter);
        const next = ((snap.data()?.orderSeq as number) || 1001);
        tx.set(counter, { orderSeq: next + 1 }, { merge: true });
        return next;
      });
      const id = `ord-${Date.now()}`;
      const order: Order = {
        id,
        number: `SOF-${seq}`,
        publicToken: crypto.randomUUID(),
        items: input.items,
        subtotal,
        deliveryFee,
        discount: discount || undefined,
        couponCode,
        total,
        customer: input.customer,
        deliverySlot: input.deliverySlot,
        paymentMethod: input.paymentMethod,
        status: "new",
        createdAt: nowIso,
        updatedAt: nowIso,
        timeline: [{ status: "new", at: nowIso, note: "Order placed online — pay on delivery" }],
      };
      await f.collection("orders").doc(id).set(order);
      if (couponId) await incrementCouponUse(couponId);
      return order;
    }
    return mutateLocal((s) => {
      const order: Order = {
        id: `ord-${Date.now()}`,
        number: `SOF-${s.orderSeq++}`,
        publicToken: crypto.randomUUID(),
        items: input.items,
        subtotal,
        deliveryFee,
        discount: discount || undefined,
        couponCode,
        total,
        customer: input.customer,
        deliverySlot: input.deliverySlot,
        paymentMethod: input.paymentMethod,
        status: "new",
        createdAt: nowIso,
        updatedAt: nowIso,
        timeline: [{ status: "new", at: nowIso, note: "Order placed online — pay on delivery" }],
      };
      s.orders.push(order);
      if (couponId) {
        const c = s.coupons.find((x) => x.id === couponId);
        if (c) c.usedCount += 1;
      }
      return order;
    });

  } finally {
    invalidateReadCache();
  }
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string
): Promise<Order | null> {
  try {
    const nowIso = new Date().toISOString();
    const f = db();
    if (f) {
      const ref = f.collection("orders").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return null;
      const order = snap.data() as Order;
      order.status = status;
      order.updatedAt = nowIso;
      order.timeline.push({ status, at: nowIso, note });
      await ref.set(order);
      return order;
    }
    return mutateLocal((s) => {
      const order = s.orders.find((o) => o.id === id);
      if (!order) return null;
      order.status = status;
      order.updatedAt = nowIso;
      order.timeline.push({ status, at: nowIso, note });
      return order;
    });

  } finally {
    invalidateReadCache();
  }
}

/* ---------- content: faqs / reviews / settings ---------- */

export async function listFaqs(): Promise<Faq[]> {
  return resilientRead(
    "faqs:all",
    async (f) => {
        const snap = await f.collection("faqs").orderBy("order").get();
        if (snap.empty) {
          const batch = f.batch();
          for (const q of seedFaqs) batch.set(f.collection("faqs").doc(q.id), q);
          await batch.commit();
          return seedFaqs;
        }
        return snap.docs.map((d) => d.data() as Faq);
    
    },
    async () => {
      const s = await loadLocal();
      return [...s.faqs].sort((a, b) => a.order - b.order);
    }
  );
}

export async function saveFaqs(faqs: Faq[]): Promise<Faq[]> {
  try {
    const f = db();
    if (f) {
      const batch = f.batch();
      for (const q of faqs) batch.set(f.collection("faqs").doc(q.id), q, { merge: true });
      await batch.commit();
      return faqs;
    }
    return mutateLocal((s) => {
      s.faqs = faqs;
      return faqs;
    });

  } finally {
    invalidateReadCache();
  }
}

/* ---------- content: managed colour library ---------- */

export async function listColors(): Promise<Color[]> {
  return resilientRead(
    "colors:all",
    async (f) => {
      const snap = await f.collection("colors").orderBy("name").get();
      if (snap.empty) {
        const batch = f.batch();
        for (const c of seedColors) batch.set(f.collection("colors").doc(c.id), c);
        await batch.commit();
        return seedColors;
      }
      return snap.docs.map((d) => d.data() as Color);
    },
    async () => {
      const s = await loadLocal();
      return [...s.colors].sort((a, b) => a.name.localeCompare(b.name));
    }
  );
}

type ColorInput = Partial<Omit<Color, "hex" | "imageUrl">> & {
  hex?: string | null; // null clears the field; undefined leaves it
  imageUrl?: string | null; // null clears the field; undefined leaves it
};

export async function saveColor(input: ColorInput): Promise<Color> {
  try {
    const f = db();
    const nowIso = new Date().toISOString();
    if (f) {
      const col = f.collection("colors");
      if (input.id) {
        const ref = col.doc(input.id);
        const existing = (await ref.get()).data() as Color | undefined;
        const patch: Record<string, unknown> = { updatedAt: nowIso };
        if (input.name !== undefined) patch.name = input.name.trim() || existing?.name || "Unnamed";
        // null explicitly clears a field; undefined leaves it untouched.
        if (input.hex !== undefined) patch.hex = input.hex || FieldValue.delete();
        if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl || FieldValue.delete();
        await ref.set(patch, { merge: true });
        return { ...(existing as Color), ...patch } as Color;
      }
      const id = `color-${Date.now()}`;
      const color: Color = {
        id,
        name: (input.name ?? "").trim() || "Unnamed",
        hex: input.hex || undefined,
        imageUrl: input.imageUrl || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await col.doc(id).set(stripUndefined(color));
      return color;
    }
    return mutateLocal((s) => {
      if (input.id) {
        const i = s.colors.findIndex((c) => c.id === input.id);
        if (i >= 0) {
          const cur = { ...s.colors[i] };
          if (input.name !== undefined) cur.name = input.name.trim() || cur.name;
          if (input.hex !== undefined) { if (input.hex) cur.hex = input.hex; else delete cur.hex; }
          if (input.imageUrl !== undefined) { if (input.imageUrl) cur.imageUrl = input.imageUrl; else delete cur.imageUrl; }
          cur.updatedAt = nowIso;
          s.colors[i] = cur;
          return cur;
        }
      }
      const color: Color = {
        id: `color-${Date.now()}`,
        name: (input.name ?? "").trim() || "Unnamed",
        hex: input.hex || undefined,
        imageUrl: input.imageUrl || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      s.colors.push(color);
      return color;
    });
  } finally {
    invalidateReadCache();
  }
}

export async function deleteColor(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("colors").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.colors = s.colors.filter((c) => c.id !== id);
    });
  } finally {
    invalidateReadCache();
  }
}

/* ---------- contact queries ---------- */

export async function listQueries(): Promise<ContactQuery[]> {
  return resilientRead(
    "queries:all",
    async (f) => {
      const snap = await f.collection("queries").orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => d.data() as ContactQuery);
    },
    async () => {
      const s = await loadLocal();
      return [...s.queries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    ORDER_CACHE_TTL_MS // queries are inbox-like; keep fresh
  );
}

export async function createQuery(input: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<ContactQuery> {
  try {
    const nowIso = new Date().toISOString();
    const q: ContactQuery = {
      id: `qry-${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: "new",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const phone = input.phone?.trim();
    if (phone) q.phone = phone;
    const f = db();
    if (f) {
      await f.collection("queries").doc(q.id).set(q);
      return q;
    }
    return mutateLocal((s) => {
      s.queries.push(q);
      return q;
    });
  } finally {
    invalidateReadCache();
  }
}

/** Admin: update status / reply. Setting a reply marks the query "replied". */
export async function saveQuery(
  id: string,
  patch: Partial<Pick<ContactQuery, "status" | "reply">>
): Promise<ContactQuery | null> {
  try {
    const nowIso = new Date().toISOString();
    const f = db();
    if (f) {
      const ref = f.collection("queries").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return null;
      const update: Record<string, unknown> = { updatedAt: nowIso };
      if (patch.status) update.status = patch.status;
      if (patch.reply !== undefined) {
        if (patch.reply.trim()) {
          update.reply = patch.reply.trim();
          update.repliedAt = nowIso;
          update.status = "replied";
        } else {
          update.reply = FieldValue.delete();
        }
      }
      await ref.set(update, { merge: true });
      const fresh = await ref.get();
      return fresh.data() as ContactQuery;
    }
    return mutateLocal((s) => {
      const i = s.queries.findIndex((x) => x.id === id);
      if (i < 0) return null;
      const cur = s.queries[i];
      if (patch.status) cur.status = patch.status;
      if (patch.reply !== undefined) {
        if (patch.reply.trim()) {
          cur.reply = patch.reply.trim();
          cur.repliedAt = nowIso;
          cur.status = "replied";
        } else {
          delete cur.reply;
        }
      }
      cur.updatedAt = nowIso;
      return cur;
    });
  } finally {
    invalidateReadCache();
  }
}

export async function deleteQuery(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("queries").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.queries = s.queries.filter((x) => x.id !== id);
    });
  } finally {
    invalidateReadCache();
  }
}

/* ---------- coupons ---------- */

export async function listCoupons(): Promise<Coupon[]> {
  return resilientRead(
    "coupons:all",
    async (f) => {
      const snap = await f.collection("coupons").orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => d.data() as Coupon);
    },
    async () => {
      const s = await loadLocal();
      return [...s.coupons].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  );
}

export async function saveCoupon(
  input: Partial<Omit<Coupon, "minSubtotal" | "maxUses" | "startsAt" | "endsAt" | "value">> & {
    code?: string;
    value?: number;
    minSubtotal?: number | ""; // "" clears the field
    maxUses?: number | ""; // "" clears the field
    startsAt?: string | ""; // "" clears the field
    endsAt?: string | ""; // "" clears the field
  }
): Promise<Coupon> {
  try {
    const nowIso = new Date().toISOString();
    const f = db();
    if (f) {
      const col = f.collection("coupons");
      if (input.id) {
        const ref = col.doc(input.id);
        const existing = (await ref.get()).data() as Coupon | undefined;
        const patch: Record<string, unknown> = { updatedAt: nowIso };
        const cleared: string[] = [];
        if (input.code !== undefined) patch.code = input.code.trim().toUpperCase();
        for (const k of ["type", "value", "minSubtotal", "maxUses", "active", "startsAt", "endsAt"] as const) {
          if (input[k] !== undefined) {
            if (input[k] === "") {
              patch[k] = FieldValue.delete();
              cleared.push(k);
            } else patch[k] = input[k];
          }
        }
        await ref.set(patch, { merge: true });
        const fresh = await ref.get();
        const data = { ...(fresh.data() as Coupon) };
        for (const k of cleared) delete (data as Record<string, unknown>)[k];
        return data;
      }
      const coupon: Coupon = {
        id: `cpn-${Date.now()}`,
        code: (input.code ?? "").trim().toUpperCase(),
        type: input.type === "fixed" ? "fixed" : "percent",
        value: Math.max(0, Number(input.value) || 0),
        minSubtotal: input.minSubtotal ? Number(input.minSubtotal) : undefined,
        maxUses: input.maxUses ? Number(input.maxUses) : undefined,
        usedCount: 0,
        startsAt: input.startsAt || undefined,
        endsAt: input.endsAt || undefined,
        active: input.active !== false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await col.doc(coupon.id).set(stripUndefined(coupon));
      return coupon;
    }
    return mutateLocal((s) => {
      if (input.id) {
        const i = s.coupons.findIndex((c) => c.id === input.id);
        if (i >= 0) {
          const cur = { ...s.coupons[i] };
          if (input.code !== undefined) cur.code = input.code.trim().toUpperCase();
          if (input.type !== undefined) cur.type = input.type;
          if (input.value !== undefined) cur.value = Number(input.value) || 0;
          if (input.minSubtotal !== undefined) { if (input.minSubtotal) cur.minSubtotal = Number(input.minSubtotal); else delete cur.minSubtotal; }
          if (input.maxUses !== undefined) { if (input.maxUses) cur.maxUses = Number(input.maxUses); else delete cur.maxUses; }
          if (input.active !== undefined) cur.active = input.active;
          if (input.startsAt !== undefined) { if (input.startsAt) cur.startsAt = input.startsAt as string; else delete cur.startsAt; }
          if (input.endsAt !== undefined) { if (input.endsAt) cur.endsAt = input.endsAt as string; else delete cur.endsAt; }
          cur.updatedAt = nowIso;
          s.coupons[i] = cur;
          return cur;
        }
      }
      const coupon: Coupon = {
        id: `cpn-${Date.now()}`,
        code: (input.code ?? "").trim().toUpperCase(),
        type: input.type === "fixed" ? "fixed" : "percent",
        value: Math.max(0, Number(input.value) || 0),
        minSubtotal: input.minSubtotal ? Number(input.minSubtotal) : undefined,
        maxUses: input.maxUses ? Number(input.maxUses) : undefined,
        usedCount: 0,
        startsAt: (input.startsAt as string) || undefined,
        endsAt: (input.endsAt as string) || undefined,
        active: input.active !== false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      s.coupons.push(coupon);
      return coupon;
    });
  } finally {
    invalidateReadCache();
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("coupons").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.coupons = s.coupons.filter((c) => c.id !== id);
    });
  } finally {
    invalidateReadCache();
  }
}

/** Validate a coupon code against the current basket subtotal (server-side). */
export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<{ valid: boolean; coupon?: Coupon; discount: number; reason?: string }> {
  const now = Date.now();
  const find = async (): Promise<Coupon | undefined> => {
    const f = db();
    const wanted = code.trim().toUpperCase();
    if (f) {
      const q = await f.collection("coupons").where("code", "==", wanted).limit(1).get();
      return q.empty ? undefined : (q.docs[0].data() as Coupon);
    }
    const s = await loadLocal();
    return s.coupons.find((c) => c.code === wanted);
  };
  const coupon = await find();
  if (!coupon) return { valid: false, discount: 0, reason: "That code isn't recognised." };
  if (!coupon.active) return { valid: false, discount: 0, reason: "That code is no longer active." };
  if (coupon.startsAt && Date.parse(coupon.startsAt) > now)
    return { valid: false, discount: 0, reason: "That code isn't live yet." };
  if (coupon.endsAt && Date.parse(coupon.endsAt) < now)
    return { valid: false, discount: 0, reason: "That code has expired." };
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
    return { valid: false, discount: 0, reason: "That code has reached its usage limit." };
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal)
    return {
      valid: false,
      discount: 0,
      reason: `That code needs a minimum order of £${coupon.minSubtotal}.`,
    };
  const discount =
    coupon.type === "percent"
      ? Math.min(subtotal, Math.round((subtotal * Math.min(coupon.value, 90)) / 100))
      : Math.min(subtotal, coupon.value);
  return { valid: true, coupon, discount };
}

async function incrementCouponUse(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      const ref = f.collection("coupons").doc(id);
      await ref.set(
        { usedCount: FieldValue.increment(1), updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return;
    }
    await mutateLocal((s) => {
      const c = s.coupons.find((x) => x.id === id);
      if (c) c.usedCount += 1;
    });
  } finally {
    invalidateReadCache();
  }
}

/* ---------- flash sales ---------- */

export async function listFlashSales(): Promise<FlashSale[]> {
  return resilientRead(
    "flashsales:all",
    async (f) => {
      const snap = await f.collection("flashSales").orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => d.data() as FlashSale);
    },
    async () => {
      const s = await loadLocal();
      return [...s.flashSales].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  );
}

/** The banner currently live on the storefront, if any. */
export async function getActiveFlashSale(): Promise<FlashSale | null> {
  const all = await listFlashSales();
  const now = Date.now();
  return (
    all.find(
      (s) =>
        s.active &&
        (!s.startsAt || Date.parse(s.startsAt) <= now) &&
        (!s.endsAt || Date.parse(s.endsAt) >= now)
    ) ?? null
  );
}

export async function saveFlashSale(input: Partial<FlashSale> & { title?: string }): Promise<FlashSale> {
  try {
    const nowIso = new Date().toISOString();
    const f = db();
    if (f) {
      const col = f.collection("flashSales");
      if (input.id) {
        const ref = col.doc(input.id);
        const patch: Record<string, unknown> = { updatedAt: nowIso };
        for (const k of ["title", "subtitle", "imageUrl", "linkUrl", "linkLabel", "startsAt", "endsAt"] as const) {
          if (input[k] !== undefined) patch[k] = input[k] === "" ? FieldValue.delete() : input[k];
        }
        if (input.active !== undefined) patch.active = input.active;
        await ref.set(patch, { merge: true });
        const fresh = await ref.get();
        return fresh.data() as FlashSale;
      }
      const sale: FlashSale = {
        id: `fls-${Date.now()}`,
        title: (input.title ?? "").trim() || "Flash sale",
        subtitle: (input.subtitle as string) || undefined,
        imageUrl: (input.imageUrl as string) || undefined,
        linkUrl: (input.linkUrl as string) || undefined,
        linkLabel: (input.linkLabel as string) || undefined,
        startsAt: (input.startsAt as string) || undefined,
        endsAt: (input.endsAt as string) || undefined,
        active: input.active !== false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await col.doc(sale.id).set(stripUndefined(sale));
      return sale;
    }
    return mutateLocal((s) => {
      if (input.id) {
        const i = s.flashSales.findIndex((x) => x.id === input.id);
        if (i >= 0) {
          const cur = { ...s.flashSales[i] };
          for (const k of ["title", "subtitle", "imageUrl", "linkUrl", "linkLabel", "startsAt", "endsAt"] as const) {
            const v = input[k];
            if (v !== undefined) {
              if (v) (cur as Record<string, unknown>)[k] = v;
              else delete (cur as Record<string, unknown>)[k];
            }
          }
          if (input.active !== undefined) cur.active = input.active;
          cur.updatedAt = nowIso;
          s.flashSales[i] = cur;
          return cur;
        }
      }
      const sale: FlashSale = {
        id: `fls-${Date.now()}`,
        title: (input.title ?? "").trim() || "Flash sale",
        subtitle: (input.subtitle as string) || undefined,
        imageUrl: (input.imageUrl as string) || undefined,
        linkUrl: (input.linkUrl as string) || undefined,
        linkLabel: (input.linkLabel as string) || undefined,
        startsAt: (input.startsAt as string) || undefined,
        endsAt: (input.endsAt as string) || undefined,
        active: input.active !== false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      s.flashSales.push(sale);
      return sale;
    });
  } finally {
    invalidateReadCache();
  }
}

export async function deleteFlashSale(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("flashSales").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.flashSales = s.flashSales.filter((x) => x.id !== id);
    });
  } finally {
    invalidateReadCache();
  }
}

/* ---------- product reviews ---------- */

export async function listProductReviews(productId?: string): Promise<ProductReview[]> {
  return resilientRead(
    `productReviews:${productId ?? "all"}`,
    async (f) => {
      let q = f.collection("productReviews").orderBy("createdAt", "desc");
      const snap = productId
        ? await q.where("productId", "==", productId).get()
        : await q.get();
      return snap.docs.map((d) => d.data() as ProductReview);
    },
    async () => {
      const s = await loadLocal();
      const list = productId ? s.productReviews.filter((r) => r.productId === productId) : [...s.productReviews];
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  );
}

export interface ReviewStats {
  count: number;
  avg: number; // 0 when no reviews
}

/** Review counts + average rating for the given products (batch). */
export async function getProductReviewStats(productIds: string[]): Promise<Map<string, ReviewStats>> {
  const out = new Map<string, ReviewStats>();
  if (productIds.length === 0) return out;
  const f = db();
  if (f) {
    // Firestore has no server-side aggregation here; one batched read per 10 ids.
    for (let i = 0; i < productIds.length; i += 10) {
      const chunk = productIds.slice(i, i + 10);
      const snap = await f.collection("productReviews").where("productId", "in", chunk).get();
      const acc = new Map<string, { n: number; sum: number }>();
      for (const d of snap.docs) {
        const r = d.data() as ProductReview;
        const a = acc.get(r.productId) ?? { n: 0, sum: 0 };
        a.n += 1;
        a.sum += r.rating;
        acc.set(r.productId, a);
      }
      for (const [pid, a] of acc) out.set(pid, { count: a.n, avg: a.sum / a.n });
    }
    return out;
  }
  const s = await loadLocal();
  const acc = new Map<string, { n: number; sum: number }>();
  for (const r of s.productReviews) {
    if (!productIds.includes(r.productId)) continue;
    const a = acc.get(r.productId) ?? { n: 0, sum: 0 };
    a.n += 1;
    a.sum += r.rating;
    acc.set(r.productId, a);
  }
  for (const [pid, a] of acc) out.set(pid, { count: a.n, avg: a.sum / a.n });
  return out;
}

export async function createProductReview(input: {
  productId: string;
  productSlug: string;
  productName: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  location?: string;
  verified?: boolean;
  createdAt?: string;
}): Promise<ProductReview> {
  try {
    const nowIso = input.createdAt ?? new Date().toISOString();
    const review: ProductReview = {
      id: `prv-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      productId: input.productId,
      productSlug: input.productSlug,
      productName: input.productName,
      author: input.author.trim(),
      location: input.location?.trim() || undefined,
      rating: Math.max(1, Math.min(5, Math.round(input.rating))),
      title: input.title?.trim() || undefined,
      body: input.body.trim(),
      verified: input.verified,
      createdAt: nowIso,
    };
    stripUndefined(review);
    const f = db();
    if (f) {
      await f.collection("productReviews").doc(review.id).set(review);
      return review;
    }
    return mutateLocal((s) => {
      s.productReviews.push(review);
      return review;
    });
  } finally {
    invalidateReadCache();
  }
}

export async function deleteProductReview(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("productReviews").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.productReviews = s.productReviews.filter((r) => r.id !== id);
    });
  } finally {
    invalidateReadCache();
  }
}

/* ---------- content: blog posts ---------- */

export async function listPosts(publishedOnly = false): Promise<Post[]> {
  return resilientRead(
    `posts:${publishedOnly}`,
    async (f) => {
        const snap = await f.collection("posts").orderBy("publishedAt", "desc").get();
        if (snap.empty && !publishedOnly) {
          // first run: seed posts
          const batch = f.batch();
          for (const p of seedPosts) batch.set(f.collection("posts").doc(p.id), p);
          await batch.commit();
          return seedPosts;
        }
        const all = snap.docs.map((d) => d.data() as Post);
        return publishedOnly ? all.filter((p) => p.status === "published") : all;
    
    },
    async () => {
      const s = await loadLocal();
      const all = [...s.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      return publishedOnly ? all.filter((p) => p.status === "published") : all;
    }
  );
}

export async function getPost(slugOrId: string): Promise<Post | null> {
  return resilientRead(
    `post:${slugOrId}`,
    async (f) => {
        const byId = await f.collection("posts").doc(slugOrId).get();
        if (byId.exists) return byId.data() as Post;
        const q = await f.collection("posts").where("slug", "==", slugOrId).limit(1).get();
        return q.empty ? null : (q.docs[0].data() as Post);
    
    },
    async () => {
      const s = await loadLocal();
      return s.posts.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
    }
  );
}

function normalizePost(input: Partial<Post> & { title: string }): Partial<Post> {
  const tags = Array.isArray(input.tags)
    ? input.tags
    : typeof input.tags === "string"
      ? (input.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
      : [];
  const words = (input.content ?? "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return {
    ...input,
    tags,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    authorName: input.authorName?.trim() || "Sofora Team",
    status: input.status === "draft" ? "draft" : "published",
  };
}

export async function savePost(input: Partial<Post> & { title: string }): Promise<Post> {
  try {
    const f = db();
    const nowIso = new Date().toISOString();
    if (f) {
      const col = f.collection("posts");
      if (input.id) {
        const ref = col.doc(input.id);
        const existing = (await ref.get()).data() as Post | undefined;
        const merged: Post = {
          ...(existing as Post),
          ...normalizePost(input),
          slug: input.slug || existing?.slug || slugify(input.title),
          updatedAt: nowIso,
        } as Post;
        await ref.set(merged, { merge: true });
        return merged;
      }
      const all = await listPosts();
      const post: Post = {
        id: `post-${Date.now()}`,
        slug: uniqueSlug(slugify(input.title), new Set(all.map((p) => p.slug))),
        excerpt: "",
        content: "",
        tags: [],
        status: "draft",
        publishedAt: nowIso,
        updatedAt: nowIso,
        ...normalizePost(input),
      } as Post;
      await col.doc(post.id).set(post);
      return post;
    }
    return mutateLocal((s) => {
      if (input.id) {
        const i = s.posts.findIndex((p) => p.id === input.id);
        if (i >= 0) {
          s.posts[i] = { ...s.posts[i], ...normalizePost(input), updatedAt: nowIso } as Post;
          return s.posts[i];
        }
      }
      const post: Post = {
        id: `post-${Date.now()}`,
        slug: uniqueSlug(slugify(input.title), new Set(s.posts.map((p) => p.slug))),
        excerpt: "",
        content: "",
        tags: [],
        status: "draft",
        publishedAt: nowIso,
        updatedAt: nowIso,
        ...normalizePost(input),
      } as Post;
      s.posts.push(post);
      return post;
    });

  } finally {
    invalidateReadCache();
  }
}

export async function deletePost(id: string): Promise<void> {
  try {
    const f = db();
    if (f) {
      await f.collection("posts").doc(id).delete();
      return;
    }
    await mutateLocal((s) => {
      s.posts = s.posts.filter((p) => p.id !== id);
    });

  } finally {
    invalidateReadCache();
  }
}

export async function listReviews(): Promise<Review[]> {
  return resilientRead(
    "reviews:all",
    async (f) => {
        const snap = await f.collection("reviews").orderBy("order").get();
        if (snap.empty) {
          const batch = f.batch();
          for (const r of seedReviews) batch.set(f.collection("reviews").doc(r.id), r);
          await batch.commit();
          return seedReviews;
        }
        return snap.docs.map((d) => d.data() as Review);
    
    },
    async () => {
      const s = await loadLocal();
      return [...s.reviews].sort((a, b) => a.order - b.order);
    }
  );
}

export async function saveReviews(reviews: Review[]): Promise<Review[]> {
  try {
    const f = db();
    if (f) {
      const batch = f.batch();
      for (const r of reviews) batch.set(f.collection("reviews").doc(r.id), r, { merge: true });
      await batch.commit();
      return reviews;
    }
    return mutateLocal((s) => {
      s.reviews = reviews;
      return reviews;
    });

  } finally {
    invalidateReadCache();
  }
}

export async function getSettings(): Promise<SiteSettings> {
  return resilientRead(
    "settings",
    async (f) => {
        const snap = await f.collection("settings").doc("site").get();
        if (!snap.exists) {
          await f.collection("settings").doc("site").set(seedSettings);
          return seedSettings;
        }
        return { ...seedSettings, ...(snap.data() as Partial<SiteSettings>) };
    
    },
    async () => {
      const s = await loadLocal();
      return s.settings;
    }
  );
}

export async function saveSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  try {
    const f = db();
    if (f) {
      const ref = f.collection("settings").doc("site");
      await ref.set(patch, { merge: true });
      return getSettings();
    }
    return mutateLocal((s) => {
      s.settings = { ...s.settings, ...patch };
      return s.settings;
    });

  } finally {
    invalidateReadCache();
  }
}
