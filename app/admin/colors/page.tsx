"use client";

/* Admin → Colors: the managed colour library.
   A colour is a hex swatch, an uploaded swatch image, or both.
   Products pick colours from this library (see the sofa form). */

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash, IconX } from "@/components/Icons";
import type { Color, Product } from "@/lib/types";
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

export function ColorSwatch({ color, size = 40 }: { color: Pick<Color, "hex" | "imageUrl" | "name">; size?: number }) {
  const style = { width: size, height: size } as const;
  if (color.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={color.imageUrl}
        alt={color.name}
        style={style}
        className="rounded-full object-cover border border-line flex-none"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: color.hex || "#DDD3C4" }}
      className="rounded-full border border-line flex-none"
    />
  );
}

type FormState = { id?: string; name: string; hex: string; imageUrl: string };

const emptyForm: FormState = { name: "", hex: "#D8CBB4", imageUrl: "" };

export default function ColorsPage() {
  const [colors, setColors] = useState<Color[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Color | null>(null);

  const load = () => {
    api<{ colors: Color[] }>("/api/colors")
      .then(({ colors }) => setColors(colors))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load colours."));
    api<{ products: Product[] }>("/api/products")
      .then(({ products }) => setProducts(products))
      .catch(() => {});
  };
  useEffect(load, []);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      if (p.colourName) m.set(p.colourName, (m.get(p.colourName) ?? 0) + 1);
    }
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return colors ?? [];
    return (colors ?? []).filter((c) => c.name.toLowerCase().includes(needle));
  }, [colors, q]);

  const openNew = () => setForm({ ...emptyForm });
  const openEdit = (c: Color) => setForm({ id: c.id, name: c.name, hex: c.hex ?? "#D8CBB4", imageUrl: c.imageUrl ?? "" });

  const save = async () => {
    if (!form || !form.name.trim()) {
      setError("Give the colour a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        // "" clears the field on edit; undefined leaves a new colour's hex unset.
        hex: form.hex || null,
        imageUrl: form.imageUrl.trim() || null,
      };
      if (form.id) await api(`/api/colors/${form.id}`, "PATCH", payload);
      else await api("/api/colors", "POST", payload);
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
      await api(`/api/colors/${deleting.id}`, "DELETE");
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
          <h1 className="text-[30px]">Colours</h1>
          <p className="text-muted text-[14px] mt-1">
            The shared colour library — pick these when creating sofas. A colour can be a hex swatch, an uploaded image, or both.
          </p>
        </div>
        <button className={btnAdminPrimary} onClick={openNew}>
          <IconPlus size={16} /> Add colour
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] max-w-[380px]">
          <IconSearch size={17} className="text-muted flex-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search colours…"
            aria-label="Search colours"
            className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
          />
        </label>
      </Card>

      {colors === null ? (
        <SkeletonTable rows={6} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No colours found" hint="Add your first colour to start the library." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className={thClass}>Swatch</th>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Hex</th>
                  <th className={thClass}>Used by</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-sand">
                    <td className={tdClass}>
                      <ColorSwatch color={c} />
                    </td>
                    <td className={tdClass}>
                      <span className="font-semibold">{c.name}</span>
                    </td>
                    <td className={tdClass}>
                      <code className="text-[13px] bg-cream rounded-lg px-2 py-1">{c.hex ?? "—"}</code>
                    </td>
                    <td className={tdClass}>{usage.get(c.name) ?? 0} sofas</td>
                    <td className={tdClass + " text-right"}>
                      <div className="inline-flex gap-2">
                        <button className={btnAdmin} onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        <button
                          className={btnAdmin + " text-[#B3402F]"}
                          onClick={() => setDeleting(c)}
                          aria-label={`Delete ${c.name}`}
                        >
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
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[520px] max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-[26px]">{form.id ? "Edit colour" : "Add colour"}</h2>
              <button className="w-10 h-10 grid place-items-center rounded-full hover:bg-cream" onClick={() => setForm(null)} aria-label="Close">
                <IconX size={20} />
              </button>
            </div>

            <div className="flex gap-5 items-center">
              <ColorSwatch color={{ name: form.name || "Preview", hex: form.hex, imageUrl: form.imageUrl || undefined }} size={72} />
              <p className="text-sm text-muted">Live preview — this is how the swatch looks in filters and the sofa form.</p>
            </div>

            <div>
              <label className={labelClass} htmlFor="color-name">Name</label>
              <input
                id="color-name"
                className={fieldClass}
                value={form.name}
                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                placeholder="e.g. Oat"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="color-hex">Colour code (hex)</label>
              <div className="flex gap-3 items-center">
                <input
                  id="color-hex"
                  type="color"
                  value={form.hex}
                  onChange={(e) => setForm((f) => (f ? { ...f, hex: e.target.value } : f))}
                  className="w-12 h-12 rounded-full cursor-pointer bg-transparent border border-line p-0 flex-none"
                  aria-label="Pick a colour"
                />
                <input
                  className={fieldClass}
                  value={form.hex}
                  onChange={(e) => setForm((f) => (f ? { ...f, hex: e.target.value } : f))}
                  placeholder="#D8CBB4"
                  inputMode="text"
                  aria-label="Hex code"
                />
              </div>
            </div>

            <ImageUploadField
              label="Swatch image (optional)"
              hint="Upload a fabric swatch photo from your device — it replaces the hex circle wherever the colour appears."
              folder="colors"
              value={form.imageUrl}
              onChange={(url) => setForm((f) => (f ? { ...f, imageUrl: url } : f))}
            />

            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className={btnAdminPrimary} onClick={save} disabled={saving}>
                {saving ? "Saving…" : form.id ? "Save changes" : "Add colour"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-5">
            <h2 className="text-[24px]">Delete “{deleting.name}”?</h2>
            <p className="text-muted text-[14px]">
              {(usage.get(deleting.name) ?? 0) > 0
                ? `This colour is used by ${usage.get(deleting.name)} sofa(s). Those sofas keep their colour name, but it will no longer appear in the library.`
                : "It is not used by any sofa yet."}{" "}
              This cannot be undone.
            </p>
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
