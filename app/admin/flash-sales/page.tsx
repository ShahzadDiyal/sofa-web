"use client";

/* Admin → Flash sales: promotional banners. Creation/editing lives on
   dedicated builder pages (see _form.tsx) with live preview. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash } from "@/components/Icons";
import { useToast } from "@/components/toast";
import type { FlashSale } from "@/lib/types";
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

function isLive(s: FlashSale): boolean {
  const now = Date.now();
  return (
    s.active &&
    (!s.startsAt || Date.parse(s.startsAt) <= now) &&
    (!s.endsAt || Date.parse(s.endsAt) >= now)
  );
}

const DISPLAY_LABEL: Record<string, string> = { inline: "Inline", popup: "Popup" };

export default function FlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[] | null>(null);
  const [error, setError] = useState("");
  const toast = useToast();
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<FlashSale | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    return api<{ sales: FlashSale[] }>("/api/flash-sales")
      .then(({ sales }) => setSales(sales))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load flash sales."));
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
    if (!needle) return sales ?? [];
    return (sales ?? []).filter((s) => s.title.toLowerCase().includes(needle));
  }, [sales, q]);
  const pg = usePagination(filtered);

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/api/flash-sales/${deleting.id}`, "DELETE");
      toast.success("Banner deleted", `“${deleting.title}” was removed.`);
      setDeleting(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed.";
      setError(msg);
      toast.error("Could not delete banner", msg);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-[30px]">Flash sales</h1>
          <p className="text-muted text-[14px] mt-1">Live banners appear on the storefront — inline or as popups, on the pages and sofas you target.</p>
        </div>
        <Link href="/uk/admin/flash-sales/new" className={btnAdminPrimary}>
          <IconPlus size={16} /> Add banner
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
            placeholder="Search banners…"
            aria-label="Search flash sales"
            className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
          />
        </label>
      </Card>

      {sales === null ? (
        <SkeletonTable rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No flash sales yet" hint="Create a banner — e.g. 'Winter Sale — up to 30% off'." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr>
                  <th className={thClass}>Banner</th>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>Display</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((s) => (
                  <tr key={s.id} className="border-t border-sand">
                    <td className={tdClass}>
                      <div
                        className="w-[96px] h-[54px] rounded-[10px] overflow-hidden border border-line grid place-items-center"
                        style={{ background: s.bgColor || "#2E4B3F" }}
                      >
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[11px] text-cream/80 px-2 text-center leading-tight">{s.template === "custom" ? "Custom HTML" : s.template || "Classic"}</span>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div className="font-semibold">{s.title}</div>
                      {s.subtitle && <div className="text-[13px] text-muted">{s.subtitle}</div>}
                    </td>
                    <td className={tdClass}>
                      <span className="text-[13px]">{DISPLAY_LABEL[s.displayMode || "inline"]}</span>
                    </td>
                    <td className={tdClass}>
                      <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${isLive(s) ? "bg-mint text-forest" : "bg-cream text-muted"}`}>
                        {isLive(s) ? "Live" : s.active ? "Scheduled" : "Paused"}
                      </span>
                    </td>
                    <td className={tdClass + " text-right"}>
                      <div className="inline-flex gap-2">
                        <Link href={`/uk/admin/flash-sales/${s.id}`} className={btnAdmin}>Edit</Link>
                        <button className={btnAdmin + " text-[#B3402F]"} aria-label={`Delete ${s.title}`} onClick={() => setDeleting(s)}>
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
            <h2 className="text-[24px]">Delete “{deleting.title}”?</h2>
            <p className="text-muted text-[14px]">This banner will no longer appear on the storefront. This cannot be undone.</p>
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
