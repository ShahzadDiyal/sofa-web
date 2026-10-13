import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/admin-auth";
import { mysqlPool } from "@/lib/mysql";

/* Admin → Settings → Database: one-click schema migrations.
   Runs the pending files in db/migrations/*.sql against the live MySQL
   database and records them in `schema_migrations`, so re-running is
   always safe. Replaces the old Firestore-era endpoint (and the phpMyAdmin
   copy-paste dance). */

function migrationsDir() {
  return path.join(process.cwd(), "db", "migrations");
}

async function migrationFiles(): Promise<string[]> {
  const entries = await fs.readdir(migrationsDir());
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

function splitStatements(sql: string): string[] {
  const noComments = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  return noComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function appliedSet(pool: NonNullable<ReturnType<typeof mysqlPool>>): Promise<Set<string>> {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(128) PRIMARY KEY, appliedAt VARCHAR(32) NOT NULL)"
  );
  const [rows] = await pool.query("SELECT name, appliedAt FROM schema_migrations");
  const map = new Map<string, string>();
  for (const r of rows as Record<string, unknown>[]) map.set(String(r.name), String(r.appliedAt));
  return new Set(map.keys());
}

async function appliedWithDates(
  pool: NonNullable<ReturnType<typeof mysqlPool>>
): Promise<Map<string, string>> {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(128) PRIMARY KEY, appliedAt VARCHAR(32) NOT NULL)"
  );
  const [rows] = await pool.query("SELECT name, appliedAt FROM schema_migrations");
  const map = new Map<string, string>();
  for (const r of rows as Record<string, unknown>[]) map.set(String(r.name), String(r.appliedAt));
  return map;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const pool = mysqlPool();
  if (!pool)
    return NextResponse.json({ ok: false, error: "Database is not connected (DATABASE_URL missing)." });
  try {
    const files = await migrationFiles();
    const applied = await appliedWithDates(pool);
    return NextResponse.json({
      ok: true,
      migrations: files.map((name) => ({
        name,
        applied: applied.has(name),
        appliedAt: applied.get(name) ?? null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not read migration status." },
      { status: 500 }
    );
  }
}

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const pool = mysqlPool();
  if (!pool)
    return NextResponse.json({ ok: false, error: "Database is not connected (DATABASE_URL missing)." });
  try {
    const files = await migrationFiles();
    const already = await appliedSet(pool);
    const applied: string[] = [];
    const skipped: string[] = [];
    for (const name of files) {
      if (already.has(name)) {
        skipped.push(name);
        continue;
      }
      const sql = await fs.readFile(path.join(migrationsDir(), name), "utf-8");
      try {
        for (const stmt of splitStatements(sql)) {
          try {
            await pool.query(stmt);
          } catch (err: unknown) {
            const errno = (err as { errno?: number })?.errno;
            // 1050 = table exists, 1060 = duplicate column: the change is
            // already in place, so this statement is a no-op.
            if (errno === 1050 || errno === 1060) continue;
            throw err;
          }
        }
        await pool.query(
          "INSERT INTO schema_migrations (name, appliedAt) VALUES (?, ?) ON DUPLICATE KEY UPDATE appliedAt = VALUES(appliedAt)",
          [name, new Date().toISOString()]
        );
        applied.push(name);
      } catch (err) {
        return NextResponse.json(
          {
            ok: false,
            error: `Migration ${name} failed: ${err instanceof Error ? err.message : String(err)}`,
            failedMigration: name,
            applied,
          },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ ok: true, applied, skipped });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Migration failed." },
      { status: 500 }
    );
  }
}
