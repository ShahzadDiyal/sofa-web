/* Admin session endpoints.
   POST   { email, password } -> checks the Firestore `users` collection
                       (account must exist with role "admin"), sets the
                       httpOnly `sofora_admin` session cookie (5 days).
   GET                    -> 200 { email } when signed in, else 401.
   DELETE                 -> clears the session cookie (sign out). */

import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminEmail, makeSessionValue } from "@/lib/admin-auth";
import { verifyAdminCredentials } from "@/lib/admin-users";

const FIVE_DAYS_S = 5 * 24 * 60 * 60;

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  let user;
  try {
    user = await verifyAdminCredentials(email, password);
  } catch {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json(
      { error: "Wrong email or password — or this account is not an admin." },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ ok: true, email: user.email });
  res.cookies.set(ADMIN_COOKIE, makeSessionValue(user.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FIVE_DAYS_S,
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
