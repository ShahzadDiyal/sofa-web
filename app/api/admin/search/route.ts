/* Global admin search API: GET /api/admin/search?q=…
   Searches products, categories, posts, colours, coupons, orders and
   contact queries in one call. Returns grouped results with deep links
   into the admin panel. Requires a signed-in admin. */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  listCategories,
  listColors,
  listCoupons,
  listOrders,
  listPosts,
  listProducts,
  listQueries,
} from "@/lib/db";

export type AdminSearchResult = {
  type: "product" | "category" | "post" | "colour" | "coupon" | "order" | "query";
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

const TYPE_LABEL: Record<AdminSearchResult["type"], string> = {
  product: "Sofas",
  category: "Categories",
  post: "Blog",
  colour: "Colours",
  coupon: "Coupons",
  order: "Orders",
  query: "Queries",
};

const LIMIT_PER_TYPE = 6;

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [], groups: [] });

  const needle = q.toLowerCase();
  const hit = (...fields: (string | undefined)[]) =>
    fields.some((f) => f && f.toLowerCase().includes(needle));

  try {
    const [products, categories, posts, colors, coupons, orders, queries] = await Promise.all([
      listProducts(),
      listCategories(),
      listPosts(false),
      listColors(),
      listCoupons(),
      listOrders(),
      listQueries(),
    ]);

    const results: AdminSearchResult[] = [];

    for (const p of products) {
      if (hit(p.name, p.sku, p.slug) && results.length < 60) {
        results.push({
          type: "product",
          id: p.id,
          title: p.name,
          subtitle: `£${p.price} · ${p.slug}`,
          url: `/admin/products/${p.id}`,
        });
        if (results.filter((r) => r.type === "product").length >= LIMIT_PER_TYPE) break;
      }
    }
    for (const c of categories) {
      if (hit(c.name, c.slug) && results.filter((r) => r.type === "category").length < LIMIT_PER_TYPE)
        results.push({ type: "category", id: c.id, title: c.name, subtitle: c.slug, url: "/admin/categories" });
    }
    for (const p of posts) {
      if (hit(p.title, p.slug) && results.filter((r) => r.type === "post").length < LIMIT_PER_TYPE)
        results.push({ type: "post", id: p.id, title: p.title, subtitle: p.slug, url: `/admin/posts/${p.id}` });
    }
    for (const c of colors) {
      if (hit(c.name) && results.filter((r) => r.type === "colour").length < LIMIT_PER_TYPE)
        results.push({ type: "colour", id: c.id, title: c.name, subtitle: c.hex ?? "", url: "/admin/colors" });
    }
    for (const c of coupons) {
      if (hit(c.code) && results.filter((r) => r.type === "coupon").length < LIMIT_PER_TYPE)
        results.push({ type: "coupon", id: c.id, title: c.code, subtitle: c.active ? "Active" : "Inactive", url: "/admin/coupons" });
    }
    for (const o of orders) {
      if (
        hit(o.number, o.customer?.name, o.customer?.email, o.customer?.phone, o.customer?.postcode) &&
        results.filter((r) => r.type === "order").length < LIMIT_PER_TYPE
      )
        results.push({
          type: "order",
          id: o.id,
          title: `Order ${o.number}`,
          subtitle: `${o.customer?.name ?? ""} · £${o.total}`,
          url: `/admin/orders/${o.id}`,
        });
    }
    for (const x of queries) {
      if (hit(x.name, x.email, x.subject) && results.filter((r) => r.type === "query").length < LIMIT_PER_TYPE)
        results.push({ type: "query", id: x.id, title: x.subject, subtitle: `${x.name} · ${x.email}`, url: "/admin/queries" });
    }

    const order: AdminSearchResult["type"][] = ["product", "category", "post", "colour", "coupon", "order", "query"];
    const groups = order
      .map((type) => ({ type, label: TYPE_LABEL[type], items: results.filter((r) => r.type === type) }))
      .filter((g) => g.items.length > 0);

    return NextResponse.json({ results, groups });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const notConfigured = msg === "MySQL is not configured (DATABASE_URL).";
    return NextResponse.json(
      { error: notConfigured ? "Server database is not configured." : "Search failed — please try again." },
      { status: notConfigured ? 500 : 503 }
    );
  }
}
