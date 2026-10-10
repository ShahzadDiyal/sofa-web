/* Unified data access layer — MySQL backend.
   - When DATABASE_URL is set, everything reads/writes the MySQL database
     (Hostinger live DB, or a local/dev MySQL).
   - Otherwise a local seeded store is used (persisted to data/store.json so
     admin edits survive restarts). The API and pages never need to care.
   Reads go through a short-lived cache; on MySQL failure they fall back to
   the local seed instead of crashing the storefront. */

import { promises as fs } from "fs";
import path from "path";
import { mysqlPool, parseJson, toJson, toBool, toNum, nullIfUndef } from "./mysql";
import type { Pool } from "mysql2/promise";
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

/* Local JSON store (fallback when DATABASE_URL is not set, or MySQL is
   unreachable on reads). */
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

/** Drop `undefined` fields before persisting. */
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

/** Raw local store — used by one-off tooling. */
export async function getLocalStore(): Promise<LocalStore> {
  return readLocalFile();
}

/* ---------- read cache ---------- */
/* Short-lived in-memory cache for MySQL reads. Catalog content changes
   rarely, and every admin mutation invalidates the cache immediately — so it
   can be cached for 10 minutes. Orders stay on a short TTL so the admin panel
   and order lookups always see fresh data. Note: the cache is per server
   instance, so cross-instance staleness is bounded by these TTLs. */
const READ_CACHE_TTL_MS = 600_000; // 10 minutes
const ORDER_CACHE_TTL_MS = 60_000; // 1 minute
const readCache = new Map<string, { at: number; value: unknown }>();

/**
 * Resilient read pipeline:
 *  1. short-lived cache
 *  2. MySQL (when DATABASE_URL is set)
 *  3. local seeded store (never throws)
 * MySQL errors are logged, never thrown to pages.
 */
async function resilientRead<T>(
  key: string,
  fromMysql: () => Promise<T>,
  fromLocal: () => Promise<T>,
  ttlMs: number = READ_CACHE_TTL_MS
): Promise<T> {
  const hit = readCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return structuredClone(hit.value) as T;
  const pool = mysqlPool();
  if (pool) {
    try {
      const value = await fromMysql();
      readCache.set(key, { at: Date.now(), value });
      return structuredClone(value) as T;
    } catch (err) {
      console.warn(
        `[db] MySQL read "${key}" failed; serving local data.`,
        (err as Error)?.message ?? err
      );
    }
  }
  const value = await fromLocal();
  readCache.set(key, { at: Date.now(), value });
  return structuredClone(value) as T;
}

/** Clear the read cache — called after every mutation. */
export function invalidateReadCache(): void {
  readCache.clear();
}

/** Throw a clear error when a write is attempted without a database. */
function requirePool(): Pool {
  const pool = mysqlPool();
  if (!pool) throw new Error("MySQL is not configured (DATABASE_URL).");
  return pool;
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

/** INSERT … ON DUPLICATE KEY UPDATE for a full row object. */
async function upsertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const pool = requirePool();
  const cols = Object.keys(row);
  const placeholders = cols.map(() => "?").join(",");
  const updates = cols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(",");
  await pool.query(
    `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
    cols.map((c) => row[c])
  );
}

async function deleteRow(table: string, idCol: string, id: string): Promise<void> {
  const pool = requirePool();
  await pool.query(`DELETE FROM \`${table}\` WHERE \`${idCol}\` = ?`, [id]);
}

/* ---------- row mappers ---------- */

function rowToProduct(r: Record<string, unknown>): Product {
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    sub: (r.sub as string) ?? "",
    description: (r.description as string) ?? "",
    price: toNum(r.price),
    wasPrice: r.wasPrice == null ? undefined : toNum(r.wasPrice),
    category: (r.category as string) ?? "",
    type: ((r.type as string) ?? "three") as Product["type"],
    fabric: (r.fabric as string) ?? "",
    fabricName: (r.fabricName as string) ?? undefined,
    bg: (r.bg as string) ?? "",
    accent: (r.accent as string) ?? "",
    tag: (r.tag as string) ?? undefined,
    imageUrl: (r.imageUrl as string) ?? undefined,
    colorImages: parseJson<Record<string, string> | undefined>(r.colorImages, undefined),
    sku: (r.sku as string) ?? undefined,
    seats: r.seats == null ? undefined : toNum(r.seats),
    fabricType: (r.fabricType as string) ?? undefined,
    colourName: (r.colourName as string) ?? undefined,
    features: parseJson<string[] | undefined>(r.features, undefined),
    rating: r.rating == null ? undefined : toNum(r.rating),
    reviewCount: r.reviewCount == null ? undefined : toNum(r.reviewCount),
    inStock: toBool(r.inStock),
    featured: toBool(r.featured),
    details: parseJson<string[] | undefined>(r.details, undefined),
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
  };
}

