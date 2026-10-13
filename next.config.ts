import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Routing: NO basePath. The /uk prefix is applied at the URL level by
     middleware.ts (rewrite /uk/* -> /* internally); the API stays directly
     on /api/*. Client-side fetch() calls use apiUrl() from @/lib/seo. */
  images: {
    // Product imagery is rendered as vector SVG in v1; allow remote hosts
    // for when real photography is wired up via the admin panel.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    // Build-time DB safety: static generation fans out into one worker
    // process per ~25 pages, and every worker opens its own MySQL pool
    // (up to 10 connections). On a 229-page build that is ~10 workers and
    // can exceed Hostinger's 75-connections-per-user limit, so page data
    // silently falls back to the local seed store. Fewer workers, each
    // rendering fewer pages at once, keeps total connections ≈ 30.
    staticGenerationMinPagesPerWorker: 80,
    staticGenerationMaxConcurrency: 4,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
