"use client";

/* Admin → Coupons: discount codes customers apply at checkout.
   Validation always happens server-side (see validateCoupon). */

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash, IconX } from "@/components/Icons";
import type { Coupon } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  labelClass,
  tdClass,
  thClass,
} from "../_ui";

type FormState = {
  id?: string;
  code: string;
  type: "percent" | "fixed";
  value: string;
  minSubtotal: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  type: "percent",
  value: "10",
  minSubtotal: "",
  maxUses: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

const toInputDate = (iso?: string) => (iso ? iso.slice(0, 16) : "");
const fromInputDate = (v: string) => (v ? new Date(v).toISOString() : "");

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const load = () => {
    api<{ coupons: Coupon[] }>("/api/coupons")
      .then(({ coupons }) => setCoupons(coupons))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load coupons."));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return coupons ?? [];
    return (coupons ?? []).filter((c) => c.code.toLowerCase().includes(needle));
  }, [coupons, q]);

  const openNew = () => setForm({ ...emptyForm });
  const openEdit = (c: Coupon) =>
    setForm({
      id: c.id,
      code: c.code,
      type: c.type,
      value: String(c.value),
      minSubtotal: c.minSubtotal ? String(c.minSubtotal) : "",
      maxUses: c.maxUses ? String(c.maxUses) : "",
      startsAt: toInputDate(c.startsAt),
      endsAt: toInputDate(c.endsAt),
      active: c.active,
    });

  const save = async () => {
    if (!form || !form.code.trim()) {
      setError("Enter a coupon code.");
      return;
    }
    const value = Number(form.value);
    if (!value || value <= 0 || (form.type === "percent" && value > 90)) {
      setError("Enter a valid value (percent: 1–90).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value,
        minSubtotal: form.minSubtotal.trim(),
        maxUses: form.maxUses.trim(),
        startsAt: fromInputDate(form.startsAt),
        endsAt: fromInputDate(form.endsAt),
        active: form.active,
      };
      if (form.id) await api(`/api/coupons/${form.id}`, "PATCH", payload);
      else await api("/api/coupons", "POST", payload);
      setForm(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/api/coupons/${deleting.id}`, "DELETE");
      setDeleting(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const describe = (c: Coupon) =>
    c.type === "percent" ? `${c.value}% off` : `£${c.value} off`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-[30px]">Coupons</h1>
          <p className="text-muted text-[14px] mt-1">Discount codes for checkout. Codes are validated server-side when the order is placed.</p>
        </div>
        <button className={btnAdminPrimary} onClick={openNew}>
          <IconPlus size={16} /> Add coupon
        </button>
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
            <table className="w-full min-w-[680px]">
              <thead>
                <tr>
                  <th className={thClass}>Code</th>
                  <th className={thClass}>Discount</th>
                  <th className={thClass}>Uses</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-sand">
                    <td className={tdClass}>
                      <code className="font-semibold bg-cream rounded-lg px-2.5 py-1 text-[14px]">{c.code}</code>
                    </td>
                    <td className={tdClass}>
                      {describe(c)}
                      {c.minSubtotal ? <span className="text-muted text-[13px]"> · min £{c.minSubtotal}</span> : null}
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
                        <button className={btnAdmin} onClick={() => openEdit(c)}>Edit</button>
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
        </Card>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setForm(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[560px] max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-[26px]">{form.id ? "Edit coupon" : "Add coupon"}</h2>
              <button className="w-10 h-10 grid place-items-center rounded-full hover:bg-cream" onClick={() => setForm(null)} aria-label="Close">
                <IconX size={20} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="cpn-code">Code</label>
                <input
                  id="cpn-code"
                  className={fieldClass + " uppercase"}
                  value={form.code}
                  onChange={(e) => setForm((f) => (f ? { ...f, code: e.target.value.toUpperCase() } : f))}
                  placeholder="WELCOME10"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => (f ? { ...f, active: e.target.checked } : f))}
                    className="w-5 h-5 accent-[#1F3A32]"
                  />
                  <span className="font-medium text-[15px]">Active</span>
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="cpn-type">Discount type</label>
                <select
                  id="cpn-type"
                  className={fieldClass}
                  value={form.type}
                  onChange={(e) => setForm((f) => (f ? { ...f, type: e.target.value as "percent" | "fixed" } : f))}
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed amount (£)</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cpn-value">Value {form.type === "percent" ? "(1–90%)" : "(£)"}</label>
                <input
                  id="cpn-value"
                  className={fieldClass}
                  inputMode="decimal"
                  value={form.value}
                  onChange={(e) => setForm((f) => (f ? { ...f, value: e.target.value } : f))}
                  placeholder={form.type === "percent" ? "10" : "50"}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="cpn-min">Min. order (£) <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="cpn-min"
                  className={fieldClass}
                  inputMode="decimal"
                  value={form.minSubtotal}
                  onChange={(e) => setForm((f) => (f ? { ...f, minSubtotal: e.target.value } : f))}
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cpn-max">Max uses <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="cpn-max"
                  className={fieldClass}
                  inputMode="numeric"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => (f ? { ...f, maxUses: e.target.value } : f))}
                  placeholder="e.g. 100"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="cpn-start">Starts <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="cpn-start"
                  type="datetime-local"
                  className={fieldClass}
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => (f ? { ...f, startsAt: e.target.value } : f))}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cpn-end">Ends <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="cpn-end"
                  type="datetime-local"
                  className={fieldClass}
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => (f ? { ...f, endsAt: e.target.value } : f))}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setForm(null)}>Cancel</button>
              <button className={btnAdminPrimary} onClick={save} disabled={saving}>
                {saving ? "Saving…" : form.id ? "Save changes" : "Add coupon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-5">
            <h2 className="text-[24px]">Delete “{deleting.code}”?</h2>
            <p className="text-muted text-[14px]">Used {deleting.usedCount} time(s). Customers with the code will no longer get the discount. This cannot be undone.</p>
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
