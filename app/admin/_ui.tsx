"use client";

/* Shared admin primitives: status pills, toggles, cards, tables, skeletons,
   formatters, and the JSON API helper used by every admin page. */

import type { OrderStatus } from "@/lib/types";

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
  const res = await fetch(path, {
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
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
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
