/* Admin gate for API routes and admin UI.
   ------------------------------------------------------------------
   Every admin-only API route must call `requireAdmin()` at the top of its
   handler. The gate verifies the `sofora_admin` session cookie (set by
   POST /api/admin/session after a Firebase Auth sign-in) against the
   server-side Firebase Admin SDK, then checks the email against the
   ADMIN_EMAILS allow-list (comma-separated env var).

   Intentionally PUBLIC (storefront needs them):
     GET  /api/products          (header mega-menu, wishlist)
     GET  /api/categories        (header mega-menu)
     POST /api/orders            (checkout)
     GET  /api/orders/[id]       (order-confirmation page — PII redacted
                                 for non-admin callers; see its route)
   Everything else under /api requires a signed-in allow-listed admin.

   Local dev (no Firebase Admin credentials): the gate is permissive ONLY
   when ADMIN_EMAILS is unset; if ADMIN_EMAILS is set without credentials
   the gate denies everything (fail closed on misconfiguration). */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { isFirebaseConfigured } from "./firebase-admin";

export const ADMIN_COOKIE = "sofora_admin";

/** Comma-separated allow-list of admin emails (lower-cased). */
export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Email of the signed-in admin, or null when not signed in / not allowed. */
export async function getAdminEmail(): Promise<string | null> {
  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE)?.value;
  if (!session) return null;

  if (!isFirebaseConfigured()) {
    // Local dev (seed store, localhost server): nothing sensitive exists here.
    if (adminAllowlist().length > 0) return null; // misconfigured: fail closed
    console.warn("[admin-auth] Firebase Admin not configured — admin gate is permissive (local dev only)");
    return "local-dev";
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(session, true);
    const email = (decoded.email ?? "").toLowerCase();
    if (!email) return null;
    const list = adminAllowlist();
    if (list.length === 0) return null; // no allow-list configured: fail closed
    if (!list.includes(email)) return null;
    return email;
  } catch {
    return null;
  }
}

/** Call at the top of every admin-only API route handler.
    Returns null when authorised, otherwise a 401 JSON response to return. */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await getAdminEmail()) return null;
  return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
}
