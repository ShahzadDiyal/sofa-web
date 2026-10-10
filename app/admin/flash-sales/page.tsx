"use client";

/* Admin → Flash sales: promotional banners. The most recent live one shows
   as a prominent banner on the homepage. */

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash, IconX } from "@/components/Icons";
import type { FlashSale } from "@/lib/types";
import ImageUploadField from "../_image-upload";
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
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

const emptyForm: FormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "/sofas?sale=1",
  linkLabel: "Shop the sale",
  startsAt: "",
  endsAt: "",
  active: true,
};

const toInputDate = (iso?: string) => (iso ? iso.slice(0, 16) : "");
const fromInputDate = (v: string) => (v ? new Date(v).toISOString() : "");

function isLive(s: FlashSale): boolean {
  const now = Date.now();
  return (
    s.active &&
    (!s.startsAt || Date.parse(s.startsAt) <= now) &&
    (!s.endsAt || Date.parse(s.endsAt) >= now)
  );
}

export default function FlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<FlashSale | null>(null);

  const load = () => {
    api<{ sales: FlashSale[] }>("/api/flash-sales")
      .then(({ sales }) => setSales(sales))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load flash sales."));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sales ?? [];
    return (sales ?? []).filter((s) => `${s.title} ${s.subtitle ?? ""}`.toLowerCase().includes(needle));
  }, [sales, q]);

  const openNew = () => setForm({ ...emptyForm });
  const openEdit = (s: FlashSale) =>
    setForm({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle ?? "",
      imageUrl: s.imageUrl ?? "",
      linkUrl: s.linkUrl ?? "",
      linkLabel: s.linkLabel ?? "",
      startsAt: toInputDate(s.startsAt),
      endsAt: toInputDate(s.endsAt),
      active: s.active,
    });

  const save = async () => {
    if (!form || !form.title.trim()) {
      setError("Give the sale a title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim(),
        linkLabel: form.linkLabel.trim(),
        startsAt: fromInputDate(form.startsAt),
        endsAt: fromInputDate(form.endsAt),
        active: form.active,
      };
      if (form.id) await api(`/api/flash-sales/${form.id}`, "PATCH", payload);
      else await api("/api/flash-sales", "POST", payload);
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
      await api(`/api/flash-sales/${deleting.id}`, "DELETE");
      setDeleting(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-[30px]">Flash sales</h1>
          <p className="text-muted text-[14px] mt-1">The most recent live banner appears on the homepage.</p>
        </div>
        <button className={btnAdminPrimary} onClick={openNew}>
          <IconPlus size={16} /> Add banner
        </button>
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
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className={thClass}>Banner</th>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-sand">
                    <td className={tdClass}>
                      <div className="w-[96px] h-[54px] rounded-[10px] overflow-hidden bg-cream border border-line">
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full grid place-items-center text-[11px] text-muted">No image</span>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div className="font-semibold">{s.title}</div>
                      {s.subtitle && <div className="text-[13px] text-muted">{s.subtitle}</div>}
                    </td>
                    <td className={tdClass}>
                      <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${isLive(s) ? "bg-mint text-forest" : "bg-cream text-muted"}`}>
                        {isLive(s) ? "Live" : s.active ? "Scheduled" : "Paused"}
                      </span>
                    </td>
                    <td className={tdClass + " text-right"}>
                      <div className="inline-flex gap-2">
                        <button className={btnAdmin} onClick={() => openEdit(s)}>Edit</button>
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
        </Card>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setForm(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-[26px]">{form.id ? "Edit banner" : "Add banner"}</h2>
              <button className="w-10 h-10 grid place-items-center rounded-full hover:bg-cream" onClick={() => setForm(null)} aria-label="Close">
                <IconX size={20} />
              </button>
            </div>

            <div>
              <label className={labelClass} htmlFor="fls-title">Title</label>
              <input
                id="fls-title"
                className={fieldClass}
                value={form.title}
                onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
                placeholder="e.g. Winter Flash Sale — up to 30% off"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="fls-sub">Subtitle <span className="font-normal text-muted">(optional)</span></label>
              <input
                id="fls-sub"
                className={fieldClass}
                value={form.subtitle}
                onChange={(e) => setForm((f) => (f ? { ...f, subtitle: e.target.value } : f))}
                placeholder="e.g. Ends Sunday — pay on delivery as always"
              />
            </div>

            <ImageUploadField
              label="Banner image (optional)"
              hint="Upload from your device — shown full-width on the homepage."
              folder="banners"
              value={form.imageUrl}
              onChange={(url) => setForm((f) => (f ? { ...f, imageUrl: url } : f))}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="fls-link">Link URL <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="fls-link"
                  className={fieldClass}
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => (f ? { ...f, linkUrl: e.target.value } : f))}
                  placeholder="/sofas?sale=1"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="fls-label">Button text <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="fls-label"
                  className={fieldClass}
                  value={form.linkLabel}
                  onChange={(e) => setForm((f) => (f ? { ...f, linkLabel: e.target.value } : f))}
                  placeholder="Shop the sale"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="fls-start">Starts <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="fls-start"
                  type="datetime-local"
                  className={fieldClass}
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => (f ? { ...f, startsAt: e.target.value } : f))}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="fls-end">Ends <span className="font-normal text-muted">(optional)</span></label>
                <input
                  id="fls-end"
                  type="datetime-local"
                  className={fieldClass}
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => (f ? { ...f, endsAt: e.target.value } : f))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => (f ? { ...f, active: e.target.checked } : f))}
                className="w-5 h-5 accent-[#1F3A32]"
              />
              <span className="font-medium text-[15px]">Active</span>
            </label>

            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setForm(null)}>Cancel</button>
              <button className={btnAdminPrimary} onClick={save} disabled={saving}>
                {saving ? "Saving…" : form.id ? "Save changes" : "Add banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-5">
            <h2 className="text-[24px]">Delete “{deleting.title}”?</h2>
            <p className="text-muted text-[14px]">The banner will be removed from the homepage immediately. This cannot be undone.</p>
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
