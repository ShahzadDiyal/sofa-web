"use client";

/* Admin → Notifications: full-page notification centre. New orders,
   customer queries and new accounts land here automatically. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import {
  AdminPagination,
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdmin,
  usePagination,
  refreshAdminBadges,
  RefreshButton,
} from "../_ui";
import { notificationIcon, timeAgo } from "../_notifications";
import type { AdminNotification } from "@/lib/db";

type Tab = "all" | "order" | "query" | "account";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "order", label: "Orders" },
  { id: "query", label: "Queries" },
  { id: "account", label: "Accounts" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = (t: Tab) => {
    setError("");
    const qs = t === "all" ? "" : `&type=${t}`;
    return api<{ notifications: AdminNotification[]; unreadCount: number }>(
      `/api/admin/notifications?limit=200${qs}`
    )
      .then(({ notifications, unreadCount }) => {
        setItems(notifications);
        setUnreadCount(unreadCount);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load notifications.")
      );
  };

  const load = (t: Tab) => {
    setItems(null);
    return fetchItems(t);
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const refresh = () => {
    setRefreshing(true);
    fetchItems(tab).finally(() => setRefreshing(false));
  };

  const pg = usePagination(items ?? []);

  const markAllRead = async () => {
    try {
      await api("/api/admin/notifications/read", "POST", { all: true });
      setItems((prev) => (prev ?? []).map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      refreshAdminBadges();
      toast.success("Notifications", "All notifications marked as read.");
    } catch (e) {
      toast.error(
        "Could not update notifications",
        e instanceof Error ? e.message : "Please try again."
      );
    }
  };

  const openItem = async (n: AdminNotification) => {
    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) ?? null);
    if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api("/api/admin/notifications/read", "POST", { ids: [n.id] });
    } catch {
      // Navigation still happens; the list re-syncs on next load.
    }
    refreshAdminBadges();
    router.push(n.link);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-serif text-[28px] leading-tight">Notifications</h1>
          <p className="text-muted text-[14px]">
            {unreadCount > 0
              ? `${unreadCount} unread — new orders, queries and accounts.`
              : "New orders, queries and accounts appear here."}
          </p>
        </div>
        <button
          type="button"
          className={`${btnAdmin} ml-auto`}
          onClick={() => void markAllRead()}
          disabled={!items?.some((n) => !n.isRead)}
        >
          Mark all as read
        </button>
        <RefreshButton refreshing={refreshing} onRefresh={refresh} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-[13.5px] font-semibold border-[1.5px] transition cursor-pointer ${
              tab === t.id
                ? "bg-forest text-cream border-forest"
                : "bg-white text-ink border-line hover:border-forest"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={() => load(tab)} />}
      {!error && items === null && (
        <Card>
          <SkeletonTable rows={8} cols={3} />
        </Card>
      )}
      {!error && items !== null && items.length === 0 && (
        <EmptyState
          title="No notifications"
          hint="New orders, customer queries and new accounts will show up here."
        />
      )}
      {!error && items !== null && items.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <ul>
            {pg.pageItems.map((n) => {
              const I = notificationIcon(n.type);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(n)}
                    className={`w-full text-left flex items-start gap-3.5 px-4 sm:px-5 py-4 border-b border-sand last:border-0 hover:bg-cream transition-colors cursor-pointer ${
                      n.isRead ? "" : "bg-peach/30"
                    }`}
                  >
                    <span className="shrink-0 w-[40px] h-[40px] rounded-[12px] bg-forest/10 text-forest grid place-items-center">
                      <I size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={`text-[14.5px] truncate ${
                            n.isRead ? "font-medium" : "font-bold"
                          }`}
                        >
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-terra" />
                        )}
                      </span>
                      {n.body && (
                        <span className="block text-[13px] text-muted truncate mt-0.5">
                          {n.body}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted whitespace-nowrap mt-1">
                      {timeAgo(n.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-4 sm:px-5 py-3 border-t border-sand">
            <AdminPagination
              page={pg.page}
              pageCount={pg.pageCount}
              perPage={pg.perPage}
              onPage={pg.setPage}
              onPerPage={pg.setPerPage}
              total={pg.total}
              from={pg.from}
              to={pg.to}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
