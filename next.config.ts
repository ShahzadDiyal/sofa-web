import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Every public route lives under /uk (domain.com/uk, domain.com/uk/sofas/…).
     next/link and next/router pick the prefix up automatically; client-side
     fetch() calls must use apiUrl() from @/lib/seo. */
  basePath: "/uk",
  /* The bare domain must never 404: domain.com/ -> domain.com/uk.
     basePath:false makes this match the literal "/" outside the basePath. */
  async redirects() {
    return [
      {
        source: "/",
        destination: "/uk",
        basePath: false,
        permanent: true,
      },
      /* Keep the crawler endpoints reachable at the domain root after the /uk
         move: domain.com/robots.txt and domain.com/sitemap.xml. */
      {
        source: "/robots.txt",
        destination: "/uk/robots.txt",
        basePath: false,
        permanent: true,
      },
      {
        source: "/sitemap.xml",
        destination: "/uk/sitemap.xml",
        basePath: false,
        permanent: true,
      },
    ];
  },
  /* Crawlers only look at the domain root: with basePath, app/robots.ts and
     app/sitemap.ts live at /uk/robots.txt and /uk/sitemap.xml, so the root
     copies would 404. Rewrites can't point outside the basePath internally
     (Next.js requires an external destination there), so use redirects —
     crawlers follow them for both robots.txt and sitemap.xml. */
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
