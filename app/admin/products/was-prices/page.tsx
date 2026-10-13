"use client";

/* Admin → Sofas → Bulk was-prices: set the competitive ("was") price for many
   products on one screen. The storefront card + product page show the
   strikethrough was-price and the "SAVE £X (Y% off)" pill only when a real
   was-price is saved here — nothing is invented. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { useToast } from "@/components/toast";
import SofaIllustration from "@/components/SofaIllustration";
import { gbp } from "@/lib/seo";
import type { Product } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdminPrimary,
  tdClass,
  thClass,
} from "../../_ui";

export default function BulkWasPricesPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api<{ products: Product[] }>("/api/products")
      .then(({ products }) => setProducts(products))
      .catch((e) => setError(e.message || "Could not load sofas."));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        (p.sku ?? "").toLowerCase().includes(needle)
    );
  }, [products, q]);

  const wasOf = (p: Product): string =>
    edits[p.id] !== undefined ? edits[p.id] : p.wasPrice != null ? String(p.wasPrice) : "";

  const changedIds = useMemo(
    () =>
      (products ?? [])
        .filter((p) => {
          const cur = p.wasPrice != null ? String(p.wasPrice) : "";
          return edits[p.id] !== undefined && edits[p.id].trim() !== cur;
        })
        .map((p) => p.id),
    [products, edits]
  );

  const discountPreview = (p: Product) => {
    const raw = wasOf(p).trim();
    const was = raw ? Number(raw) : NaN;
    if (!raw || Number.isNaN(was) || was <= p.price) return null;
    const save = was - p.price;
    const pct = Math.round((save / was) * 100);
    return `Save ${gbp(save)} (${pct}%)`;
  };

  const save = async () => {
    if (!products || changedIds.length === 0 || saving) return;
    setSaving(true);
    try {
      for (const id of changedIds) {
        const raw = (edits[id] ?? "").trim();
        await api(`/api/products/${id}`, "PATCH", {
          wasPrice: raw ? Number(raw) : null,
        });
      }
      setProducts((list) =>
        (list ?? []).map((p) =>
          changedIds.includes(p.id)
            ? { ...p, wasPrice: (edits[p.id] ?? "").trim() ? Number(edits[p.id].trim()) : undefined }
            : p
        )
      );
      setEdits({});
      toast.success(
        changedIds.length === 1
          ? "Was-price saved."
          : `Was-prices saved for ${changedIds.length} sofas.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save was-prices.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Bulk was-prices</h1>
          <p className="text-muted text-sm mt-1">
            Set each sofa&apos;s competitive (&ldquo;was&rdquo;) price. Cards and product pages show
            the strikethrough price and discount only where a real was-price is saved.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/uk/admin/products" className="text-sm font-semibold underline underline-offset-4">
            Back to sofas
          </Link>
          <button
            className={btnAdminPrimary}
            disabled={saving || changedIds.length === 0}
            onClick={save}
          >
            {saving
              ? "Saving…"
              : changedIds.length > 0
                ? `Save ${changedIds.length} change${changedIds.length === 1 ? "" : "s"}`
                : "Save changes"}
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sofas…"
          className="w-full rounded-full border border-line bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-forest"
          aria-label="Search sofas"
        />
      </div>

      {error && <ErrorBox message={error} />}
      {products === null && !error && <SkeletonTable rows={8} />}
      {products !== null && filtered.length === 0 && (
        <Card>
          <EmptyState title="No sofas found" hint="Try a different search." />
        </Card>
      )}
      {filtered.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left">
                <th className={thClass}>Sofa</th>
                <th className={thClass}>Price</th>
                <th className={thClass}>Was price (£)</th>
                <th className={thClass}>Storefront preview</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const preview = discountPreview(p);
                const raw = wasOf(p).trim();
                const was = raw ? Number(raw) : NaN;
                const tooLow = raw && !Number.isNaN(was) && was <= p.price;
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className={tdClass}>
                      <span className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-[10px] overflow-hidden bg-cream flex-none">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <SofaIllustration type={p.type} fabric={p.fabric} bg={p.bg} accent={p.accent} title={p.name} className="w-full h-full" />
                          )}
                        </span>
                        <span>
                          <span className="block font-medium leading-snug">{p.name}</span>
                          {p.sku && <span className="block text-xs text-muted">{p.sku}</span>}
                        </span>
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="font-semibold">{gbp(p.price)}</span>
                    </td>
                    <td className={tdClass}>
                      <input
                        value={wasOf(p)}
                        onChange={(e) =>
                          setEdits((m) => ({ ...m, [p.id]: e.target.value.replace(/[^0-9.]/g, "") }))
                        }
                        inputMode="decimal"
                        placeholder="e.g. 899"
                        aria-label={`Was price for ${p.name}`}
                        className="w-32 rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-forest"
                      />
                    </td>
                    <td className={tdClass}>
                      {preview ? (
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          <span className="text-muted line-through text-[13px]">{gbp(was)}</span>
                          <span className="rounded-full bg-[#B65A35] px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-white uppercase whitespace-nowrap">
                            {preview}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted">
                          {tooLow ? "Must be above the price to show." : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
