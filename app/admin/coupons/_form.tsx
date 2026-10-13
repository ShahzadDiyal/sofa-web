"use client";

/* Shared create/edit coupon form. The "Applies to" section scopes the coupon
   to specific sofas — an empty selection means the code works on everything. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { useToast } from "@/components/toast";
import type { Coupon, Product } from "@/lib/types";
import {
  Card,
  ErrorBox,
  Toggle,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  labelClass,
} from "../_ui";

const toInputDate = (iso?: string) => (iso ? iso.slice(0, 16) : "");
const fromInputDate = (v: string) => (v ? new Date(v).toISOString() : "");

export default function CouponForm({ coupon }: { coupon?: Coupon }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<"percent" | "fixed">(coupon?.type ?? "percent");
  const [value, setValue] = useState(coupon ? String(coupon.value) : "10");
  const [minSubtotal, setMinSubtotal] = useState(coupon?.minSubtotal ? String(coupon.minSubtotal) : "");
  const [maxUses, setMaxUses] = useState(coupon?.maxUses ? String(coupon.maxUses) : "");
  const [startsAt, setStartsAt] = useState(toInputDate(coupon?.startsAt));
  const [endsAt, setEndsAt] = useState(toInputDate(coupon?.endsAt));
  const [active, setActive] = useState(coupon?.active ?? true);
  const [scoped, setScoped] = useState((coupon?.productIds?.length ?? 0) > 0);
  const [productIds, setProductIds] = useState<string[]>(coupon?.productIds ?? []);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [pq, setPq] = useState("");

  useEffect(() => {
    api<{ products: Product[] }>("/api/products")
      .then(({ products }) => setProducts(products))
      .catch(() => setProducts([]));
  }, []);

  const visibleProducts = useMemo(() => {
    const needle = pq.trim().toLowerCase();
    const list = products ?? [];
    if (!needle) return list;
    return list.filter((p) => p.name.toLowerCase().includes(needle) || p.slug.toLowerCase().includes(needle));
  }, [products, pq]);

  const toggleProduct = (id: string) =>
    setProductIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const save = async () => {
    if (!code.trim()) {
      setError("Give the coupon a code.");
      return;
    }
    const v = Number(value);
    if (!v || v <= 0 || (type === "percent" && v > 90)) {
      setError("Enter a valid value (percent: 1–90).");
      return;
    }
    if (scoped && productIds.length === 0) {
      setError("Pick at least one sofa, or switch back to “All sofas”.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        code: code.trim(),
        type,
        value: v,
        minSubtotal: minSubtotal === "" ? "" : Number(minSubtotal),
        maxUses: maxUses === "" ? "" : Number(maxUses),
        productIds: scoped ? productIds : [],
        startsAt: fromInputDate(startsAt),
        endsAt: fromInputDate(endsAt),
        active,
      };
      if (coupon) await api(`/api/coupons/${coupon.id}`, "PATCH", payload);
      else await api("/api/coupons", "POST", payload);
      toast.success(coupon ? "Coupon updated" : "Coupon created", `“${code.trim().toUpperCase()}” was saved.`);
      router.push("/uk/admin/coupons");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      setError(msg);
      toast.error("Could not save coupon", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[860px]">
      <div>
        <h1 className="text-[30px]">{coupon ? `Edit ${coupon.code}` : "New coupon"}</h1>
        <p className="text-muted text-[14px] mt-1">
          Discount codes shoppers apply at checkout. The discount is always re-validated server-side when the order is placed.
        </p>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass} htmlFor="cpn-code">Code</label>
            <input
              id="cpn-code"
              className={fieldClass + " uppercase"}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="cpn-type">Discount type</label>
            <select id="cpn-type" className={fieldClass} value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
              <option value="percent">Percent %</option>
              <option value="fixed">Fixed £</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="cpn-value">{type === "percent" ? "Percent (1–90)" : "Amount (£)"}</label>
            <input id="cpn-value" className={fieldClass} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="10" />
          </div>
          <div>
            <label className={labelClass} htmlFor="cpn-min">Minimum order (£, optional)</label>
            <input id="cpn-min" className={fieldClass} inputMode="decimal" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} placeholder="No minimum" />
          </div>
          <div>
            <label className={labelClass} htmlFor="cpn-max">Max uses (optional)</label>
            <input id="cpn-max" className={fieldClass} inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
          </div>
          <div className="flex items-end pb-3">
            <Toggle label={active ? "Active" : "Paused"} on={active} onChange={setActive} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cpn-start">Starts (optional)</label>
            <input id="cpn-start" type="datetime-local" className={fieldClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cpn-end">Ends (optional)</label>
            <input id="cpn-end" type="datetime-local" className={fieldClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-[20px] mb-1">Applies to</h2>
        <p className="text-muted text-[14px] mb-4">
          Choose which sofas this code discounts. At checkout the coupon field only appears when the basket holds a sofa the code applies to.
        </p>
        <div className="flex gap-3 flex-wrap mb-4">
          <button
            type="button"
            onClick={() => setScoped(false)}
            className={`px-5 min-h-[44px] rounded-full border-[1.5px] text-[14px] font-semibold transition ${!scoped ? "border-forest bg-forest text-cream" : "border-line bg-white"}`}
          >
            All sofas
          </button>
          <button
            type="button"
            onClick={() => setScoped(true)}
            className={`px-5 min-h-[44px] rounded-full border-[1.5px] text-[14px] font-semibold transition ${scoped ? "border-forest bg-forest text-cream" : "border-line bg-white"}`}
          >
            Selected sofas{productIds.length > 0 ? ` (${productIds.length})` : ""}
          </button>
        </div>
        {scoped && (
          <div>
            <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] max-w-[380px] mb-3">
              <IconSearch size={17} className="text-muted flex-none" />
              <input
                value={pq}
                onChange={(e) => setPq(e.target.value)}
                placeholder="Search sofas…"
                aria-label="Search sofas"
                className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
              />
            </label>
            <div className="border border-line rounded-[16px] max-h-[320px] overflow-y-auto divide-y divide-sand">
              {products === null ? (
                <p className="p-4 text-muted text-[14px]">Loading sofas…</p>
              ) : visibleProducts.length === 0 ? (
                <p className="p-4 text-muted text-[14px]">No sofas match.</p>
              ) : (
                visibleProducts.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-cream/60">
                    <input
                      type="checkbox"
                      checked={productIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="w-5 h-5 accent-[#2E4B3F]"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-medium truncate">{p.name}</span>
                      <span className="block text-[12px] text-muted">£{p.price}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/uk/admin/coupons" className={btnAdmin}>
          Cancel
        </Link>
        <button className={btnAdminPrimary} onClick={save} disabled={saving}>
          {saving ? "Saving…" : coupon ? "Save changes" : "Create coupon"}
        </button>
      </div>
    </div>
  );
}
