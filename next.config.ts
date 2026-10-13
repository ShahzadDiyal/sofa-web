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
