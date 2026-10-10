/* Admin user store — Firestore `users` collection, server-only (Admin SDK).
   ------------------------------------------------------------------
   Each document is keyed by the lower-cased email and holds:
     { email, password, role: "admin" | "user", createdAt, updatedAt }

   Admin sign-in checks the email + password + role here, so accounts
   (even dummy ones) can be created straight in the Firestore console
   or from the /admin/users page and used to log in immediately.
   Passwords are stored as entered. */

import { adminDb } from "./firebase-admin";

export type AdminRole = "admin" | "user";

export interface AdminUser {
  email: string;
  password: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "users";

export function userDocId(email: string): string {
  return email.trim().toLowerCase();
}

function toAdminUser(id: string, data: FirebaseFirestore.DocumentData): AdminUser {
  return {
    email: typeof data.email === "string" ? data.email : id,
    password: typeof data.password === "string" ? data.password : "",
    role: data.role === "admin" ? "admin" : "user",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

function requireDb() {
  const db = adminDb();
  if (!db) throw new Error("Server Firebase is not configured.");
  return db;
}

/** All users, newest first. Throws when Firebase is not configured. */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const db = requireDb();
  const snap = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => toAdminUser(d.id, d.data()));
}

/** Single user by email (case-insensitive), or null. */
export async function getAdminUser(email: string): Promise<AdminUser | null> {
  const db = requireDb();
  const doc = await db.collection(COLLECTION).doc(userDocId(email)).get();
  if (!doc.exists) return null;
  return toAdminUser(doc.id, doc.data()!);
}

/** Verify email + password and that the account has the admin role. */
export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  const user = await getAdminUser(email);
  if (!user) return null;
  if (user.role !== "admin") return null;
  if (!user.password || user.password !== password) return null;
  return user;
}

export async function createAdminUser(
  email: string,
  password: string,
  role: AdminRole
): Promise<AdminUser> {
  const db = requireDb();
  const id = userDocId(email);
  if (!id || !id.includes("@")) throw new Error("Enter a valid email address.");
  if (!password) throw new Error("Enter a password.");
  const now = new Date().toISOString();
  const user: AdminUser = { email: id, password, role, createdAt: now, updatedAt: now };
  await db.collection(COLLECTION).doc(id).set(user);
  return user;
}

export async function setAdminUserRole(email: string, role: AdminRole): Promise<AdminUser | null> {
  const db = requireDb();
  const id = userDocId(email);
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update({ role, updatedAt: new Date().toISOString() });
  const updated = await ref.get();
  return toAdminUser(updated.id, updated.data()!);
}

export async function deleteAdminUser(email: string): Promise<boolean> {
  const db = requireDb();
  const ref = db.collection(COLLECTION).doc(userDocId(email));
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

/** Number of accounts currently holding the admin role. */
export async function countAdmins(): Promise<number> {
  const db = requireDb();
  const snap = await db.collection(COLLECTION).where("role", "==", "admin").get();
  return snap.size;
}
