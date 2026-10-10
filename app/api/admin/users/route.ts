/* Admin user management API (all routes require a signed-in admin).
   GET     -> list all users in the Firestore `users` collection.
   POST    -> { email, password, role } creates a user (upserts by email).
   PATCH   -> { email, role } changes a user's role. Refuses to demote the
              last remaining admin.
   DELETE  -> ?email=… removes a user. Refuses to delete the last admin. */

import { NextResponse } from "next/server";
import { requireAdmin, getAdminEmail } from "@/lib/admin-auth";
import {
  countAdmins,
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  listAdminUsers,
  setAdminUserRole,
  type AdminRole,
} from "@/lib/admin-users";

function isRole(v: unknown): v is AdminRole {
  return v === "admin" || v === "user";
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { email, password, role } = await req.json().catch(() => ({}));
  if (!isRole(role)) {
    return NextResponse.json({ error: "Role must be admin or user." }, { status: 400 });
  }
  try {
    const user = await createAdminUser(email, password, role);
    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create user.";
    const status = msg === "Server Firebase is not configured." ? 500 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { email, role } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !isRole(role)) {
    return NextResponse.json({ error: "Provide an email and a role (admin or user)." }, { status: 400 });
  }
  try {
    const me = await getAdminEmail();
    const target = await getAdminUser(email);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.role === "admin" && role === "user") {
      if ((await countAdmins()) <= 1) {
        return NextResponse.json(
          { error: "You can't demote the last admin account." },
          { status: 400 }
        );
      }
      if (me && target.email.toLowerCase() === me.toLowerCase()) {
        // Allowed, but warn: they will be signed out on the next request.
      }
    }
    const user = await setAdminUserRole(email, role);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const email = new URL(req.url).searchParams.get("email") ?? "";
  if (!email) return NextResponse.json({ error: "Provide an email." }, { status: 400 });
  try {
    const target = await getAdminUser(email);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.role === "admin" && (await countAdmins()) <= 1) {
      return NextResponse.json(
        { error: "You can't delete the last admin account." },
        { status: 400 }
      );
    }
    await deleteAdminUser(email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server Firebase is not configured." }, { status: 500 });
  }
}