function productToRow(p: Product): Record<string, unknown> {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    sub: nullIfUndef(p.sub),
    description: nullIfUndef(p.description),
    price: p.price,
    wasPrice: nullIfUndef(p.wasPrice),
    category: nullIfUndef(p.category),
    type: nullIfUndef(p.type),
    fabric: nullIfUndef(p.fabric),
    fabricName: nullIfUndef(p.fabricName),
    bg: nullIfUndef(p.bg),
    accent: nullIfUndef(p.accent),
    tag: nullIfUndef(p.tag),
    imageUrl: nullIfUndef(p.imageUrl),
    colorImages: toJson(p.colorImages),
    sku: nullIfUndef(p.sku),
    seats: nullIfUndef(p.seats),
    fabricType: nullIfUndef(p.fabricType),
    colourName: nullIfUndef(p.colourName),
    features: toJson(p.features),
    rating: nullIfUndef(p.rating),
    reviewCount: nullIfUndef(p.reviewCount),
    inStock: p.inStock ? 1 : 0,
    featured: p.featured ? 1 : 0,
    details: toJson(p.details),
    createdAt: nullIfUndef(p.createdAt),
    updatedAt: nullIfUndef(p.updatedAt),
  };
}

function rowToCategory(r: Record<string, unknown>): Category {
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    type: ((r.type as string) ?? "three") as Category["type"],
    fabric: (r.fabric as string) ?? "",
    bg: (r.bg as string) ?? "",
    blurb: (r.blurb as string) ?? undefined,
    menu: (r.menu as string) ?? undefined,
    imageUrl: (r.imageUrl as string) ?? undefined,
  };
}

function rowToColor(r: Record<string, unknown>): Color {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    hex: (r.hex as string) ?? undefined,
    imageUrl: (r.imageUrl as string) ?? undefined,
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
  };
}

function rowToQuery(r: Record<string, unknown>): ContactQuery {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    phone: (r.phone as string) ?? undefined,
    subject: (r.subject as string) ?? "",
    message: (r.message as string) ?? "",
    status: ((r.status as string) ?? "new") as ContactQuery["status"],
    reply: (r.reply as string) ?? undefined,
    repliedAt: (r.repliedAt as string) ?? undefined,
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
  };
}

function rowToCoupon(r: Record<string, unknown>): Coupon {
  return {
    id: String(r.id),
    code: String(r.code ?? ""),
    type: r.type === "fixed" ? "fixed" : "percent",
    value: toNum(r.value),
    minSubtotal: r.minSubtotal == null ? undefined : toNum(r.minSubtotal),
    maxUses: r.maxUses == null ? undefined : toNum(r.maxUses),
    usedCount: toNum(r.usedCount),
    startsAt: (r.startsAt as string) ?? undefined,
    endsAt: (r.endsAt as string) ?? undefined,
    active: toBool(r.active),
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
  };
}

function rowToFlashSale(r: Record<string, unknown>): FlashSale {
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    subtitle: (r.subtitle as string) ?? undefined,
    imageUrl: (r.imageUrl as string) ?? undefined,
    linkUrl: (r.linkUrl as string) ?? undefined,
    linkLabel: (r.linkLabel as string) ?? undefined,
    startsAt: (r.startsAt as string) ?? undefined,
    endsAt: (r.endsAt as string) ?? undefined,
    active: toBool(r.active),
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
  };
}

