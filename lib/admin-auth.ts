/* Admin gate for API routes and the admin UI.
   ------------------------------------------------------------------
   Sign-in is a simple email + password form at /admin/login. POST
   /api/admin/session checks the credentials against the Firestore
   `users` collection (see lib/admin-users.ts) — the account must exist
   there with role "admin". On success the server sets the httpOnly
   `sofora_admin` cookie: base64url(email) + "." + HMAC-SHA256 signature,
   signed with ADMIN_SESSION_SECRET (production) or a fixed dev secret
   (local dev only — sessions survive server restarts).

   Every admin-only API route must call `requireAdmin()` at the top of its
   handler. getAdminEmail() re-checks the Firestore record on every call,
   so demoting or deleting an account revokes its sessions immediately.

   Intentionally PUBLIC (storefront needs them):
     GET  /api/products          (header mega-menu, wishlist)
     GET  /api/categories        (header mega-menu)
     POST /api/orders            (checkout)
     GET  /api/orders/[id]       (order-confirmation page — PII redacted
                                 for non-admin callers; see its route)
   Everything else under /api requires a signed-in admin. */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdminUser } from "./admin-users";

export const ADMIN_COOKIE = "sofora_admin";

let secret: Buffer | null = null;
function sessionSecret(): Buffer {
  if (!secret) {
    const env = process.env.ADMIN_SESSION_SECRET;
    if (env) {
      secret = Buffer.from(env, "utf8");
    } else if (process.env.NODE_ENV === "production") {
      // Fail closed: forging a session cookie must never be possible live.
      throw new Error("[admin-auth] ADMIN_SESSION_SECRET is not set.");
    } else {
      // Local dev: stable across restarts so sign-in survives `next dev`
      // auto-restarts (e.g. after a .env edit). Never used in production.
      secret = Buffer.from("sofora-dev-session-secret", "utf8");
    }
  }
  return secret;
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}
function b64urlDecode(s: string): string | null {
  try {
    return Buffer.from(s, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(email: string): string {
  return createHmac("sha256", sessionSecret()).update(email).digest("hex");
}

/** Build the signed cookie value for an admin email. */
export function makeSessionValue(email: string): string {
  const e = email.trim().toLowerCase();
  return `${b64urlEncode(e)}.${sign(e)}`;
}

/** Verify the cookie value and return the email, or null. */
function verifySessionValue(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const email = b64urlDecode(value.slice(0, dot));
  if (!email || !email.includes("@")) return null;
  const expected = sign(email);
  const actual = value.slice(dot + 1);
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return email;
}

/** Email of the signed-in admin, or null when not signed in / not an admin. */
export async function getAdminEmail(): Promise<string | null> {
  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE)?.value;
  if (!session) return null;
  const email = verifySessionValue(session);
  if (!email) return null;
  try {
    const user = await getAdminUser(email);
    if (!user || user.role !== "admin") return null;
    return user.email;
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
