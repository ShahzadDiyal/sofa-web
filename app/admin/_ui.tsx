"use client";

/* Shared admin primitives: status pills, toggles, cards, tables, skeletons,
   formatters, pagination, and the JSON API helper used by every admin page. */

import { useEffect, useRef, useState } from "react";
import type { OrderStatus } from "@/lib/types";
import { IconRefresh } from "@/components/Icons";
import { apiUrl } from "@/lib/seo";

/* ---------- status pills (colors from SPEC §Order status badge colors) ---------- */

export const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  new: { label: "Awaiting confirmation", bg: "#F8EAC8", fg: "#9A6A12" },
  confirmed: { label: "Confirmed", bg: "#E3EBE4", fg: "#1F3A32" },
  out_for_delivery: { label: "Out for delivery", bg: "#DCE8F3", fg: "#2F5D8A" },
  delivered: { label: "Delivered · paid", bg: "#DDEFE3", fg: "#2F7D4F" },
  refused: { label: "Refused", bg: "#F6DDD8", fg: "#B3402F" },
  cancelled: { label: "Cancelled", bg: "#F6DDD8", fg: "#B3402F" },
};

export function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[12px] font-semibold whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return (
    <Pill bg={m.bg} fg={m.fg}>
      {m.label}
    </Pill>
  );
}

/* ---------- toggle switch (.tg in the mockup) ---------- */

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: ${on ? "On" : "Off"}`}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        on ? "bg-forest" : "bg-line"
      }`}
    >
      <span
        className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[23px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

/* ---------- cards / buttons / tables ---------- */

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`bg-white rounded-[20px] p-6 flex flex-col gap-4 ${className}`}>{children}</section>;
}

export function CardTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="text-[22px]">{children}</h2>
      {aside}
    </div>
  );
}

export const btnAdmin =
  "inline-flex items-center justify-center gap-2 px-[18px] py-[10px] rounded-full border-[1.5px] border-line bg-white font-semibold text-[14px] text-ink hover:bg-cream transition min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export const btnAdminPrimary =
  "inline-flex items-center justify-center gap-2 px-[18px] py-[10px] rounded-full border-[1.5px] border-forest bg-forest text-cream font-semibold text-[14px] hover:opacity-90 transition min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export const thClass =
  "text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line whitespace-nowrap";

export const tdClass = "px-3 py-3.5 border-b border-sand text-[14px] align-middle";

export const fieldClass =
  "w-full border-[1.5px] border-line rounded-[12px] bg-white px-3.5 py-3 text-[15px] font-medium text-ink outline-none focus:border-forest transition min-h-[48px]";

export const labelClass = "block text-[13px] font-semibold mb-1.5 text-ink";

/* ---------- skeletons (never spinners) ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonCards({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-[120px]" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-[20px] p-6 flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-[22px] flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- formatters ---------- */

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "—";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return (
    !isNaN(d.getTime()) &&
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/* ---------- API helper ---------- */

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  // Client-side fetch() does not apply basePath (/uk) automatically.
  const res = await fetch(apiUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export function patchOrder(id: string, status: OrderStatus, note?: string) {
  return api<{ order: import("@/lib/types").Order }>(`/api/orders/${id}`, "PATCH", { status, note });
}

/* ---------- image uploads (device → Cloudinary) ---------- */

/** Upload an image file from the device to Cloudinary via /api/admin/upload.
    Resolves to the public URL. Folder defaults to "uploads". */
export async function uploadImage(file: File, folder = "uploads"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await fetch(apiUrl("/api/admin/upload"), { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error || `Upload failed (${res.status}).`);
  return json.url;
}

/* ---------- misc ---------- */

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-[#F6DDD8] text-[#B3402F] rounded-[16px] px-5 py-4 text-[14px] font-medium flex items-center justify-between gap-4 flex-wrap">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className={btnAdmin}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="bg-white rounded-[20px] p-10 text-center flex flex-col items-center gap-2">
      <p className="font-serif text-[22px]">{title}</p>
      {hint && <p className="text-muted text-[14px]">{hint}</p>}
    </div>
  );
}

/* ---------- pagination (default 10 per page, adjustable) ---------- */

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];

/** Client-side pagination over an already-filtered list. Resets to page 1
    whenever the list identity or page size changes. */
export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const itemsRef = useRef(items);
  useEffect(() => {
    if (itemsRef.current !== items) {
      itemsRef.current = items;
      setPage(1);
    }
  }, [items]);
  const start = (safePage - 1) * perPage;
  return {
    page: safePage,
    setPage: (p: number) => setPage(Math.min(Math.max(1, p), pageCount)),
    perPage,
    setPerPage: (n: number) => {
      setPerPage(n);
      setPage(1);
    },
    pageCount,
    pageItems: items.slice(start, start + perPage),
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + perPage, items.length),
  };
}

function adminPageList(pageCount: number, current: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const nums = [...new Set([1, pageCount, current - 1, current, current + 1])]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/** Pagination bar with per-page dropdown. Render under any admin list. */
export function AdminPagination({
  page,
  pageCount,
  perPage,
  onPage,
  onPerPage,
  total,
  from,
  to,
}: {
  page: number;
  pageCount: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
  total: number;
  from: number;
  to: number;
}) {
  const btn =
    "min-w-[40px] min-h-[40px] px-2.5 rounded-[10px] border text-[14px] font-medium grid place-items-center transition-colors disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
      <span className="text-[13px] text-muted" role="status">
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Per page
          <select
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            className="rounded-[10px] border border-line bg-white px-2.5 py-2 text-[14px] font-medium text-ink min-h-[40px]"
            aria-label="Records per page"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {pageCount > 1 && (
          <nav className="flex items-center gap-1.5" aria-label="Pagination">
            <button
              type="button"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              className={`${btn} border-line bg-white hover:border-ink`}
              aria-label="Previous page"
            >
              ←
            </button>
            {adminPageList(pageCount, page).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="text-muted px-1 text-[14px]" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Page ${p}`}
                  className={`${btn} ${p === page ? "bg-forest border-forest text-cream" : "border-line bg-white hover:border-ink"}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => onPage(page + 1)}
              disabled={page >= pageCount}
              className={`${btn} border-line bg-white hover:border-ink`}
              aria-label="Next page"
            >
              →
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

/* Refresh button for admin list pages: re-fetches the page's data without
   showing the full skeleton — the old data stays visible while the new
   data loads. Pages wire it as:
     const [refreshing, setRefreshing] = useState(false);
     const refresh = () => { setRefreshing(true); load().finally(() => setRefreshing(false)); };
     <RefreshButton refreshing={refreshing} onRefresh={refresh} />
   where load() must NOT reset the data to null. */
export function RefreshButton({
  onRefresh,
  refreshing,
  label = "Refresh",
}: {
  onRefresh: () => void;
  refreshing: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      className={btnAdmin}
      aria-label={label}
      title={label}
    >
      <span className={refreshing ? "animate-spin inline-flex" : "inline-flex"}>
        <IconRefresh size={16} />
      </span>
      <span>{refreshing ? "Refreshing…" : label}</span>
    </button>
  );
}

/* Tells the admin shell to re-fetch the sidebar badge counts (new orders,
   new queries) immediately — call after marking something read/handled so
   the badges drop without waiting for navigation. */
export function refreshAdminBadges() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sofora:badges"));
}