function rowToProductReview(r: Record<string, unknown>): ProductReview {
  return {
    id: String(r.id),
    productId: String(r.productId ?? ""),
    productSlug: (r.productSlug as string) ?? "",
    productName: (r.productName as string) ?? "",
    author: String(r.author ?? ""),
    location: (r.location as string) ?? undefined,
    rating: toNum(r.rating, 5),
    title: (r.title as string) ?? undefined,
    body: (r.body as string) ?? "",
    verified: toBool(r.verified) || undefined,
    createdAt: (r.createdAt as string) ?? "",
  };
}

function rowToPost(r: Record<string, unknown>): Post {
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    title: String(r.title ?? ""),
    excerpt: (r.excerpt as string) ?? "",
    content: (r.content as string) ?? "",
    coverColor: (r.coverColor as string) ?? undefined,
    tags: parseJson<string[]>(r.tags, []),
    status: r.status === "draft" ? "draft" : "published",
    metaTitle: (r.metaTitle as string) ?? undefined,
    metaDescription: (r.metaDescription as string) ?? undefined,
    publishedAt: (r.publishedAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
    readingMinutes: toNum(r.readingMinutes, 1),
    authorName: (r.authorName as string) ?? "Sofora Team",
    faqJson: parseJson<Post["faqJson"]>(r.faqJson, undefined),
  };
}

function rowToReview(r: Record<string, unknown>): Review {
  return {
    id: String(r.id),
    quote: (r.quote as string) ?? "",
    author: (r.author as string) ?? "",
    location: (r.location as string) ?? "",
    rating: toNum(r.rating, 5),
    order: toNum(r.order),
  };
}

function rowToOrder(r: Record<string, unknown>): Order {
  return {
    id: String(r.id),
    number: String(r.number ?? ""),
    publicToken: String(r.publicToken ?? ""),
    items: parseJson<Order["items"]>(r.items, []),
    subtotal: toNum(r.subtotal),
    deliveryFee: toNum(r.deliveryFee),
    discount: r.discount == null ? undefined : toNum(r.discount),
    couponCode: (r.couponCode as string) ?? undefined,
    total: toNum(r.total),
    customer: parseJson<Order["customer"]>(r.customer, {
      name: "",
      phone: "",
      address: "",
      city: "",
      postcode: "",
    }),
    deliverySlot: (r.deliverySlot as string) ?? undefined,
    paymentMethod: ((r.paymentMethod as string) ?? "cash") as Order["paymentMethod"],
    status: ((r.status as string) ?? "new") as Order["status"],
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
    timeline: parseJson<Order["timeline"]>(r.timeline, []),
  };
}

/* ---------- products ---------- */

export async function listProducts(): Promise<Product[]> {
  return resilientRead(
    "products:all",
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM products ORDER BY createdAt DESC");
      return (rows as Record<string, unknown>[]).map(rowToProduct);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1", [
        slugOrId,
        slugOrId,
      ]);
      const list = rows as Record<string, unknown>[];
      return list.length ? rowToProduct(list[0]) : null;
    },
    async () => {
      const s = await loadLocal();
      return s.products.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
    }
  );
}

export async function saveProduct(input: Partial<Product> & { name: string }): Promise<Product> {
  try {
    const nowIso = new Date().toISOString();
    const pool = mysqlPool();
    if (pool) {
      let merged: Product;
      if (input.id) {
        const [rows] = await pool.query("SELECT * FROM products WHERE id = ? LIMIT 1", [input.id]);
        const existing = (rows as Record<string, unknown>[])[0];
        merged = {
          ...(existing ? rowToProduct(existing) : {}),
          ...stripUndefined({ ...input }),
          slug: input.slug || (existing ? rowToProduct(existing).slug : "") || slugify(input.name),
          updatedAt: nowIso,
        } as Product;
        // Explicit nulls clear a field (e.g. removing a photo) → NULL in MySQL.
        for (const [k, v] of Object.entries(input)) {
          if (v === null) (merged as unknown as Record<string, unknown>)[k] = null;
        }
        if (!merged.id) merged.id = input.id;
        if (!merged.createdAt) merged.createdAt = nowIso;
        await upsertRow("products", productToRow(merged));
        // Return with nulls stripped back to undefined, like the old API.
        const out = { ...merged };
        for (const [k, v] of Object.entries(out)) {
          if (v === null) delete (out as unknown as Record<string, unknown>)[k];
        }
        return out as Product;
      }
      // Fresh read for slug uniqueness (bypass the read cache).
      invalidateReadCache();
      const [slugRows] = await pool.query("SELECT slug FROM products");
      const taken = new Set((slugRows as { slug: string }[]).map((r) => r.slug));
      const product: Product = {
        id: `prod-${Date.now()}`,
        slug: uniqueSlug(slugify(input.name), taken),
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
        ...stripUndefined({ ...input }),
      } as Product;
      await upsertRow("products", productToRow(product));
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
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("products", "id", id);
      return;
    }
    await mutateLocal((s) => {
      s.products = s.products.filter((p) => p.id !== id);
    });
  } finally {
    invalidateReadCache();
  }
}

