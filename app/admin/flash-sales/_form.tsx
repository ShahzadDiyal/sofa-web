"use client";

/* Flash-sale banner builder. Every visual and behavioural aspect is adjustable:
   template, animation, inline/popup display, closeable, background, custom
   HTML/CSS, link, schedule, and page + product targeting — with live preview. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import FlashSaleRenderer from "@/components/FlashSaleRenderer";
import { IconSearch } from "@/components/Icons";
import { useToast } from "@/components/toast";
import type { FlashSale, FlashSaleAnimation, FlashSaleDisplay, FlashSalePage, FlashSaleTemplate, Product } from "@/lib/types";
import ImageUploadField from "../_image-upload";
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

const TEMPLATES: { id: FlashSaleTemplate; name: string; hint: string }[] = [
  { id: "classic", name: "Classic", hint: "Image banner, badge, countdown, CTA" },
  { id: "bold", name: "Bold", hint: "Big centred type on your background" },
  { id: "minimal", name: "Minimal", hint: "Single row: title, countdown, link" },
  { id: "strip", name: "Strip", hint: "Slim full-width announcement bar" },
  { id: "custom", name: "Custom HTML", hint: "Your own HTML below takes over" },
];

const ANIMATIONS: { id: FlashSaleAnimation; name: string }[] = [
  { id: "none", name: "None" },
  { id: "fade-in", name: "Fade in" },
  { id: "slide-up", name: "Slide up" },
  { id: "pulse", name: "Pulse" },
  { id: "marquee", name: "Marquee (scrolling text)" },
];

const PAGES: { id: FlashSalePage; name: string }[] = [
  { id: "home", name: "Homepage" },
  { id: "sofas", name: "Shop page" },
  { id: "product", name: "Product pages" },
  { id: "coupons", name: "Coupons page" },
];

const monoClass = fieldClass + " font-mono text-[13px] leading-relaxed";

export default function FlashSaleForm({ sale }: { sale?: FlashSale }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(sale?.title ?? "");
  const [subtitle, setSubtitle] = useState(sale?.subtitle ?? "");
  const [linkUrl, setLinkUrl] = useState(sale?.linkUrl ?? "/uk/sofas?sale=1");
  const [linkLabel, setLinkLabel] = useState(sale?.linkLabel ?? "Shop the sale");
  const [active, setActive] = useState(sale?.active ?? true);
  const [startsAt, setStartsAt] = useState(toInputDate(sale?.startsAt));
  const [endsAt, setEndsAt] = useState(toInputDate(sale?.endsAt));

  const [template, setTemplate] = useState<FlashSaleTemplate>(sale?.template ?? "classic");
  const [animation, setAnimation] = useState<FlashSaleAnimation>(sale?.animation ?? "none");
  const [displayMode, setDisplayMode] = useState<FlashSaleDisplay>(sale?.displayMode ?? "inline");
  const [closeable, setCloseable] = useState(sale?.closeable ?? true);
  const [bgColor, setBgColor] = useState(sale?.bgColor ?? "#2E4B3F");
  const [imageUrl, setImageUrl] = useState(sale?.imageUrl ?? "");
  const [contentHtml, setContentHtml] = useState(sale?.contentHtml ?? "");
  const [customCss, setCustomCss] = useState(sale?.customCss ?? "");

  const [pages, setPages] = useState<FlashSalePage[]>(sale?.pages ?? ["home"]);
  const [productIds, setProductIds] = useState<string[]>(sale?.productIds ?? []);

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

  const togglePage = (id: FlashSalePage) =>
    setPages((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));
  const toggleProduct = (id: string) =>
    setProductIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const previewSale: FlashSale = {
    id: sale?.id ?? "preview",
    title: title || "Your headline here",
    subtitle: subtitle || undefined,
    linkUrl: linkUrl || undefined,
    linkLabel: linkLabel || undefined,
    template,
    animation,
    displayMode,
    closeable,
    bgColor,
    imageUrl: imageUrl || undefined,
    contentHtml: contentHtml || undefined,
    customCss: customCss || undefined,
    productIds,
    pages,
    startsAt: fromInputDate(startsAt) || undefined,
    endsAt: fromInputDate(endsAt) || undefined,
    active,
    createdAt: "",
    updatedAt: "",
  };

  const save = async () => {
    if (!title.trim()) {
      setError("Give the banner a title.");
      return;
    }
    if (template === "custom" && !contentHtml.trim()) {
      setError("The Custom HTML template needs some HTML content.");
      return;
    }
    if (pages.length === 0) {
      setError("Pick at least one page where the banner appears.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        linkUrl: linkUrl.trim(),
        linkLabel: linkLabel.trim(),
        template,
        animation,
        displayMode,
        closeable,
        bgColor,
        imageUrl: imageUrl.trim(),
        contentHtml: contentHtml.trim(),
        customCss: customCss.trim(),
        productIds,
        pages,
        startsAt: fromInputDate(startsAt),
        endsAt: fromInputDate(endsAt),
        active,
      };
      if (sale) await api(`/api/flash-sales/${sale.id}`, "PATCH", payload);
      else await api("/api/flash-sales", "POST", payload);
      toast.success(sale ? "Banner updated" : "Banner created", `“${title.trim()}” was saved.`);
      router.push("/uk/admin/flash-sales");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      setError(msg);
      toast.error("Could not save banner", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      <div>
        <h1 className="text-[30px]">{sale ? "Edit banner" : "New banner"}</h1>
        <p className="text-muted text-[14px] mt-1">
          Design the banner with a template or your own HTML/CSS, then choose where it appears.
        </p>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-[20px] mb-4">Content</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass} htmlFor="fls-title">Title</label>
                <input id="fls-title" className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Winter Sale — up to 30% off" />
              </div>
              <div>
                <label className={labelClass} htmlFor="fls-sub">Subtitle (optional)</label>
                <input id="fls-sub" className={fieldClass} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="On selected corner sofas, this week only" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="fls-url">Link URL</label>
                  <input id="fls-url" className={fieldClass} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/uk/sofas?sale=1" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="fls-label">Button label</label>
                  <input id="fls-label" className={fieldClass} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Shop the sale" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="fls-start">Starts (optional)</label>
                  <input id="fls-start" type="datetime-local" className={fieldClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="fls-end">Ends (optional)</label>
                  <input id="fls-end" type="datetime-local" className={fieldClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </div>
              </div>
              <Toggle label={active ? "Active" : "Paused"} on={active} onChange={setActive} />
            </div>
          </Card>

          <Card>
            <h2 className="text-[20px] mb-4">Design</h2>
            <div className="flex flex-col gap-5">
              <div>
                <span className={labelClass}>Template</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
                      className={`text-left rounded-[14px] border-[1.5px] px-3.5 py-3 transition ${
                        template === t.id ? "border-forest bg-mint/40" : "border-line bg-white hover:border-forest/50"
                      }`}
                    >
                      <span className="block text-[14px] font-semibold">{t.name}</span>
                      <span className="block text-[12px] text-muted mt-0.5">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="fls-anim">Animation</label>
                  <select id="fls-anim" className={fieldClass} value={animation} onChange={(e) => setAnimation(e.target.value as FlashSaleAnimation)}>
                    {ANIMATIONS.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={labelClass}>Display</span>
                  <div className="flex gap-2.5">
                    {(["inline", "popup"] as FlashSaleDisplay[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDisplayMode(m)}
                        className={`flex-1 min-h-[48px] rounded-[14px] border-[1.5px] text-[14px] font-semibold capitalize transition ${
                          displayMode === m ? "border-forest bg-mint/40" : "border-line bg-white hover:border-forest/50"
                        }`}
                      >
                        {m === "inline" ? "In page" : "Popup"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <Toggle label={closeable ? "Closeable" : "Not closeable"} on={closeable} onChange={setCloseable} />
              </div>

              <div>
                <label className={labelClass} htmlFor="fls-bg">Background</label>
                <div className="flex gap-3 items-center">
                  <input
                    id="fls-bg"
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(bgColor) ? bgColor : "#2E4B3F"}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-12 h-12 rounded-full cursor-pointer bg-transparent border border-line p-0 flex-none"
                    aria-label="Pick a background colour"
                  />
                  <input
                    className={fieldClass}
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    placeholder="#2E4B3F or a CSS gradient"
                    aria-label="Background CSS"
                  />
                </div>
                <p className="text-[12px] text-muted mt-1.5">A colour like #2E4B3F, or any CSS background — e.g. a linear-gradient.</p>
              </div>

              <ImageUploadField
                label="Background image (optional)"
                hint="Upload from your device — it sits behind the Classic template."
                folder="flash-sales"
                value={imageUrl}
                onChange={setImageUrl}
              />

              <div>
                <label className={labelClass} htmlFor="fls-html">
                  Custom HTML {template === "custom" ? "(this is your banner)" : "(optional — styles borders, animation, anything)"}
                </label>
                <textarea
                  id="fls-html"
                  className={monoClass + " min-h-[140px]"}
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  placeholder={'<div style="padding:32px;text-align:center">\n  <h2 style="color:#fff">Mega Sale</h2>\n</div>'}
                  spellCheck={false}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="fls-css">Custom CSS (optional)</label>
                <textarea
                  id="fls-css"
                  className={monoClass + " min-h-[110px]"}
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  placeholder={".my-banner { border: 3px dashed #fff; }\n@keyframes wiggle { ... }"}
                  spellCheck={false}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-[20px] mb-1">Where it appears</h2>
            <p className="text-muted text-[14px] mb-4">Pick pages, and optionally limit product pages to specific sofas.</p>
            <span className={labelClass}>Pages</span>
            <div className="flex gap-2.5 flex-wrap mb-5">
              {PAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePage(p.id)}
                  aria-pressed={pages.includes(p.id)}
                  className={`px-4 min-h-[44px] rounded-full border-[1.5px] text-[14px] font-semibold transition ${
                    pages.includes(p.id) ? "border-forest bg-forest text-cream" : "border-line bg-white"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <span className={labelClass}>Sofas {productIds.length > 0 ? `(${productIds.length} selected)` : "(all)"}</span>
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
            <div className="border border-line rounded-[16px] max-h-[280px] overflow-y-auto divide-y divide-sand">
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
            <p className="text-[12px] text-muted mt-2">Only used on product pages: empty = every product page, selected = just those sofas.</p>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 flex flex-col gap-4">
          <h2 className="text-[20px]">Live preview</h2>
          <FlashSaleRenderer sale={previewSale} preview />
          <p className="text-[12px] text-muted">Preview only — popup banners appear as overlays on the live site.</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Link href="/uk/admin/flash-sales" className={btnAdmin}>
          Cancel
        </Link>
        <button className={btnAdminPrimary} onClick={save} disabled={saving}>
          {saving ? "Saving…" : sale ? "Save changes" : "Create banner"}
        </button>
      </div>
    </div>
  );
}
