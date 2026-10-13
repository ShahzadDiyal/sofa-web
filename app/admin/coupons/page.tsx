"use client";

/* Admin → Coupons: discount codes customers apply at checkout.
   Creation/editing lives on dedicated pages (see _form.tsx).
   Validation always happens server-side (see validateCoupon). */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash } from "@/components/Icons";
import { useToast } from "@/components/toast";
import type { Coupon } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdmin,
  btnAdminPrimary,
  tdClass,
  thClass,
  RefreshButton,
} from "../_ui";
import { AdminPagination, usePagination } from "../_ui";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState("");
  const toast = useToast();
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    return api<{ coupons: Coupon[] }>("/api/coupons")
      .then(({ coupons }) => setCoupons(coupons))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load coupons."));
  };
  useEffect(() => {
    void load();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return coupons ?? [];
    return (coupons ?? []).filter((c) => c.code.toLowerCase().includes(needle));
  }, [coupons, q]);
  const pg = usePagination(filtered);

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/api/coupons/${deleting.id}`, "DELETE");
      toast.success("Coupon deleted", `“${deleting.code}” was removed.`);
      setDeleting(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed.";
      setError(msg);
      toast.error("Could not delete coupon", msg);
    }
  };

  const describe = (c: Coupon) =>
    c.type === "percent" ? `${c.value}% off` : `£${c.value} off`;

  const scopeOf = (c: Coupon) => {
    const n = c.productIds?.length ?? 0;
    return n === 0 ? "All sofas" : `${n} sofa${n === 1 ? "" : "s"}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-[30px]">Coupons</h1>
          <p className="text-muted text-[14px] mt-1">Discount codes for checkout. Codes are validated server-side when the order is placed.</p>
        </div>
        <Link href="/uk/admin/coupons/new" className={btnAdminPrimary}>
          <IconPlus size={16} /> Add coupon
        </Link>
        <RefreshButton refreshing={refreshing} onRefresh={refresh} />
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] max-w-[340px]">
          <IconSearch size={17} className="text-muted flex-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search codes…"
            aria-label="Search coupons"
            className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
          />
        </label>
      </Card>

      {coupons === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No coupons yet" hint="Create your first discount code — e.g. WELCOME10 for 10% off." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th className={thClass}>Code</th>
                  <th className={thClass}>Discount</th>
                  <th className={thClass}>Applies to</th>
                  <th className={thClass}>Uses</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((c) => (
                  <tr key={c.id} className="border-t border-sand">
                    <td className={tdClass}>
                      <code className="font-semibold bg-cream rounded-lg px-2.5 py-1 text-[14px]">{c.code}</code>
                    </td>
                    <td className={tdClass}>
                      {describe(c)}
                      {c.minSubtotal ? <span className="text-muted text-[13px]"> · min £{c.minSubtotal}</span> : null}
                    </td>
                    <td className={tdClass}>
                      <span className="text-[13px]">{scopeOf(c)}</span>
                    </td>
                    <td className={tdClass}>
                      {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td className={tdClass}>
                      <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${c.active ? "bg-mint text-forest" : "bg-cream text-muted"}`}>
                        {c.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className={tdClass + " text-right"}>
                      <div className="inline-flex gap-2">
                        <Link href={`/uk/admin/coupons/${c.id}`} className={btnAdmin}>Edit</Link>
                        <button className={btnAdmin + " text-[#B3402F]"} aria-label={`Delete ${c.code}`} onClick={() => setDeleting(c)}>
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5">
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

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-5">
            <h2 className="text-[24px]">Delete “{deleting.code}”?</h2>
            <p className="text-muted text-[14px]">Shoppers will no longer be able to use this code. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className={btnAdminPrimary + " bg-[#B3402F]!"} onClick={remove}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
