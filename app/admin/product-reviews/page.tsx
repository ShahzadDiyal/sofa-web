"use client";

/* Admin → Product reviews: every customer review across all sofas.
   Filter by product, search text, delete. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconSearch, IconTrash } from "@/components/Icons";
import type { Product, ProductReview } from "@/lib/types";
import { Stars } from "@/components/storefront";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  tdClass,
  thClass,
} from "../_ui";

export default function ProductReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [deleting, setDeleting] = useState<ProductReview | null>(null);

  const load = () => {
    api<{ reviews: ProductReview[] }>("/api/product-reviews?limit=500")
      .then(({ reviews }) => setReviews(reviews))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load reviews."));
    api<{ products: Product[] }>("/api/products")
      .then(({ products }) => setProducts(products))
      .catch(() => {});
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    let list = reviews ?? [];
    if (productFilter) list = list.filter((r) => r.productId === productFilter);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((r) =>
        `${r.author} ${r.title ?? ""} ${r.body} ${r.productName}`.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [reviews, q, productFilter]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/api/product-reviews/${deleting.id}`, "DELETE");
      setDeleting(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const reviewedProductIds = useMemo(
    () => [...new Set((reviews ?? []).map((r) => r.productId))],
    [reviews]
  );
  const filterProducts = products.filter((p) => reviewedProductIds.includes(p.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[30px]">Product reviews</h1>
        <p className="text-muted text-[14px] mt-1">
          {reviews === null ? "Loading…" : `${reviews.length} reviews`} across the catalogue. Shown on product pages and <Link href="/reviews" className="underline">/reviews</Link>.
        </p>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <div className="flex gap-3 flex-wrap items-center">
          <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] w-full max-w-[320px]">
            <IconSearch size={17} className="text-muted flex-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reviews…"
              aria-label="Search reviews"
              className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
            />
          </label>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            aria-label="Filter by product"
            className={fieldClass + " max-w-[320px]"}
          >
            <option value="">All products</option>
            {filterProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {reviews === null ? (
        <SkeletonTable rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No reviews found" hint="Try a different search or product filter." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className={thClass}>Rating</th>
                  <th className={thClass}>Review</th>
                  <th className={thClass}>Product</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-sand align-top">
                    <td className={tdClass + " whitespace-nowrap"}>
                      <Stars rating={r.rating} size={14} />
                    </td>
                    <td className={tdClass + " max-w-[380px]"}>
                      {r.title && <div className="font-semibold">{r.title}</div>}
                      <p className="text-[14px] text-body leading-relaxed">{r.body}</p>
                      <p className="text-[13px] text-muted mt-1">
                        {r.author}{r.location ? ` · ${r.location}` : ""}
                        {r.verified ? " · Verified buyer" : ""}
                      </p>
                    </td>
                    <td className={tdClass}>
                      <Link href={`/sofas/${r.productSlug}`} className="underline underline-offset-2 text-[14px]">
                        {r.productName}
                      </Link>
                    </td>
                    <td className={tdClass + " whitespace-nowrap"}>{fmtDate(r.createdAt)}</td>
                    <td className={tdClass + " text-right"}>
                      <button
                        className={btnAdmin + " text-[#B3402F]"}
                        aria-label={`Delete review by ${r.author}`}
                        onClick={() => setDeleting(r)}
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-5">
            <h2 className="text-[24px]">Delete this review?</h2>
            <p className="text-muted text-[14px]">
              {deleting.rating}★ by {deleting.author} on “{deleting.productName}”. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setDeleting(null)}>Cancel</button>
              <button className={btnAdminPrimary + " bg-[#B3402F]!"} onClick={remove}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
