import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* The storefront lives under /uk (see basePath in next.config.ts).
   - domain.com/            → domain.com/uk      (permanent)
   - domain.com/<anything>  → domain.com/uk/<anything>  (legacy, permanent)
   Static assets, _next internals and files with extensions are left alone. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/uk", req.url), 308);
  }
  if (!pathname.startsWith("/uk")) {
    const url = req.nextUrl.clone();
    url.pathname = `/uk${pathname}`;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
