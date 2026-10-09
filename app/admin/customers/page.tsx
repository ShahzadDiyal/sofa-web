"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { gbp } from "@/lib/seo";
import type { Order } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  initials,
  tdClass,
  thClass,
} from "../_ui";

interface Customer {
  name: string;
  phone: string;
  email?: string;
  city: string;
  orders: Order[];
}

export default function CustomersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = () => {
    setError("");
    api<{ orders: Order[] }>("/api/orders")
      .then(({ orders }) => setOrders(orders))
      .catch((e) => setError(e.message || "Could not load customers."));
  };
  useEffect(load, []);

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const o of orders ?? []) {
      const key = o.customer.phone.replace(/\D/g, "") || o.customer.email || o.customer.name;
      const existing = map.get(key);
      if (existing) existing.orders.push(o);
      else
        map.set(key, {
          name: o.customer.name,
          phone: o.customer.phone,
          email: o.customer.email,
          city: o.customer.city,
          orders: [o],
        });
    }
    return [...map.values()].sort(
      (a, b) => b.orders.reduce((s, o) => s + o.total, 0) - a.orders.reduce((s, o) => s + o.total, 0)
    );
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s/g, "");
    if (!needle) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().replace(/\s/g, "").includes(needle) ||
        c.phone.replace(/\s/g, "").includes(needle) ||
        (c.email ?? "").toLowerCase().includes(needle)
    );
  }, [customers, q]);

  return (
    <>
      <div>
        <h1 className="text-[36px] leading-tight">Customers</h1>
        <p className="text-muted mt-1.5">Everyone who has ordered — derived from order history.</p>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      <Card className="!p-0 !gap-0 overflow-hidden">
        <div className="p-[18px_20px] border-b border-line">
          <label className="flex items-center gap-2.5 bg-cream rounded-full px-4 min-h-[44px] max-w-[420px]">
            <IconSearch size={18} className="text-muted shrink-0" />
            <input
              aria-label="Search customers"
              placeholder="Search name, phone or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
            />
          </label>
        </div>

        {!orders ? (
          <div className="p-5">
            <SkeletonTable rows={6} cols={5} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No customers yet"
              hint={q ? "Try a different search." : "Customers appear here after their first order."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Phone</th>
                  <th className={thClass}>Town</th>
                  <th className={thClass}>Orders</th>
                  <th className={thClass}>Lifetime COD total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const latest = [...c.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                  return (
                    <tr key={c.phone + c.name} className="hover:bg-[#FBF9F5]">
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-mint text-forest grid place-items-center font-semibold text-[13px] shrink-0">
                            {initials(c.name)}
                          </span>
                          <div>
                            <div className="font-semibold">{c.name}</div>
                            {c.email && <div className="text-[12px] text-muted">{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="underline">
                          {c.phone}
                        </a>
                      </td>
                      <td className={tdClass}>{c.city}</td>
                      <td className={tdClass}>
                        <Link href={`/admin/orders/${latest.id}`} className="underline font-medium">
                          {c.orders.length} order{c.orders.length > 1 ? "s" : ""}
                        </Link>
                        <div className="text-[12px] text-muted">latest #{latest.number}</div>
                      </td>
                      <td className={tdClass + " font-semibold"}>
                        {gbp(c.orders.reduce((s, o) => s + o.total, 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-4">
          <span className="text-muted text-[14px]">
            {filtered.length} customer{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </Card>
    </>
  );
}
