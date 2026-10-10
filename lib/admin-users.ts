/* Admin user store — MySQL `users` table, server-only.
   ------------------------------------------------------------------
   Each row is keyed by the lower-cased email:
     email (PK), password, role ("admin" | "user"), createdAt, updatedAt

   Admin sign-in checks the email + password + role here, so accounts
   (even dummy ones) can be created straight in phpMyAdmin or from the
   /admin/users page and used to log in immediately.
   Passwords are stored as entered. */

import { mysqlPool } from "./mysql";

export type AdminRole = "admin" | "user";

export interface AdminUser {
  email: string;
  password: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
}

function requirePool() {
  const pool = mysqlPool();
  if (!pool) throw new Error("MySQL is not configured (DATABASE_URL).");
  return pool;
}

export function userDocId(email: string): string {
  return email.trim().toLowerCase();
}

function rowToAdminUser(r: Record<string, unknown>): AdminUser {
  return {
    email: String(r.email ?? ""),
    password: String(r.password ?? ""),
    role: r.role === "admin" ? "admin" : "user",
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
  };
}

/** All users, newest first. Throws when MySQL is not configured. */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const pool = requirePool();
  const [rows] = await pool.query("SELECT * FROM users ORDER BY createdAt DESC");
  return (rows as Record<string, unknown>[]).map(rowToAdminUser);
}

/** Single user by email (case-insensitive), or null. */
export async function getAdminUser(email: string): Promise<AdminUser | null> {
  const pool = requirePool();
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [userDocId(email)]);
  const list = rows as Record<string, unknown>[];
  return list.length ? rowToAdminUser(list[0]) : null;
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
  const pool = requirePool();
  const id = userDocId(email);
  if (!id || !id.includes("@")) throw new Error("Enter a valid email address.");
  if (!password) throw new Error("Enter a password.");
  const now = new Date().toISOString();
  const user: AdminUser = { email: id, password, role, createdAt: now, updatedAt: now };
  await pool.query(
    "INSERT INTO users (email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?) " +
      "ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), updatedAt = VALUES(updatedAt)",
    [user.email, user.password, user.role, user.createdAt, user.updatedAt]
  );
  return user;
}

export async function setAdminUserRole(email: string, role: AdminRole): Promise<AdminUser | null> {
  const pool = requirePool();
  const id = userDocId(email);
  const [res] = await pool.query("UPDATE users SET role = ?, updatedAt = ? WHERE email = ?", [
    role,
    new Date().toISOString(),
    id,
  ]);
  if ((res as { affectedRows: number }).affectedRows === 0) return null;
  return getAdminUser(id);
}

export async function deleteAdminUser(email: string): Promise<boolean> {
  const pool = requirePool();
  const [res] = await pool.query("DELETE FROM users WHERE email = ?", [userDocId(email)]);
  return (res as { affectedRows: number }).affectedRows > 0;
}

/** Number of accounts currently holding the admin role. */
export async function countAdmins(): Promise<number> {
  const pool = requirePool();
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
  return Number((rows as { n: number }[])[0].n);
}