/* ---------- categories ---------- */

export async function listCategories(): Promise<Category[]> {
  return resilientRead(
    "categories:all",
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM categories");
      return (rows as Record<string, unknown>[]).map(rowToCategory);
    },
    async () => {
      const s = await loadLocal();
      return s.categories;
    }
  );
}

export async function saveCategory(input: Partial<Category> & { name: string }): Promise<Category> {
  try {
    const pool = mysqlPool();
    if (pool) {
      if (input.id) {
        const [rows] = await pool.query("SELECT * FROM categories WHERE id = ? LIMIT 1", [input.id]);
        const existing = (rows as Record<string, unknown>[])[0];
        const merged: Category = {
          ...(existing ? rowToCategory(existing) : {}),
          ...stripUndefined({ ...input }),
        } as Category;
        for (const [k, v] of Object.entries(input)) {
          if (v === null) (merged as unknown as Record<string, unknown>)[k] = null;
        }
        if (!merged.id) merged.id = input.id;
        await upsertRow("categories", {
          id: merged.id,
          slug: nullIfUndef(merged.slug),
          name: merged.name,
          type: nullIfUndef(merged.type),
          fabric: nullIfUndef(merged.fabric),
          bg: nullIfUndef(merged.bg),
          blurb: nullIfUndef(merged.blurb),
          menu: nullIfUndef(merged.menu),
          imageUrl: nullIfUndef(merged.imageUrl),
        });
        const out = { ...merged };
        for (const [k, v] of Object.entries(out)) {
          if (v === null) delete (out as unknown as Record<string, unknown>)[k];
        }
        return out as Category;
      }
      const slugBase = slugify(input.slug || input.name);
      const [slugRows] = await pool.query("SELECT id, slug FROM categories WHERE slug LIKE ?", [
        `${slugBase}%`,
      ]);
      const bySlug = new Map(
        (slugRows as { id: string; slug: string }[]).map((r) => [r.slug, r])
      );
      // If the slug is taken, return the existing category (same as local mode).
      if (input.slug && bySlug.has(input.slug)) {
        const [rows] = await pool.query("SELECT * FROM categories WHERE slug = ? LIMIT 1", [
          input.slug,
        ]);
        return rowToCategory((rows as Record<string, unknown>[])[0]);
      }
      invalidateReadCache();
      const [allSlugs] = await pool.query("SELECT slug FROM categories");
      const taken = new Set((allSlugs as { slug: string }[]).map((r) => r.slug));
      const slug = uniqueSlug(slugBase, taken);
      const category: Category = {
        id: `cat-${slug}`,
        slug,
        type: "three",
        fabric: "#D8CBB4",
        bg: "#EFE8DC",
        ...stripUndefined({ ...input }),
      } as Category;
      await upsertRow("categories", {
        id: category.id,
        slug: category.slug,
        name: category.name,
        type: nullIfUndef(category.type),
        fabric: nullIfUndef(category.fabric),
        bg: nullIfUndef(category.bg),
        blurb: nullIfUndef(category.blurb),
        menu: nullIfUndef(category.menu),
        imageUrl: nullIfUndef(category.imageUrl),
      });
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
      const slugBase = slugify(input.slug || input.name);
      const taken = new Set(s.categories.map((c) => c.slug));
      const slug = uniqueSlug(slugBase, taken);
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
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("categories", "id", id);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM orders ORDER BY createdAt DESC");
      return (rows as Record<string, unknown>[]).map(rowToOrder);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query(
        "SELECT * FROM orders WHERE id = ? OR number = ? LIMIT 1",
        [idOrNumber, idOrNumber.toUpperCase()]
      );
      const list = rows as Record<string, unknown>[];
      return list.length ? rowToOrder(list[0]) : null;
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

/** Atomically take the next order number (SOF-1024, …). */
async function nextOrderSeq(pool: Pool): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.query("UPDATE counters SET value = LAST_INSERT_ID(value + 1) WHERE id = 'orderSeq'");
    const [rows] = await conn.query("SELECT LAST_INSERT_ID() AS seq");
    return Number((rows as { seq: number }[])[0].seq);
  } finally {
    conn.release();
  }
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
    const pool = mysqlPool();
    if (pool) {
      const seq = await nextOrderSeq(pool);
      const order: Order = {
        id: `ord-${Date.now()}`,
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
      await upsertRow("orders", {
        id: order.id,
        number: order.number,
        publicToken: order.publicToken,
        items: toJson(order.items),
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: nullIfUndef(order.discount),
        couponCode: nullIfUndef(order.couponCode),
        total: order.total,
        customer: toJson(order.customer),
        deliverySlot: nullIfUndef(order.deliverySlot),
        paymentMethod: order.paymentMethod,
        status: order.status,
        timeline: toJson(order.timeline),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });
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
    const pool = mysqlPool();
    if (pool) {
      const [rows] = await pool.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
      const list = rows as Record<string, unknown>[];
      if (!list.length) return null;
      const order = rowToOrder(list[0]);
      order.status = status;
      order.updatedAt = nowIso;
      order.timeline.push({ status, at: nowIso, note });
      await pool.query("UPDATE orders SET status = ?, updatedAt = ?, timeline = ? WHERE id = ?", [
        status,
        nowIso,
        toJson(order.timeline),
        id,
      ]);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM faqs ORDER BY `order` ASC");
      return (rows as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        q: String(r.q ?? ""),
        a: String(r.a ?? ""),
        order: toNum(r.order),
      }));
    },
    async () => {
      const s = await loadLocal();
      return [...s.faqs].sort((a, b) => a.order - b.order);
    }
  );
}

