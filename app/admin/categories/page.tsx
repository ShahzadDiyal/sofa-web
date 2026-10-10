"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTag, IconTrash, IconX } from "@/components/Icons";
import SofaIllustration from "@/components/SofaIllustration";
import type { Category, Product, SofaType } from "@/lib/types";
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

const TYPES: { value: SofaType; label: string }[] = [
  { value: "three", label: "Standard sofa" },
  { value: "corner", label: "Corner sofa" },
  { value: "chair", label: "Armchair" },
  { value: "sofa-bed", label: "Sofa bed" },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type FormState = {
  id?: string;
  name: string;
  slug: string;
  blurb: string;
  menu: string;
  type: SofaType;
  fabric: string;
  bg: string;
  imageUrl: string;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  blurb: "",
  menu: "",
  type: "three",
  fabric: "#D8CBB4",
  bg: "#EFE8DC",
  imageUrl: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = () => {
    setError("");
    Promise.all([
      api<{ categories: Category[] }>("/api/categories"),
      api<{ products: Product[] }>("/api/products").catch(() => ({ products: [] as Product[] })),
    ])
      .then(([{ categories }, { products }]) => {
        setCategories(categories);
        setProducts(products);
      })
      .catch((e) => setError(e.message || "Could not load categories."));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = categories ?? [];
    if (!needle) return list;
    return list.filter((c) => `${c.name} ${c.slug} ${c.blurb ?? ""}`.toLowerCase().includes(needle));
  }, [categories, q]);

  const openNew = () => {
    setForm({ ...emptyForm });
    setSlugTouched(false);
  };
  const openEdit = (c: Category) => {
    setForm({ id: c.id, name: c.name, slug: c.slug, blurb: c.blurb ?? "", menu: c.menu ?? "", type: c.type, fabric: c.fabric, bg: c.bg, imageUrl: c.imageUrl ?? "" });
    setSlugTouched(true);
  };

  const save = async () => {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug || slugify(form.name), blurb: form.blurb || undefined, menu: form.menu.trim() || undefined, imageUrl: form.imageUrl.trim() || (form.id ? null : undefined) };
      if (form.id) {
        await api(`/api/categories/${form.id}`, "PUT", payload);
      } else {
        await api("/api/categories", "POST", payload);
      }
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
      await api(`/api/categories/${deleting.id}`, "DELETE");
      setDeleting(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-[36px] leading-tight">Categories</h1>
          <p className="text-muted mt-1.5">
            {categories ? `${categories.length} categories` : "Loading…"} — these power “Shop by style” and the collection filters on the website.
          </p>
        </div>
        <button className={btnAdminPrimary} onClick={openNew}>
          <IconPlus size={18} /> Add category
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      <Card className="p-0! gap-0! overflow-hidden">
        <div className="p-4 border-b border-sand">
          <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] max-w-[380px]">
            <IconSearch size={18} className="text-muted shrink-0" />
            <input
              aria-label="Search categories"
              placeholder="Search categories"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
            />
          </label>
        </div>
        {!categories ? (
          <div className="p-4"><SkeletonTable rows={8} cols={4} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={q ? "No categories match" : "No categories yet"}
            hint={q ? "Try a different search." : "Add your first category to organise the catalogue."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Slug</th>
                  <th className={thClass}>Products</th>
                  <th className={thClass}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3.5">
                        <div className="w-[72px] rounded-[12px] overflow-hidden flex-none">
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.imageUrl} alt={c.name} className="w-full aspect-square object-cover" />
                          ) : (
                            <SofaIllustration type={c.type} fabric={c.fabric} bg={c.bg} className="w-full aspect-square" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          {c.blurb && <div className="text-[13px] text-muted mt-0.5 max-w-[320px] truncate">{c.blurb}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}><code className="text-[13px] bg-cream rounded-lg px-2 py-1">{c.slug}</code></td>
                    <td className={tdClass}>{counts.get(c.slug) ?? 0}</td>
                    <td className={`${tdClass} text-right whitespace-nowrap`}>
                      <button className={btnAdmin} onClick={() => openEdit(c)}>Edit</button>{" "}
                      <button
                        className={btnAdmin + " text-[#B3402F]!"}
                        onClick={() => setDeleting(c)}
                        aria-label={`Delete ${c.name}`}
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={form.id ? "Edit category" : "Add category"}>
          <div className="absolute inset-0 bg-ink/40" onClick={() => setForm(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[560px] max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-[26px]">{form.id ? "Edit category" : "Add category"}</h2>
              <button className="w-10 h-10 grid place-items-center rounded-full hover:bg-cream" onClick={() => setForm(null)} aria-label="Close">
                <IconX size={20} />
              </button>
            </div>

            <div className="flex gap-5 items-start flex-wrap">
              <div className="w-[140px] rounded-[18px] overflow-hidden flex-none border border-line">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt={form.name || "Category photo"} className="w-full aspect-square object-cover" />
                ) : (
                  <SofaIllustration type={form.type} fabric={form.fabric} bg={form.bg} className="w-full aspect-square" />
                )}
              </div>
              <p className="text-sm text-muted flex-1 basis-[200px]">Live preview — {form.imageUrl ? "your uploaded photo" : "the illustration"} is how the category tile looks in “Shop by style”.</p>
            </div>

            <ImageUploadField
              label="Category photo (optional)"
              hint="Upload from your device — it goes to Cloudinary automatically. Used for the “Shop by style” tile instead of the illustration."
              folder="categories"
              value={form.imageUrl}
              onChange={(url) => setForm((f) => (f ? { ...f, imageUrl: url } : f))}
            />

            <div>
              <label className={labelClass} htmlFor="cat-name">Name</label>
              <input
                id="cat-name"
                className={fieldClass}
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => (f ? { ...f, name, slug: slugTouched ? f.slug : slugify(name) } : f));
                }}
                placeholder="e.g. Corner Sofas"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cat-slug">URL slug</label>
              <input
                id="cat-slug"
                className={fieldClass}
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm((f) => (f ? { ...f, slug: slugify(e.target.value) } : f)); }}
                placeholder="corner-sofas"
              />
              <p className="text-[13px] text-muted mt-1.5">Used in /sofas?category={form.slug || "…"}</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="cat-menu">Menu group <span className="font-normal text-muted">(navbar — leave empty to hide from nav)</span></label>
              <input
                id="cat-menu"
                className={fieldClass}
                list="menu-groups"
                value={form.menu}
                onChange={(e) => setForm((f) => (f ? { ...f, menu: e.target.value } : f))}
                placeholder="e.g. Sofas"
              />
              <datalist id="menu-groups">
                {Array.from(new Set((categories ?? []).map((c) => c.menu).filter(Boolean))).map((m) => (
                  <option key={m as string} value={m as string} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass} htmlFor="cat-blurb">Description <span className="font-normal text-muted">(optional)</span></label>
              <textarea id="cat-blurb" rows={2} className={fieldClass} value={form.blurb}
                onChange={(e) => setForm((f) => (f ? { ...f, blurb: e.target.value } : f))}
                placeholder="Short line shown under the category name." />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass} htmlFor="cat-type">Illustration</label>
                <select id="cat-type" className={fieldClass} value={form.type}
                  onChange={(e) => setForm((f) => (f ? { ...f, type: e.target.value as SofaType } : f))}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cat-fabric">Fabric colour</label>
                <div className="flex gap-2.5 items-center">
                  <input id="cat-fabric" type="color" value={form.fabric}
                    onChange={(e) => setForm((f) => (f ? { ...f, fabric: e.target.value } : f))}
                    className="w-11 h-11 rounded-full cursor-pointer bg-transparent border border-line p-1" aria-label="Fabric colour" />
                  <input value={form.fabric} onChange={(e) => setForm((f) => (f ? { ...f, fabric: e.target.value } : f))}
                    className={fieldClass} aria-label="Fabric colour hex" />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="cat-bg">Tile background</label>
                <div className="flex gap-2.5 items-center">
                  <input id="cat-bg" type="color" value={form.bg}
                    onChange={(e) => setForm((f) => (f ? { ...f, bg: e.target.value } : f))}
                    className="w-11 h-11 rounded-full cursor-pointer bg-transparent border border-line p-1" aria-label="Tile background colour" />
                  <input value={form.bg} onChange={(e) => setForm((f) => (f ? { ...f, bg: e.target.value } : f))}
                    className={fieldClass} aria-label="Tile background hex" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button className={btnAdmin} onClick={() => setForm(null)}>Cancel</button>
              <button className={btnAdminPrimary} onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : form.id ? "Save changes" : "Add category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-label="Delete category">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-4">
            <h2 className="text-[24px]">Delete “{deleting.name}”?</h2>
            <p className="text-body text-[15px] leading-relaxed">
              {(counts.get(deleting.slug) ?? 0) > 0 ? (
                <>
                  <strong className="text-ink">{counts.get(deleting.slug)} product{(counts.get(deleting.slug) ?? 0) === 1 ? "" : "s"}</strong> use this category. They will keep the “{deleting.slug}” label but won’t appear under any category tile until reassigned.
                </>
              ) : (
                "No products use this category. This can’t be undone."
              )}
            </p>
            <div className="flex justify-end gap-2.5">
              <button className={btnAdmin} onClick={() => setDeleting(null)}>Keep it</button>
              <button className={btnAdminPrimary + " bg-[#B3402F]!"} onClick={remove}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
