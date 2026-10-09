/* Unified data access layer.
   - When Firebase Admin credentials are configured (FIREBASE_PROJECT_ID etc.),
     everything reads/writes real Firestore collections.
   - Otherwise a local seeded store is used (persisted to data/store.json so
     admin edits survive restarts). The API and pages never need to care. */

import { promises as fs } from "fs";
import path from "path";
import { adminDb } from "./firebase-admin";
import {
  seedCategories,
  seedFaqs,
  seedPosts,
  seedProducts,
  seedReviews,
  seedSettings,
} from "./seed";
import type {
  Category,
  Faq,
  Order,
  OrderStatus,
  Post,
  Product,
  Review,
  SiteSettings,
} from "./types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

interface LocalStore {
  products: Product[];
  categories: Category[];
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

function freshLocal(): LocalStore {
  return {
    products: structuredClone(seedProducts),
    categories: structuredClone(seedCategories),
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
    memoryStore = JSON.parse(raw) as LocalStore;
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
  const f = db();
  if (f) {
    const snap = await f.collection("products").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data() as Product);
  }
  const s = await loadLocal();
  return [...s.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProduct(slugOrId: string): Promise<Product | null> {
  const f = db();
  if (f) {
    const byId = await f.collection("products").doc(slugOrId).get();
    if (byId.exists) return byId.data() as Product;
    const q = await f.collection("products").where("slug", "==", slugOrId).limit(1).get();
    return q.empty ? null : (q.docs[0].data() as Product);
  }
  const s = await loadLocal();
  return s.products.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
}

export async function saveProduct(input: Partial<Product> & { name: string }): Promise<Product> {
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
      await ref.set(merged, { merge: true });
      return merged;
    }
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
}

export async function deleteProduct(id: string): Promise<void> {
  const f = db();
  if (f) {
    await f.collection("products").doc(id).delete();
    return;
  }
  await mutateLocal((s) => {
    s.products = s.products.filter((p) => p.id !== id);
  });
}

export async function listCategories(): Promise<Category[]> {
  const f = db();
  if (f) {
    const snap = await f.collection("categories").get();
    if (snap.empty) {
      // first run: seed categories
      const batch = f.batch();
      for (const c of seedCategories) batch.set(f.collection("categories").doc(c.id), c);
      await batch.commit();
      return seedCategories;
    }
    return snap.docs.map((d) => d.data() as Category);
  }
  const s = await loadLocal();
  return s.categories;
}

export async function saveCategory(input: Partial<Category> & { name: string }): Promise<Category> {
  const f = db();
  if (f) {
    const col = f.collection("categories");
    if (input.id) {
      const ref = col.doc(input.id);
      const existing = (await ref.get()).data() as Category | undefined;
      const merged = { ...(existing as Category), ...input } as Category;
      await ref.set(merged, { merge: true });
      return merged;
    }
    const slugBase = (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
}

export async function deleteCategory(id: string): Promise<void> {
  const f = db();
  if (f) {
    await f.collection("categories").doc(id).delete();
    return;
  }
  await mutateLocal((s) => {
    s.categories = s.categories.filter((c) => c.id !== id);
  });
}

/* ---------- orders ---------- */

export async function listOrders(): Promise<Order[]> {
  const f = db();
  if (f) {
    const snap = await f.collection("orders").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data() as Order);
  }
  const s = await loadLocal();
  return [...s.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(idOrNumber: string): Promise<Order | null> {
  const f = db();
  if (f) {
    const byId = await f.collection("orders").doc(idOrNumber).get();
    if (byId.exists) return byId.data() as Order;
    const q = await f.collection("orders").where("number", "==", idOrNumber.toUpperCase()).limit(1).get();
    return q.empty ? null : (q.docs[0].data() as Order);
  }
  const s = await loadLocal();
  return (
    s.orders.find((o) => o.id === idOrNumber || o.number === idOrNumber.toUpperCase()) ?? null
  );
}

export async function createOrder(input: {
  items: Order["items"];
  customer: Order["customer"];
  deliverySlot?: string;
  paymentMethod: Order["paymentMethod"];
}): Promise<Order> {
  const nowIso = new Date().toISOString();
  const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const settings = await getSettings();
  const deliveryFee = subtotal >= settings.freeDeliveryThreshold || subtotal === 0 ? 0 : 29;
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
      items: input.items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      customer: input.customer,
      deliverySlot: input.deliverySlot,
      paymentMethod: input.paymentMethod,
      status: "new",
      createdAt: nowIso,
      updatedAt: nowIso,
      timeline: [{ status: "new", at: nowIso, note: "Order placed online — pay on delivery" }],
    };
    await f.collection("orders").doc(id).set(order);
    return order;
  }
  return mutateLocal((s) => {
    const order: Order = {
      id: `ord-${Date.now()}`,
      number: `SOF-${s.orderSeq++}`,
      items: input.items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      customer: input.customer,
      deliverySlot: input.deliverySlot,
      paymentMethod: input.paymentMethod,
      status: "new",
      createdAt: nowIso,
      updatedAt: nowIso,
      timeline: [{ status: "new", at: nowIso, note: "Order placed online — pay on delivery" }],
    };
    s.orders.push(order);
    return order;
  });
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string
): Promise<Order | null> {
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
}

/* ---------- content: faqs / reviews / settings ---------- */

export async function listFaqs(): Promise<Faq[]> {
  const f = db();
  if (f) {
    const snap = await f.collection("faqs").orderBy("order").get();
    if (snap.empty) {
      const batch = f.batch();
      for (const q of seedFaqs) batch.set(f.collection("faqs").doc(q.id), q);
      await batch.commit();
      return seedFaqs;
    }
    return snap.docs.map((d) => d.data() as Faq);
  }
  const s = await loadLocal();
  return [...s.faqs].sort((a, b) => a.order - b.order);
}

export async function saveFaqs(faqs: Faq[]): Promise<Faq[]> {
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
}

/* ---------- content: blog posts ---------- */

export async function listPosts(publishedOnly = false): Promise<Post[]> {
  const f = db();
  if (f) {
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
  }
  const s = await loadLocal();
  const all = [...s.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return publishedOnly ? all.filter((p) => p.status === "published") : all;
}

export async function getPost(slugOrId: string): Promise<Post | null> {
  const f = db();
  if (f) {
    const byId = await f.collection("posts").doc(slugOrId).get();
    if (byId.exists) return byId.data() as Post;
    const q = await f.collection("posts").where("slug", "==", slugOrId).limit(1).get();
    return q.empty ? null : (q.docs[0].data() as Post);
  }
  const s = await loadLocal();
  return s.posts.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
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
}

export async function deletePost(id: string): Promise<void> {
  const f = db();
  if (f) {
    await f.collection("posts").doc(id).delete();
    return;
  }
  await mutateLocal((s) => {
    s.posts = s.posts.filter((p) => p.id !== id);
  });
}

export async function listReviews(): Promise<Review[]> {
  const f = db();
  if (f) {
    const snap = await f.collection("reviews").orderBy("order").get();
    if (snap.empty) {
      const batch = f.batch();
      for (const r of seedReviews) batch.set(f.collection("reviews").doc(r.id), r);
      await batch.commit();
      return seedReviews;
    }
    return snap.docs.map((d) => d.data() as Review);
  }
  const s = await loadLocal();
  return [...s.reviews].sort((a, b) => a.order - b.order);
}

export async function saveReviews(reviews: Review[]): Promise<Review[]> {
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
}

export async function getSettings(): Promise<SiteSettings> {
  const f = db();
  if (f) {
    const snap = await f.collection("settings").doc("site").get();
    if (!snap.exists) {
      await f.collection("settings").doc("site").set(seedSettings);
      return seedSettings;
    }
    return { ...seedSettings, ...(snap.data() as Partial<SiteSettings>) };
  }
  const s = await loadLocal();
  return s.settings;
}

export async function saveSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
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
}
