import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Routing architecture (no basePath — see next.config.ts):
   - Frontend + admin live under /uk:   domain.com/uk, domain.com/uk/sofas/…,
     domain.com/uk/admin/…
   - API stays directly on /api/*:      domain.com/api/products (no /uk)
   The /uk prefix is a URL-level concern only: middleware rewrites /uk/*
   to the real /* routes internally, so the browser and crawlers always see
   /uk while the app keeps its plain route tree. */
export function middleware(req: NextRequest) {
  // Raw path exactly as requested — no basePath is configured, so
  // req.nextUrl.pathname is the raw path here.
  const rawPath = new URL(req.url).pathname;

  // API: served directly, never prefixed.
  if (rawPath === "/api" || rawPath.startsWith("/api/")) return NextResponse.next();

  // Domain root -> /uk (permanent).
  if (rawPath === "/") return NextResponse.redirect(new URL("/uk", req.url), 308);

  // Dotted files (sitemap.xml, robots.txt, llms.txt, icons…) live at the
  // domain root by convention. A /uk/-prefixed request for one permanently
  // redirects to the root file so it never 404s.
  if (rawPath.startsWith("/uk/") && rawPath.slice(4).includes(".")) {
    const url = req.nextUrl.clone();
    url.pathname = rawPath.slice(3);
    return NextResponse.redirect(url, 308);
  }

  // /uk/* -> serve the real /* route internally (URL keeps /uk).
  if (rawPath === "/uk" || rawPath.startsWith("/uk/")) {
    const url = req.nextUrl.clone();
    url.pathname = rawPath === "/uk" ? "/" : rawPath.slice(3);
    return NextResponse.rewrite(url);
  }

  // Legacy: a page/admin URL without the prefix -> its /uk equivalent.
  return NextResponse.redirect(new URL(`/uk${rawPath}`, req.url), 308);
}

export const config = {
  // The first pattern skips the API, _next assets and dotted files (static
  // assets served from the domain root). The second ensures /uk/-prefixed
  // dotted files (e.g. /uk/sitemap.xml) still reach the middleware so they
  // can be redirected to their root versions instead of 404ing.
  matcher: ["/((?!api|_next|.*\\..*).*)", "/uk/:path*"],
};
