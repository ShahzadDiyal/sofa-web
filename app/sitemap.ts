import type { MetadataRoute } from "next";
import { listCategories, listProducts } from "@/lib/db";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);

  const staticPages = [
    "",
    "/sofas",
    "/checkout",
    "/wishlist",
    "/delivery",
    "/returns",
    "/contact",
    "/privacy",
  ].map((p) => ({
    url: `${base}${p || "/"}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
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

  return [...staticPages, ...categoryUrls, ...productUrls];
}