export async function saveFaqs(faqs: Faq[]): Promise<Faq[]> {
  try {
    const pool = mysqlPool();
    if (pool) {
      await pool.query("DELETE FROM faqs");
      for (const q of faqs) {
        await upsertRow("faqs", {
          id: q.id,
          q: q.q,
          a: q.a,
          order: q.order,
        });
      }
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM colors ORDER BY name ASC");
      return (rows as Record<string, unknown>[]).map(rowToColor);
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
    const nowIso = new Date().toISOString();
    const pool = mysqlPool();
    if (pool) {
      if (input.id) {
        const [rows] = await pool.query("SELECT * FROM colors WHERE id = ? LIMIT 1", [input.id]);
        const list = rows as Record<string, unknown>[];
        const existing = list.length ? rowToColor(list[0]) : undefined;
        const name =
          input.name !== undefined ? input.name.trim() || existing?.name || "Unnamed" : existing?.name || "Unnamed";
        // null explicitly clears a field; undefined leaves it untouched.
        const hex = input.hex !== undefined ? input.hex || null : (existing?.hex ?? null);
        const imageUrl =
          input.imageUrl !== undefined ? input.imageUrl || null : (existing?.imageUrl ?? null);
        await upsertRow("colors", {
          id: input.id,
          name,
          hex,
          imageUrl,
          createdAt: existing?.createdAt ?? nowIso,
          updatedAt: nowIso,
        });
        return {
          id: input.id,
          name,
          hex: hex ?? undefined,
          imageUrl: imageUrl ?? undefined,
          createdAt: existing?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
      }
      const color: Color = {
        id: `color-${Date.now()}`,
        name: (input.name ?? "").trim() || "Unnamed",
        hex: input.hex || undefined,
        imageUrl: input.imageUrl || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await upsertRow("colors", {
        id: color.id,
        name: color.name,
        hex: nullIfUndef(color.hex),
        imageUrl: nullIfUndef(color.imageUrl),
        createdAt: color.createdAt,
        updatedAt: color.updatedAt,
      });
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
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("colors", "id", id);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM queries ORDER BY createdAt DESC");
      return (rows as Record<string, unknown>[]).map(rowToQuery);
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
    const pool = mysqlPool();
    if (pool) {
      await upsertRow("queries", {
        id: q.id,
        name: q.name,
        email: q.email,
        phone: nullIfUndef(q.phone),
        subject: q.subject,
        message: q.message,
        status: q.status,
        reply: null,
        repliedAt: null,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      });
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
    const pool = mysqlPool();
    if (pool) {
      const [rows] = await pool.query("SELECT * FROM queries WHERE id = ? LIMIT 1", [id]);
      const list = rows as Record<string, unknown>[];
      if (!list.length) return null;
      const sets: string[] = ["updatedAt = ?"];
      const vals: unknown[] = [nowIso];
      if (patch.status) {
        sets.push("status = ?");
        vals.push(patch.status);
      }
      if (patch.reply !== undefined) {
        if (patch.reply.trim()) {
          sets.push("reply = ?", "repliedAt = ?", "status = ?");
          vals.push(patch.reply.trim(), nowIso, "replied");
        } else {
          sets.push("reply = NULL");
        }
      }
      vals.push(id);
      await pool.query(`UPDATE queries SET ${sets.join(", ")} WHERE id = ?`, vals);
      const [fresh] = await pool.query("SELECT * FROM queries WHERE id = ? LIMIT 1", [id]);
      return rowToQuery((fresh as Record<string, unknown>[])[0]);
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
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("queries", "id", id);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM coupons ORDER BY createdAt DESC");
      return (rows as Record<string, unknown>[]).map(rowToCoupon);
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
    const pool = mysqlPool();
    if (pool) {
      if (input.id) {
        const [rows] = await pool.query("SELECT * FROM coupons WHERE id = ? LIMIT 1", [input.id]);
        const list = rows as Record<string, unknown>[];
        if (!list.length) throw new Error("Coupon not found.");
        const cur = rowToCoupon(list[0]);
        if (input.code !== undefined) cur.code = input.code.trim().toUpperCase();
        for (const k of ["type", "value", "minSubtotal", "maxUses", "active", "startsAt", "endsAt"] as const) {
          const v = input[k];
          if (v !== undefined) {
            if (v === "") delete (cur as unknown as Record<string, unknown>)[k];
            else (cur as unknown as Record<string, unknown>)[k] = v;
          }
        }
        cur.updatedAt = nowIso;
        await upsertRow("coupons", couponToRow(cur));
        return cur;
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
      await upsertRow("coupons", couponToRow(coupon));
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

function couponToRow(c: Coupon): Record<string, unknown> {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotal: nullIfUndef(c.minSubtotal),
    maxUses: nullIfUndef(c.maxUses),
    usedCount: c.usedCount,
    startsAt: nullIfUndef(c.startsAt),
    endsAt: nullIfUndef(c.endsAt),
    active: c.active ? 1 : 0,
    createdAt: nullIfUndef(c.createdAt),
    updatedAt: nullIfUndef(c.updatedAt),
  };
}

export async function deleteCoupon(id: string): Promise<void> {
  try {
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("coupons", "id", id);
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
  const wanted = code.trim().toUpperCase();
  let coupon: Coupon | undefined;
  const pool = mysqlPool();
  if (pool) {
    const [rows] = await pool.query("SELECT * FROM coupons WHERE code = ? LIMIT 1", [wanted]);
    const list = rows as Record<string, unknown>[];
    coupon = list.length ? rowToCoupon(list[0]) : undefined;
  } else {
    const s = await loadLocal();
    coupon = s.coupons.find((c) => c.code === wanted);
  }
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
    const pool = mysqlPool();
    if (pool) {
      await pool.query(
        "UPDATE coupons SET usedCount = usedCount + 1, updatedAt = ? WHERE id = ?",
        [new Date().toISOString(), id]
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM flash_sales ORDER BY createdAt DESC");
      return (rows as Record<string, unknown>[]).map(rowToFlashSale);
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

function flashSaleToRow(s: FlashSale): Record<string, unknown> {
  return {
    id: s.id,
    title: s.title,
    subtitle: nullIfUndef(s.subtitle),
    imageUrl: nullIfUndef(s.imageUrl),
    linkUrl: nullIfUndef(s.linkUrl),
    linkLabel: nullIfUndef(s.linkLabel),
    startsAt: nullIfUndef(s.startsAt),
    endsAt: nullIfUndef(s.endsAt),
    active: s.active ? 1 : 0,
    createdAt: nullIfUndef(s.createdAt),
    updatedAt: nullIfUndef(s.updatedAt),
  };
}

export async function saveFlashSale(input: Partial<FlashSale> & { title?: string }): Promise<FlashSale> {
  try {
    const nowIso = new Date().toISOString();
    const pool = mysqlPool();
    if (pool) {
      if (input.id) {
        const [rows] = await pool.query("SELECT * FROM flash_sales WHERE id = ? LIMIT 1", [input.id]);
        const list = rows as Record<string, unknown>[];
        if (!list.length) throw new Error("Flash sale not found.");
        const cur = rowToFlashSale(list[0]);
        for (const k of ["title", "subtitle", "imageUrl", "linkUrl", "linkLabel", "startsAt", "endsAt"] as const) {
          const v = input[k];
          if (v !== undefined) {
            if (v) (cur as unknown as Record<string, unknown>)[k] = v;
            else delete (cur as unknown as Record<string, unknown>)[k];
          }
        }
        if (input.active !== undefined) cur.active = input.active;
        cur.updatedAt = nowIso;
        await upsertRow("flash_sales", flashSaleToRow(cur));
        return cur;
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
      await upsertRow("flash_sales", flashSaleToRow(sale));
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
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("flash_sales", "id", id);
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
    async () => {
      const pool = requirePool();
      const [rows] = productId
        ? await pool.query("SELECT * FROM product_reviews WHERE productId = ? ORDER BY createdAt DESC", [productId])
        : await pool.query("SELECT * FROM product_reviews ORDER BY createdAt DESC");
      return (rows as Record<string, unknown>[]).map(rowToProductReview);
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

/** Review counts + average rating for the given products (single GROUP BY query). */
export async function getProductReviewStats(productIds: string[]): Promise<Map<string, ReviewStats>> {
  const out = new Map<string, ReviewStats>();
  if (productIds.length === 0) return out;
  const pool = mysqlPool();
  if (pool) {
    const [rows] = await pool.query(
      "SELECT productId, COUNT(*) AS n, AVG(rating) AS a FROM product_reviews WHERE productId IN (?) GROUP BY productId",
      [productIds]
    );
    for (const r of rows as { productId: string; n: number; a: number }[]) {
      out.set(r.productId, { count: Number(r.n), avg: Number(r.a) });
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
    const pool = mysqlPool();
    if (pool) {
      await upsertRow("product_reviews", {
        id: review.id,
        productId: review.productId,
        productSlug: nullIfUndef(review.productSlug),
        productName: nullIfUndef(review.productName),
        author: review.author,
        location: nullIfUndef(review.location),
        rating: review.rating,
        title: nullIfUndef(review.title),
        body: review.body,
        verified: review.verified ? 1 : 0,
        createdAt: review.createdAt,
      });
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
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("product_reviews", "id", id);
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
    async () => {
      const pool = requirePool();
      const [rows] = publishedOnly
        ? await pool.query("SELECT * FROM posts WHERE status = 'published' ORDER BY publishedAt DESC")
        : await pool.query("SELECT * FROM posts ORDER BY publishedAt DESC");
      return (rows as Record<string, unknown>[]).map(rowToPost);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM posts WHERE id = ? OR slug = ? LIMIT 1", [
        slugOrId,
        slugOrId,
      ]);
      const list = rows as Record<string, unknown>[];
      return list.length ? rowToPost(list[0]) : null;
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

function postToRow(p: Post): Record<string, unknown> {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: nullIfUndef(p.excerpt),
    content: nullIfUndef(p.content),
    coverColor: nullIfUndef(p.coverColor),
    tags: toJson(p.tags ?? []),
    status: p.status,
    metaTitle: nullIfUndef(p.metaTitle),
    metaDescription: nullIfUndef(p.metaDescription),
    publishedAt: nullIfUndef(p.publishedAt),
    updatedAt: nullIfUndef(p.updatedAt),
    readingMinutes: p.readingMinutes ?? 1,
    authorName: nullIfUndef(p.authorName),
    faqJson: toJson(p.faqJson),
  };
}

export async function savePost(input: Partial<Post> & { title: string }): Promise<Post> {
  try {
    const nowIso = new Date().toISOString();
    const pool = mysqlPool();
    if (pool) {
      if (input.id) {
        const [rows] = await pool.query("SELECT * FROM posts WHERE id = ? LIMIT 1", [input.id]);
        const list = rows as Record<string, unknown>[];
        const existing = list.length ? rowToPost(list[0]) : undefined;
        const merged: Post = {
          ...(existing as Post),
          ...normalizePost(input),
          slug: input.slug || existing?.slug || slugify(input.title),
          updatedAt: nowIso,
        } as Post;
        if (!merged.id) merged.id = input.id;
        await upsertRow("posts", postToRow(merged));
        return merged;
      }
      invalidateReadCache();
      const [slugRows] = await pool.query("SELECT slug FROM posts");
      const taken = new Set((slugRows as { slug: string }[]).map((r) => r.slug));
      const post: Post = {
        id: `post-${Date.now()}`,
        slug: uniqueSlug(slugify(input.title), taken),
        excerpt: "",
        content: "",
        tags: [],
        status: "draft",
        publishedAt: nowIso,
        updatedAt: nowIso,
        ...normalizePost(input),
      } as Post;
      await upsertRow("posts", postToRow(post));
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
    const pool = mysqlPool();
    if (pool) {
      await deleteRow("posts", "id", id);
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM reviews ORDER BY `order` ASC");
      return (rows as Record<string, unknown>[]).map(rowToReview);
    },
    async () => {
      const s = await loadLocal();
      return [...s.reviews].sort((a, b) => a.order - b.order);
    }
  );
}

export async function saveReviews(reviews: Review[]): Promise<Review[]> {
  try {
    const pool = mysqlPool();
    if (pool) {
      await pool.query("DELETE FROM reviews");
      for (const r of reviews) {
        await upsertRow("reviews", {
          id: r.id,
          quote: nullIfUndef(r.quote),
          author: nullIfUndef(r.author),
          location: nullIfUndef(r.location),
          rating: r.rating,
          order: r.order,
        });
      }
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
    async () => {
      const pool = requirePool();
      const [rows] = await pool.query("SELECT * FROM settings WHERE id = 'site' LIMIT 1");
      const list = rows as Record<string, unknown>[];
      if (!list.length) {
        await upsertRow("settings", settingsToRow("site", seedSettings));
        return structuredClone(seedSettings);
      }
      return { ...structuredClone(seedSettings), ...rowToSettings(list[0]) };
    },
    async () => {
      const s = await loadLocal();
      return s.settings;
    }
  );
}

function rowToSettings(r: Record<string, unknown>): Partial<SiteSettings> {
  return {
    announcementBar: parseJson<string[]>(r.announcementBar, []),
    freeDeliveryThreshold: toNum(r.freeDeliveryThreshold),
    acceptedPayments: parseJson<SiteSettings["acceptedPayments"]>(r.acceptedPayments, []),
    deliveryTimeText: (r.deliveryTimeText as string) ?? "",
    confirmationCallText: (r.confirmationCallText as string) ?? "",
    refusalPolicy: (r.refusalPolicy as string) ?? "",
    phone: (r.phone as string) ?? "",
    email: (r.email as string) ?? "",
    address: (r.address as string) ?? "",
    trustpilotRating: (r.trustpilotRating as string) ?? "",
  };
}

function settingsToRow(id: string, s: SiteSettings): Record<string, unknown> {
  return {
    id,
    announcementBar: toJson(s.announcementBar ?? []),
    freeDeliveryThreshold: s.freeDeliveryThreshold ?? 0,
    acceptedPayments: toJson(s.acceptedPayments ?? []),
    deliveryTimeText: nullIfUndef(s.deliveryTimeText),
    confirmationCallText: nullIfUndef(s.confirmationCallText),
    refusalPolicy: nullIfUndef(s.refusalPolicy),
    phone: nullIfUndef(s.phone),
    email: nullIfUndef(s.email),
    address: nullIfUndef(s.address),
    trustpilotRating: nullIfUndef(s.trustpilotRating),
  };
}

export async function saveSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  try {
    const pool = mysqlPool();
    if (pool) {
      const current = await getSettings();
      const merged = { ...current, ...patch };
      await upsertRow("settings", settingsToRow("site", merged));
      invalidateReadCache();
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
