"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { gbp } from "@/lib/seo";
import type { Order, Product } from "@/lib/types";
import {
  Card,
  CardTitle,
  EmptyState,
  ErrorBox,
  Pill,
  Skeleton,
  SkeletonCards,
  SkeletonTable,
  StatusPill,
  api,
  isToday,
  timeAgo,
} from "./_ui";

const DAY = 86400000;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  // Client-only clock strings (set after mount to avoid SSR hydration mismatch —
  // the server's timezone can differ from the browser's).
  const [greet, setGreet] = useState("Good day");
  const [dateLine, setDateLine] = useState("");

  useEffect(() => {
    setGreet(greeting());
    setDateLine(
      new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date())
    );
  }, []);

  const load = () => {
    setError("");
    Promise.all([api<{ orders: Order[] }>("/api/orders"), api<{ products: Product[] }>("/api/products")])
      .then(([{ orders }, { products }]) => {
        setOrders(orders);
        setProducts(products);
      })
      .catch((e) => setError(e.message || "Could not load dashboard data."));
  };
  useEffect(load, []);

  const kpis = useMemo(() => {
    if (!orders) return null;
    const now = Date.now();
    const last30 = orders.filter((o) => now - new Date(o.createdAt).getTime() < 30 * DAY);
    const newToday = orders.filter((o) => o.status === "new" && isToday(o.createdAt)).length;
    const awaiting = orders.filter((o) => o.status === "new").length;
    const outForDelivery = orders.filter((o) => o.status === "out_for_delivery").length;
    const cashToCollect = orders
      .filter((o) => o.status === "confirmed" || o.status === "out_for_delivery")
      .reduce((s, o) => s + o.total, 0);
    const delivered30 = last30.filter((o) => o.status === "delivered").length;
    const refused30 = last30.filter((o) => o.status === "refused" || o.status === "cancelled").length;
    const pct = (n: number) => (last30.length ? `${Math.round((n / last30.length) * 100)}%` : "—");
    return [
      { label: "New orders today", value: String(newToday), hint: "placed today", color: "#2F7D4F" },
      { label: "Awaiting confirmation", value: String(awaiting), hint: "Call these first", color: "#9A6A12" },
      { label: "Out for delivery", value: String(outForDelivery), hint: "On the road today", color: "#2F5D8A" },
      { label: "Cash to collect", value: gbp(cashToCollect), hint: "Across active routes", color: "#646A63" },
      { label: "Delivered & paid", value: pct(delivered30), hint: "Last 30 days", color: "#2F7D4F" },
      { label: "Refused / failed", value: pct(refused30), hint: "Target below 5%", color: "#B3402F" },
    ];
  }, [orders]);

  const bars = useMemo(() => {
    if (!orders) return null;
    const days: { label: string; count: number }[] = [];
    const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d.getTime() + DAY);
      const count = orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({ label: fmt.format(d), count });
    }
    const max = Math.max(1, ...days.map((d) => d.count));
    return days.map((d) => ({ ...d, h: Math.round((d.count / max) * 150) }));
  }, [orders]);

  const funnel = useMemo(() => {
    if (!orders) return null;
    const total = orders.length || 1;
    const has = (ss: Order["status"][]) => orders.filter((o) => ss.includes(o.status)).length;
    const rows = [
      { label: "Orders placed", n: total },
      { label: "Confirmed by phone", n: has(["confirmed", "out_for_delivery", "delivered"]) },
      { label: "Dispatched", n: has(["out_for_delivery", "delivered"]) },
      { label: "Delivered", n: has(["delivered"]) },
      { label: "Cash collected", n: has(["delivered"]) },
    ];
    return rows.map((r) => ({
      ...r,
      pctLabel: `${Math.round((r.n / total) * 100)}%`,
      width: `${Math.max(4, Math.round((r.n / total) * 100))}%`,
    }));
  }, [orders]);

  const recent = useMemo(() => {
    if (!orders) return null;
    const needle = q.trim().toLowerCase();
    const list = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!needle) return list.slice(0, 5);
    return list
      .filter(
        (o) =>
          o.number.toLowerCase().includes(needle) ||
          o.customer.name.toLowerCase().includes(needle) ||
          o.customer.phone.replace(/\s/g, "").includes(needle.replace(/\s/g, ""))
      )
      .slice(0, 5);
  }, [orders, q]);

  const alerts = useMemo(() => {
    if (!orders || !products) return null;
    const out: { title: string; hint: string; bg: string; fg: string }[] = [];
    const stale = orders.filter(
      (o) => o.status === "new" && Date.now() - new Date(o.createdAt).getTime() > 24 * 3600 * 1000
    ).length;
    if (stale > 0)
      out.push({
        title: `${stale} order${stale > 1 ? "s" : ""} unconfirmed for 24h+`,
        hint: "Call or text to confirm slot",
        bg: "#F8EAC8",
        fg: "#9A6A12",
      });
    const risky = orders.filter((o) => o.status === "refused" || o.status === "cancelled").length;
    if (risky > 0)
      out.push({
        title: `${risky} refused / failed order${risky > 1 ? "s" : ""}`,
        hint: "Repeat refusals or mismatched postcode",
        bg: "#F6DDD8",
        fg: "#B3402F",
      });
    const onRoad = orders.filter((o) => o.status === "out_for_delivery").length;
    if (onRoad > 0)
      out.push({
        title: `${onRoad} out for delivery`,
        hint: "Cash to collect on the road",
        bg: "#DCE8F3",
        fg: "#2F5D8A",
      });
    const newBadged = products.filter((p) => p.tag === "New").length;
    if (newBadged > 0)
      out.push({
        title: `${newBadged} sofa${newBadged > 1 ? "s" : ""} marked “New”`,
        hint: "Review badges on the storefront",
        bg: "#EBE3D6",
        fg: "#1E2421",
      });
    return out;
  }, [orders, products]);

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-[36px] leading-tight">{greet}</h1>
          <p className="text-muted mt-1.5 min-h-[24px]">{dateLine}</p>
        </div>
        <label className="flex items-center gap-2.5 bg-white border-[1.5px] border-line rounded-full px-4 min-h-[44px] min-w-[240px]">
          <IconSearch size={18} className="text-muted shrink-0" />
          <input
            aria-label="Search orders"
            placeholder="Search order, name, phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
          />
        </label>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      {!orders ? (
        <SkeletonCards n={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpis!.map((k) => (
            <div key={k.label} className="bg-white rounded-[20px] p-5 flex flex-col gap-2">
              <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-muted">{k.label}</span>
              <span className="text-[32px] font-semibold leading-none tracking-tight">{k.value}</span>
              <span className="text-[13px] font-medium" style={{ color: k.color }}>
                {k.hint}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-5 items-stretch">
        <Card className="flex-[3_1_460px]">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h2 className="text-[24px]">Orders this week</h2>
            <Pill bg="#E3EBE4" fg="#1F3A32">
              Last 7 days
            </Pill>
          </div>
          {!bars ? (
            <Skeleton className="h-[210px]" />
          ) : (
            <>
              <div className="flex items-end gap-3.5 h-[210px] pt-3 border-b border-line">
                {bars.map((b) => (
                  <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                    <span className="text-[12px] text-muted">{b.count}</span>
                    <div
                      className="w-full max-w-[56px] bg-forest rounded-t-[10px] rounded-b-[4px] min-h-[6px]"
                      style={{ height: b.h }}
                      role="img"
                      aria-label={`${b.label}: ${b.count} orders`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3.5">
                {bars.map((b) => (
                  <span key={b.label} className="flex-1 text-center text-[12px] text-muted">
                    {b.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="flex-[2_1_320px]">
          <div>
            <h2 className="text-[24px]">COD funnel</h2>
            <p className="text-muted text-[14px] -mt-1">From order placed to cash collected</p>
          </div>
          {!funnel ? (
            <div className="flex flex-col gap-3.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[34px]" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {funnel.map((f) => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[14px]">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted">
                      {f.n} · {f.pctLabel}
                    </span>
                  </div>
                  <div className="h-[10px] bg-sand rounded-[6px] overflow-hidden">
                    <div className="h-full bg-forest rounded-[6px]" style={{ width: f.width }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-5 items-start">
        <Card className="flex-[3_1_520px] p-0! overflow-hidden">
          <div className="flex justify-between items-center gap-3 flex-wrap px-6 pt-6">
            <h2 className="text-[24px]">Recent orders</h2>
            <Link href="/admin/orders" className="font-semibold underline text-[14px]">
              View all
            </Link>
          </div>
          {!recent ? (
            <div className="px-6 pb-6">
              <SkeletonTable rows={5} cols={5} />
            </div>
          ) : recent.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                title={orders!.length === 0 ? "No orders yet" : "No matches"}
                hint={
                  orders!.length === 0
                    ? "Orders placed on the storefront will appear here."
                    : "Try a different order number, name or phone."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-6 py-2.5 border-b border-line">Order</th>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line">Customer</th>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line">Sofa</th>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line">Due on delivery</th>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-6 py-2.5 border-b border-line">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="hover:bg-[#FBF9F5]">
                      <td className="px-6 py-3.5 border-b border-sand text-[14px]">
                        <Link href={`/admin/orders/${o.id}`} className="font-semibold underline">
                          #{o.number}
                        </Link>
                        <div className="text-[12px] text-muted mt-0.5">{timeAgo(o.createdAt)}</div>
                      </td>
                      <td className="px-3 py-3.5 border-b border-sand text-[14px]">
                        <div className="font-medium">{o.customer.name}</div>
                        <div className="text-[12px] text-muted">{o.customer.city}</div>
                      </td>
                      <td className="px-3 py-3.5 border-b border-sand text-[14px]">
                        {o.items[0]?.name}
                        {o.items.length > 1 && <span className="text-muted"> +{o.items.length - 1} more</span>}
                      </td>
                      <td className="px-3 py-3.5 border-b border-sand text-[14px] font-semibold">{gbp(o.total)}</td>
                      <td className="px-6 py-3.5 border-b border-sand text-[14px]">
                        <StatusPill status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="flex-[2_1_320px]">
          <CardTitle>Needs attention</CardTitle>
          {!alerts ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[56px]" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-muted text-[14px]">All clear — nothing needs attention right now.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((a) => (
                <div
                  key={a.title}
                  className="rounded-[14px] px-4 py-3.5"
                  style={{ background: a.bg, color: a.fg }}
                >
                  <div className="font-semibold text-[14px]">{a.title}</div>
                  <div className="text-[13px] opacity-90 mt-0.5">{a.hint}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
