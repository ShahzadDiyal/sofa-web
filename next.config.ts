import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
