"use client";

/* Admin notification bell: unread-count badge + dropdown of the latest
   notifications. Styled for the dark forest admin sidebar. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBell, IconMail, IconPackage, IconShield } from "@/components/Icons";
import { api } from "./_ui";
import type { AdminNotification } from "@/lib/db";

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const notificationIcon = (type: AdminNotification["type"]) =>
  type === "query" ? IconMail : type === "account" ? IconShield : IconPackage;

export function AdminBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = () => {
    api<{ notifications: AdminNotification[]; unreadCount: number }>(
      "/api/admin/notifications?limit=8"
    )
      .then(({ notifications, unreadCount }) => {
        setItems(notifications);
        setUnreadCount(unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const openItem = async (n: AdminNotification) => {
    setOpen(false);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => (n.isRead ? c : Math.max(0, c - 1)));
    try {
      await api("/api/admin/notifications/read", "POST", { ids: [n.id] });
    } catch {
      // Navigation still happens; the full page re-syncs read state.
    }
    router.push(n.link);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        className="relative p-2 rounded-[10px] text-cream hover:bg-[#27463C] transition-colors cursor-pointer"
      >
        <IconBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-terra text-white rounded-full text-[11px] font-semibold px-1.5 py-px min-w-[20px] text-center leading-[18px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] z-50 bg-forest text-cream border border-[#3A5A4F] rounded-[12px] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#3A5A4F] font-semibold text-[15px]">
              Notifications
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px] text-[#C9D6CC]">
                  No notifications yet.
                </div>
              )}
              {items.map((n) => {
                const I = notificationIcon(n.type);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void openItem(n)}
                    className="w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-[#27463C] transition-colors cursor-pointer border-b border-[#3A5A4F]/60 last:border-0"
                  >
                    <span className="shrink-0 w-[36px] h-[36px] rounded-[10px] bg-[#27463C] grid place-items-center">
                      <I size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-[13.5px] truncate">{n.title}</span>
                        {!n.isRead && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-terra" />
                        )}
                      </span>
                      {n.body && (
                        <span className="block text-[12.5px] text-[#C9D6CC] truncate mt-0.5">
                          {n.body}
                        </span>
                      )}
                      <span className="block text-[11.5px] text-[#C9D6CC]/70 mt-0.5">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Link
              href="/uk/admin/notifications"
              onClick={() => setOpen(false)}
              className="block text-center px-4 py-3 text-[13px] font-semibold text-peach hover:bg-[#27463C] transition-colors border-t border-[#3A5A4F]"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
