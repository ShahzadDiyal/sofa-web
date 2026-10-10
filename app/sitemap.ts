import type { MetadataRoute } from "next";
import { listCategories, listPosts, listProducts } from "@/lib/db";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories, posts] = await Promise.all([
    listProducts(),
    listCategories(),
    listPosts(true),
  ]);

  const staticPages = [
    "",
    "/sofas",
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
    url: `${base}${p || "/"}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p === "/blog" ? 0.9 : 0.8,
  }));

  const productUrls = products.map((p) => ({
    url: `${base}/sofas/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const categoryUrls = categories.map((c) => ({
    url: `${base}/sofas?category=${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const postUrls = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryUrls, ...productUrls, ...postUrls];
}
