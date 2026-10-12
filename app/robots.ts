import type { MetadataRoute } from "next";
import { BASE_PATH, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [`${BASE_PATH}/admin`, `${BASE_PATH}/api/`, `${BASE_PATH}/order-confirmed`],
      },
    ],
    sitemap: `${base}${BASE_PATH}/sitemap.xml`,
  };
}
