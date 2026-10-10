/* MySQL connection pool (mysql2) — the single database backend.
   ------------------------------------------------------------------
   Set DATABASE_URL, e.g.:
     mysql://user:password@localhost:3306/dbname        (Hostinger live app)
     mysql://user:password@mysql-host:3306/dbname       (local dev → Hostinger, via Remote MySQL)

   When DATABASE_URL is unset the app serves the local seeded store
   (lib/db.ts falls back to it) — same behaviour as the old Firebase-less
   mode. The pool is lazy and shared per server instance. */

import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;
let attempted = false;

/** Parse a mysql:// URL into pool options (handles special chars in password). */
function parseDatabaseUrl(url: string): mysql.PoolOptions {
  const u = new URL(url);
  if (!/^mysql:$/.test(u.protocol)) throw new Error("DATABASE_URL must start with mysql://");
  const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL is missing the database name.");
  return {
    host: u.hostname || "localhost",
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

/** The shared pool, or null when DATABASE_URL is not set. Never throws. */
export function mysqlPool(): mysql.Pool | null {
  if (attempted) return pool;
  attempted = true;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[mysql] DATABASE_URL is not set — using the local seeded store.");
    return null;
  }
  try {
    pool = mysql.createPool({
      ...parseDatabaseUrl(url),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Keep dates as strings (the app uses ISO-8601 strings everywhere).
      dateStrings: true,
      // Reconnect-friendly defaults for shared hosting.
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    return pool;
  } catch (err) {
    console.error("[mysql] pool creation failed:", err);
    return null;
  }
}

/** True when the app is talking to real MySQL; false = local seeded store. */
export function isMysqlConfigured(): boolean {
  return mysqlPool() !== null;
}

/* ---------- row helpers ---------- */

/** Parse a TEXT column holding JSON; fall back to `fallback` on any error. */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Stringify for a TEXT column; null/undefined stay NULL. */
export function toJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/** MySQL TINYINT(1) → boolean. */
export function toBool(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

/** Number columns may come back as strings (DECIMAL) — coerce safely. */
export function toNum(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** undefined → null so mysql2 doesn't choke on missing params. */
export function nullIfUndef<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}
