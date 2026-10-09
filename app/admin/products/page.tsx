"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash } from "@/components/Icons";
import SofaIllustration from "@/components/SofaIllustration";
import { gbp } from "@/lib/seo";
import type { Category, Product } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  Pill,
  SkeletonTable,
  Toggle,
  api,
  btnAdmin,
  btnAdminPrimary,
  tdClass,
  thClass,
} from "../_ui";

type Tab = "all" | "live" | "draft";

const CATEGORY_LABELS: Record<string, string> = {
  "3-seater-sofas": "3 seater",
  "corner-sofas": "Corner",
  "3-plus-2-sets": "3+2 set",
  armchairs: "Armchair",
  recliners: "Recliner",
  "sofa-beds": "Sofa bed",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setError("");
    Promise.all([
      api<{ products: Product[] }>("/api/products"),
      api<{ categories: Category[] }>("/api/categories").catch(() => ({ categories: [] as Category[] })),
    ])
      .then(([{ products }, { categories }]) => {
        setProducts(products);
        setCategories(categories);
      })
      .catch((e) => setError(e.message || "Could not load sofas."));
  };
  useEffect(load, []);

  const catName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? CATEGORY_LABELS[slug] ?? slug;

  const counts = useMemo(() => {
    const list = products ?? [];
    return {
      all: list.length,
      live: list.filter((p) => p.inStock).length,
      draft: list.filter((p) => !p.inStock).length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (products ?? [])
      .filter((p) => (tab === "all" ? true : tab === "live" ? p.inStock : !p.inStock))
      .filter(
        (p) =>
          !needle ||
          p.name.toLowerCase().includes(needle) ||
          (p.sku ?? "").toLowerCase().includes(needle)
      );
  }, [products, tab, q]);

  const setLive = async (p: Product, live: boolean) => {
    setBusyId(p.id);
    try {
      const { product } = await api<{ product: Product }>(`/api/products/${p.id}`, "PATCH", { inStock: live });
      setProducts((all) => (all ?? []).map((x) => (x.id === p.id ? product : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete “${p.name}” from the catalogue? This cannot be undone.`)) return;
    setBusyId(p.id);
    try {
      await api(`/api/products/${p.id}`, "DELETE");
      setProducts((all) => (all ?? []).filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "draft", label: "Draft" },
  ];

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-[36px] leading-tight">Sofas</h1>
          <p className="text-muted mt-1.5">Your catalogue. Sofas only.</p>
        </div>
        <Link href="/admin/products/new" className={btnAdminPrimary}>
          <IconPlus size={18} /> Add sofa
        </Link>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="flex gap-1.5" role="tablist" aria-label="Product visibility">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[14px] font-semibold min-h-[44px] cursor-pointer transition ${
              tab === t.id ? "bg-forest text-cream" : "bg-white text-ink border border-line hover:bg-cream"
            }`}
          >
            {t.label}
            <b className={tab === t.id ? "text-cream/80" : "text-muted"}>{counts[t.id]}</b>
          </button>
        ))}
      </div>

      <Card className="p-0! gap-0! overflow-hidden">
        <div className="p-[18px_20px] border-b border-line">
          <label className="flex items-center gap-2.5 bg-cream rounded-full px-4 min-h-[44px] max-w-[420px]">
            <IconSearch size={18} className="text-muted shrink-0" />
            <input
              aria-label="Search sofas"
              placeholder="Search by name or SKU"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
            />
          </label>
        </div>

        {!products ? (
          <div className="p-5">
            <SkeletonTable rows={7} cols={6} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No sofas here"
              hint={q ? "Try a different search." : "Add your first sofa with the button above."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr>
                  <th className={thClass}>Sofa</th>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>Fabric colours</th>
                  <th className={thClass}>Price</th>
                  <th className={thClass}>Stock</th>
                  <th className={thClass}>Live</th>
                  <th className={thClass} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FBF9F5]">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3.5">
                        <div className="w-[56px] rounded-[12px] overflow-hidden shrink-0">
                          <SofaIllustration
                            type={p.type}
                            fabric={p.fabric}
                            bg={p.bg}
                            accent={p.accent}
                            title={p.name}
                            className="w-full aspect-square"
                          />
                        </div>
                        <div>
                          <Link href={`/admin/products/${p.id}`} className="font-semibold underline">
                            {p.name}
                          </Link>
                          <div className="text-[12px] text-muted mt-0.5">SKU {p.sku || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}>{catName(p.category)}</td>
                    <td className={tdClass}>
                      <div className="flex gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-line block"
                          style={{ background: p.fabric }}
                          title={p.fabricName || p.fabric}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-line block"
                          style={{ background: p.accent }}
                          title="Accent"
                        />
                      </div>
                    </td>
                    <td className={tdClass + " font-semibold whitespace-nowrap"}>
                      {gbp(p.price)}
                      {p.wasPrice ? <span className="block text-[12px] text-muted font-normal line-through">{gbp(p.wasPrice)}</span> : null}
                    </td>
                    <td className={tdClass}>
                      {p.inStock ? (
                        <Pill bg="#DDEFE3" fg="#2F7D4F">
                          In stock
                        </Pill>
                      ) : (
                        <Pill bg="#F6DDD8" fg="#B3402F">
                          Out of stock
                        </Pill>
                      )}
                    </td>
                    <td className={tdClass}>
                      <Toggle
                        on={p.inStock}
                        onChange={(v) => setLive(p, v)}
                        label={`Live on storefront: ${p.name}`}
                      />
                    </td>
                    <td className={tdClass}>
                      <div className="flex gap-1">
                        <Link
                          href={`/admin/products/${p.id}`}
                          aria-label={`Edit ${p.name}`}
                          className="grid place-items-center w-9 h-9 rounded-full hover:bg-cream underline text-[14px] font-semibold"
                        >
                          Edit
                        </Link>
                        <button
                          aria-label={`Delete ${p.name}`}
                          onClick={() => remove(p)}
                          disabled={busyId === p.id}
                          className="grid place-items-center w-9 h-9 rounded-full hover:bg-[#F6DDD8] text-[#B3402F] disabled:opacity-50 cursor-pointer"
                        >
                          <IconTrash size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center gap-3 flex-wrap px-5 py-4">
          <span className="text-muted text-[14px]">
            Showing {filtered.length} of {products?.length ?? 0}
          </span>
          <Link href="/sofas" target="_blank" rel="noreferrer" className={btnAdmin}>
            View storefront
          </Link>
        </div>
      </Card>
    </>
  );
}
