import type { MetadataRoute } from "next";
import { BASE_PATH, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [`${BASE_PATH}/admin`, "/api/", `${BASE_PATH}/api/`, `${BASE_PATH}/order-confirmed`],
      },
    ],
    // Crawler files live at the domain root; /uk/sitemap.xml redirects here.
    sitemap: `${base}/sitemap.xml`,
  };
}
