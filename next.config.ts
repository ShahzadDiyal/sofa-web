import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Every public route lives under /uk (domain.com/uk, domain.com/uk/sofas/…).
     next/link and next/router pick the prefix up automatically; client-side
     fetch() calls must use apiUrl() from @/lib/seo. */
  basePath: "/uk",
  images: {
    // Product imagery is rendered as vector SVG in v1; allow remote hosts
    // for when real photography is wired up via the admin panel.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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
