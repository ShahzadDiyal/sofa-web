"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconChevronDown, IconSearch } from "@/components/Icons";
import { gbp } from "@/lib/seo";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  Pill,
  SkeletonTable,
  StatusPill,
  api,
  btnAdmin,
  fmtDateTime,
  patchOrder,
  tdClass,
  thClass,
} from "../_ui";

type Tab = "all" | "new" | "confirmed" | "out_for_delivery" | "delivered" | "failed";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "Awaiting confirmation" },
  { id: "confirmed", label: "Confirmed" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "failed", label: "Refused / failed" },
];

function tabMatch(o: Order, tab: Tab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "failed":
      return o.status === "refused" || o.status === "cancelled";
    default:
      return o.status === tab;
  }
}

function toCsv(orders: Order[]): string {
  const head = ["Order", "Date", "Customer", "Phone", "Email", "Address", "City", "Postcode", "Items", "Subtotal", "Delivery fee", "Total due", "Slot", "Payment method", "Status"];
  const rows = orders.map((o) => [
    o.number,
    o.createdAt,
    o.customer.name,
    o.customer.phone,
    o.customer.email ?? "",
    o.customer.address,
    o.customer.city,
    o.customer.postcode,
    o.items.map((i) => `${i.qty}x ${i.name}`).join("; "),
    o.subtotal.toFixed(2),
    o.deliveryFee.toFixed(2),
    o.total.toFixed(2),
    o.deliverySlot ?? "",
    o.paymentMethod,
    o.status,
  ]);
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError("");
    api<{ orders: Order[] }>("/api/orders")
      .then(({ orders }) => {
        setOrders(orders);
        setSelected(new Set());
      })
      .catch((e) => setError(e.message || "Could not load orders."));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: 0, new: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, failed: 0 };
    for (const o of orders ?? []) for (const t of TABS) if (tabMatch(o, t.id)) c[t.id]++;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s/g, "");
    return (orders ?? [])
      .filter((o) => tabMatch(o, tab))
      .filter(
        (o) =>
          !needle ||
          o.number.toLowerCase().includes(needle) ||
          o.customer.name.toLowerCase().replace(/\s/g, "").includes(needle) ||
          o.customer.phone.replace(/\s/g, "").includes(needle) ||
          o.customer.postcode.toLowerCase().replace(/\s/g, "").includes(needle)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, tab, q]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const markConfirmed = async () => {
    setBusy(true);
    try {
      await Promise.all(
        [...selected].map((id) => {
          const o = orders?.find((x) => x.id === id);
          if (o && o.status === "new") return patchOrder(id, "confirmed", "Marked confirmed from orders list");
          return Promise.resolve();
        })
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk update failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sofora-orders-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-[36px] leading-tight">Orders</h1>
          <p className="text-muted mt-1.5">Confirm, dispatch and collect cash on delivery.</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button className={btnAdmin} onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Order status">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[14px] font-semibold whitespace-nowrap min-h-[44px] cursor-pointer transition ${
              tab === t.id ? "bg-forest text-cream" : "bg-white text-ink border border-line hover:bg-cream"
            }`}
          >
            {t.label}
            <b className={tab === t.id ? "text-cream/80" : "text-muted"}>{counts[t.id]}</b>
          </button>
        ))}
      </div>

      <Card className="p-0! gap-0! overflow-hidden">
        <div className="flex flex-wrap gap-3 items-center p-[18px_20px] border-b border-line">
          <label className="flex items-center gap-2.5 bg-cream rounded-full px-4 min-h-[44px] flex-[1_1_260px]">
            <IconSearch size={18} className="text-muted shrink-0" />
            <input
              aria-label="Search orders"
              placeholder="Search order no., name, phone or postcode"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
            />
          </label>
          <Pill bg="#E3EBE4" fg="#1F3A32">
            Payment: COD
          </Pill>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3.5 flex-wrap px-5 py-3 bg-mint text-forest font-medium text-[14px]">
            <span>{selected.size} selected</span>
            <button className={btnAdmin} onClick={markConfirmed} disabled={busy}>
              {busy ? "Updating…" : "Mark confirmed"}
            </button>
            <button className={btnAdmin} onClick={() => window.print()}>
              Print delivery notes
            </button>
            <button className="underline text-[14px]" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        )}

        {!orders ? (
          <div className="p-5">
            <SkeletonTable rows={8} cols={7} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No orders here"
              hint={q ? "Try a different search." : "New orders will appear under “Awaiting confirmation”."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr>
                  <th className={thClass} style={{ width: 44 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all orders"
                      className="w-[18px] h-[18px] accent-[#1F3A32]"
                      checked={filtered.length > 0 && filtered.every((o) => selected.has(o.id))}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(filtered.map((o) => o.id)) : new Set())
                      }
                    />
                  </th>
                  <th className={thClass}>Order</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Sofa</th>
                  <th className={thClass}>Delivery</th>
                  <th className={thClass}>Due on delivery</th>
                  <th className={thClass}>Verified</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass} aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-[#FBF9F5]">
                    <td className={tdClass}>
                      <input
                        type="checkbox"
                        aria-label={`Select order ${o.number}`}
                        className="w-[18px] h-[18px] accent-[#1F3A32]"
                        checked={selected.has(o.id)}
                        onChange={() => toggle(o.id)}
                      />
                    </td>
                    <td className={tdClass}>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold underline">
                        #{o.number}
                      </Link>
                      <div className="text-[12px] text-muted mt-0.5">{fmtDateTime(o.createdAt)}</div>
                    </td>
                    <td className={tdClass}>
                      <div className="font-medium">{o.customer.name}</div>
                      <div className="text-[12px] text-muted">
                        {o.customer.city} · {o.customer.postcode}
                      </div>
                    </td>
                    <td className={tdClass}>
                      {o.items[0]?.name}
                      {o.items.length > 1 && <span className="text-muted"> +{o.items.length - 1}</span>}
                      <div className="text-[12px] text-muted">Qty {o.items.reduce((s, i) => s + i.qty, 0)}</div>
                    </td>
                    <td className={tdClass}>{o.deliverySlot || "—"}</td>
                    <td className={tdClass + " font-semibold"}>{gbp(o.total)}</td>
                    <td className={tdClass}>
                      {o.status === "new" ? (
                        <Pill bg="#F8EAC8" fg="#9A6A12">
                          Not verified
                        </Pill>
                      ) : (
                        <Pill bg="#DDEFE3" fg="#2F7D4F">
                          Phone verified
                        </Pill>
                      )}
                    </td>
                    <td className={tdClass}>
                      <StatusPill status={o.status as OrderStatus} />
                    </td>
                    <td className={tdClass}>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        aria-label={`Open order ${o.number}`}
                        className="grid place-items-center w-9 h-9 rounded-full hover:bg-cream"
                      >
                        <IconChevronDown size={18} className="-rotate-90" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center gap-3 flex-wrap px-5 py-4">
          <span className="text-muted text-[14px]">
            Showing {filtered.length} of {orders?.length ?? 0}
          </span>
        </div>
      </Card>
    </>
  );
}
