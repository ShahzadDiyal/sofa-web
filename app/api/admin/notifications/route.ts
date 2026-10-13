import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  countUnreadNotifications,
  listNotifications,
  type NotificationType,
} from "@/lib/db";

/* Admin notification centre feed. Query params:
     limit      — max rows (default 50, max 200)
     unreadOnly — "1" returns only unread rows
     type       — "order" | "query" | "account" */
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";
  const typeParam = url.searchParams.get("type");
  const type: NotificationType | undefined =
    typeParam === "order" || typeParam === "query" || typeParam === "account"
      ? typeParam
      : undefined;
  const [notifications, unreadCount] = await Promise.all([
    listNotifications({ limit, unreadOnly, type }),
    countUnreadNotifications(),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}
