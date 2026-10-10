/* Admin session endpoints.
   POST   { idToken } -> verifies the Firebase ID token, checks the
                       ADMIN_EMAILS allow-list, sets the httpOnly
                       `sofora_admin` session cookie (5 days).
   GET                -> 200 { email } when signed in, else 401.
   DELETE             -> clears the session cookie (sign out). */

import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { ADMIN_COOKIE, adminAllowlist, getAdminEmail } from "@/lib/admin-auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing sign-in token." }, { status: 400 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 500 });
  }
  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid sign-in token." }, { status: 401 });
  }
  const email = (decoded.email ?? "").toLowerCase();
  const list = adminAllowlist();
  if (list.length === 0) {
    return NextResponse.json(
      { error: "No admin emails configured on the server (ADMIN_EMAILS)." },
      { status: 403 }
    );
  }
  if (!email || !list.includes(email)) {
    return NextResponse.json(
      { error: "This account is not on the admin allow-list." },
      { status: 403 }
    );
  }
  const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(ADMIN_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FIVE_DAYS_MS / 1000,
  });
  return res;
}

export async function GET() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ ok: true, email });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
