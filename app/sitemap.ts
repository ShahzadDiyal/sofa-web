import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { listCategories, listPosts, listProducts } from "@/lib/db";
import { BASE_PATH, siteUrl } from "@/lib/seo";

/* The sitemap always uses the domain that is actually serving the request
   (falling back to the configured site URL at build time). This keeps every
   <loc> correct no matter which host or subdomain the app is deployed to —
   moving hosts never leaves the sitemap pointing at a stale domain. */
async function publicBase(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
    if (host) return `https://${host}`.replace(/\/$/, "");
  } catch {
    /* Not in a request context (e.g. build-time prerender). */
  }
  return siteUrl();
}

/** Absolute image URL using the request's base (product photos are absolute already). */
function img(base: string, url: string | null | undefined): string {
  if (!url) return `${base}${BASE_PATH}/opengraph-image`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, posts] = await Promise.all([
    listProducts(),
    listCategories(),
    listPosts(true),
  ]);
  const base = await publicBase();
  const u = (p: string) => `${base}${BASE_PATH}${p}`;

  const staticPages = [
    "/",
    "/sofas",
    "/coupons",
    "/blog",
    "/reviews",
    "/wishlist",
    "/delivery",
    "/returns",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
  ].map((p) => ({
    url: u(p),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1 : p === "/blog" ? 0.9 : 0.8,
  }));

  const productUrls = products.map((p) => ({
    url: u(`/sofas/${p.slug}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
    images: [img(base, p.imageUrl)],
  }));

  const categoryUrls = categories.map((c) => ({
    url: u(`/sofas/category/${c.slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
    images: [img(base, c.imageUrl)],
  }));

  const postUrls = posts.map((p) => ({
    url: u(`/blog/${p.slug}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
    images: [img(base, p.coverImage)],
  }));

  return [...staticPages, ...categoryUrls, ...productUrls, ...postUrls];
}
