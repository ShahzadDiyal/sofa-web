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
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
