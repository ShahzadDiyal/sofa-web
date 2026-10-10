"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category, Color, Product } from "@/lib/types";
import { gbp } from "@/lib/seo";
import { Breadcrumbs, JsonLd, ProductCard } from "@/components/storefront";
import { itemListJsonLd } from "@/lib/seo";
import { IconCash, IconShield, IconTruck } from "@/components/Icons";

const SEATS = [1, 2, 3, 4];
const FABRICS = ["Easy-clean weave", "Velvet", "Jumbo cord", "Bouclé"];
const FEATURES = ["Sofa bed", "Reclining", "Storage"];
/* Fallback palette if the managed colour library can't be reached. */
const FALLBACK_COLOURS: { name: string; hex: string }[] = [
  { name: "Oat", hex: "#D8CBB4" },
  { name: "Sage", hex: "#5E7A6B" },
  { name: "Charcoal", hex: "#3F4443" },
  { name: "Terracotta", hex: "#C27B5A" },
  { name: "Navy", hex: "#2E3F5C" },
  { name: "Mink", hex: "#8B7B6B" },
  { name: "Blush", hex: "#D9B8AE" },
  { name: "Mustard", hex: "#CFA33A" },
];

type Sort = "best" | "price-asc" | "price-desc" | "newest";

function Check({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer min-h-[44px] text-[15px]">
      <input type="checkbox" checked={on} onChange={onToggle} className="sr-only" />
      <span
        className={`w-5 h-5 rounded-md border-[1.5px] grid place-items-center transition-colors ${
          on ? "bg-forest border-forest text-cream" : "border-line bg-white text-transparent"
        }`}
        aria-hidden
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {label}
    </label>
  );
}

export default function CollectionClient({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const params = useSearchParams();
  const initialCat = params.get("category") ?? "";
  const initialQ = params.get("q") ?? "";
  const initialSale = params.get("sale") === "1";

  const [cat, setCat] = useState(initialCat);
  const [q] = useState(initialQ);
  const [saleOnly, setSaleOnly] = useState(initialSale);
  const [seats, setSeats] = useState<number[]>([]);
  const [fabrics, setFabrics] = useState<string[]>([]);
  const [colours, setColours] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<Sort>("best");
  /* Colour filter swatches come from the managed library (Admin → Colours). */
  const [libColors, setLibColors] = useState<Color[] | null>(null);
  useEffect(() => {
    fetch("/api/colors")
      .then((r) => r.json())
      .then((d) => setLibColors(d.colors ?? []))
      .catch(() => setLibColors([]));
  }, []);
  const filterColours: { name: string; hex?: string; imageUrl?: string }[] =
    libColors === null
      ? FALLBACK_COLOURS
      : libColors.length
        ? libColors
        : FALLBACK_COLOURS;

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.inStock);
    if (cat) list = list.filter((p) => p.category === cat);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((p) =>
        `${p.name} ${p.sub} ${p.description} ${p.fabricName ?? ""}`.toLowerCase().includes(needle)
      );
    }
    if (saleOnly) list = list.filter((p) => p.wasPrice);
    if (seats.length) list = list.filter((p) => p.seats && seats.some((s) => (s === 4 ? (p.seats ?? 0) >= 4 : p.seats === s)));
    if (fabrics.length) list = list.filter((p) => p.fabricType && fabrics.includes(p.fabricType));
    if (colours.length) list = list.filter((p) => p.colourName && colours.includes(p.colourName));
    if (features.length)
      list = list.filter((p) => p.features && features.every((f) => p.features!.includes(f)));
    const lo = parseFloat(minPrice);
    const hi = parseFloat(maxPrice);
    if (!Number.isNaN(lo)) list = list.filter((p) => p.price >= lo);
    if (!Number.isNaN(hi)) list = list.filter((p) => p.price <= hi);

    const sorted = [...list];
    switch (sort) {
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "newest": sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      default: sorted.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    }
    return sorted;
  }, [products, cat, q, saleOnly, seats, fabrics, colours, features, minPrice, maxPrice, sort]);

  const activeCat = categories.find((c) => c.slug === cat);
  const hasFilters =
    cat || seats.length || fabrics.length || colours.length || features.length || minPrice || maxPrice || saleOnly || q;
  const clearAll = () => {
    setCat(""); setSeats([]); setFabrics([]); setColours([]); setFeatures([]);
    setMinPrice(""); setMaxPrice(""); setSaleOnly(false);
  };

  /* Quick-filter chips, built live from the database: every category that
     actually has products, in catalogue order. */
  const quickCats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return categories.filter((c) => (counts.get(c.slug) ?? 0) > 0);
  }, [products, categories]);

  return (
    <>
      <JsonLd data={itemListJsonLd(filtered, activeCat ? `${activeCat.name} at Sofora` : "All sofas at Sofora", "/sofas")} />

      <div className="mx-auto max-w-7xl px-6 pt-8 pb-5">
        <Breadcrumbs
          trail={[{ name: "Home", href: "/" }, { name: activeCat ? activeCat.name : "All sofas" }]}
        />
        <div className="flex flex-wrap justify-between items-end gap-6 mt-5">
          <div className="flex flex-col gap-3">
            <h1 className="text-[clamp(40px,5vw,60px)] leading-tight capitalize">
              {activeCat ? activeCat.name : "All sofas"}
            </h1>
            <p className="text-body max-w-[52ch] leading-relaxed">
              {activeCat?.blurb ??
                "Every sofa ships free across the UK and is paid for on delivery, after you've inspected it."}
              {q && (
                <>
                  {" "}Showing results for <strong className="text-ink">“{q}”</strong>.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted" role="status">
              {filtered.length} {filtered.length === 1 ? "sofa" : "sofas"}
            </span>
            <label className="flex items-center gap-2 text-sm font-medium">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="field-select w-auto! rounded-full! py-2.5!"
                aria-label="Sort sofas"
              >
                <option value="best">Best selling</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap mt-7" role="group" aria-label="Quick filters">
          <button
            onClick={() => setCat("")}
            aria-pressed={cat === ""}
            className={`px-5 py-2.5 rounded-full border-[1.5px] text-[15px] font-medium min-h-[44px] transition-colors ${
              cat === "" ? "bg-forest border-forest text-cream" : "border-line bg-white hover:border-ink"
            }`}
          >
            All
          </button>
          {quickCats.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCat(c.slug)}
              aria-pressed={cat === c.slug}
              className={`px-5 py-2.5 rounded-full border-[1.5px] text-[15px] font-medium min-h-[44px] transition-colors ${
                cat === c.slug ? "bg-forest border-forest text-cream" : "border-line bg-white hover:border-ink"
              }`}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => setSaleOnly((s) => !s)}
            aria-pressed={saleOnly}
            className={`px-5 py-2.5 rounded-full border-[1.5px] text-[15px] font-medium min-h-[44px] transition-colors ${
              saleOnly ? "bg-terra border-terra text-white" : "border-line bg-white text-terra hover:border-terra"
            }`}
          >
            Sale
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 flex flex-wrap gap-10 pt-4 pb-24 items-start">
        {/* Filters */}
        <aside className="flex-none w-full md:w-[250px] flex flex-col" aria-label="Filters">
          <div className="flex justify-between items-center pb-4">
            <span className="font-semibold text-[16px]">Filters</span>
            {hasFilters && (
              <button onClick={clearAll} className="text-terra font-semibold text-sm min-h-[44px]">
                Clear all
              </button>
            )}
          </div>

          <div className="border-t border-line py-4">
            <span className="label-caps">Seats</span>
            <div className="mt-1">
              {SEATS.map((s) => (
                <Check key={s} label={s === 4 ? "4+ seater" : `${s} seater`} on={seats.includes(s)}
                  onToggle={() => toggle(seats, s, setSeats)} />
              ))}
            </div>
          </div>

          <div className="border-t border-line py-4">
            <span className="label-caps">Fabric</span>
            <div className="mt-1">
              {FABRICS.map((f) => (
                <Check key={f} label={f} on={fabrics.includes(f)} onToggle={() => toggle(fabrics, f, setFabrics)} />
              ))}
            </div>
          </div>

          <div className="border-t border-line py-4">
            <span className="label-caps">Colour</span>
            <div className="flex gap-2.5 flex-wrap mt-3">
              {filterColours.map((c) => (
                <button
                  key={c.name}
                  aria-label={c.name}
                  aria-pressed={colours.includes(c.name)}
                  title={c.name}
                  onClick={() => toggle(colours, c.name, setColours)}
                  className="w-[34px] h-[34px] rounded-full p-0 cursor-pointer border-2 border-white transition-transform hover:scale-110 overflow-hidden"
                  style={
                    c.imageUrl
                      ? { outline: `1.5px solid ${colours.includes(c.name) ? "#1F3A32" : "#DDD3C4"}`, outlineOffset: "2px" }
                      : {
                          background: c.hex || "#DDD3C4",
                          outline: `1.5px solid ${colours.includes(c.name) ? "#1F3A32" : "#DDD3C4"}`,
                          outlineOffset: "2px",
                        }
                  }
                >
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="sr-only">{c.name}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-line py-4">
            <span className="label-caps">Price</span>
            <div className="flex gap-2.5 mt-3 items-center">
              <input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Min £"
                inputMode="numeric"
                aria-label="Minimum price"
                className="field-input py-2.5!"
              />
              <span className="text-muted">–</span>
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Max £"
                inputMode="numeric"
                aria-label="Maximum price"
                className="field-input py-2.5!"
              />
            </div>
          </div>

          <div className="border-t border-b border-line py-4">
            <span className="label-caps">Features</span>
            <div className="mt-1">
              {FEATURES.map((f) => (
                <Check key={f} label={f} on={features.includes(f)} onToggle={() => toggle(features, f, setFeatures)} />
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 basis-[560px] min-w-0">
          {filtered.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center gap-4">
              <h2 className="text-3xl">No sofas match those filters</h2>
              <p className="text-body">Try widening the price range or clearing a filter or two.</p>
              <button onClick={clearAll} className="btn btn-primary mt-2">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reassurance band */}
      <section className="bg-forest text-cream">
        <div className="mx-auto max-w-7xl px-6 py-11 flex flex-wrap gap-6 justify-center text-[15px] font-medium">
          <span className="flex items-center gap-2.5"><IconCash size={20} /> Nothing to pay online</span>
          <span className="flex items-center gap-2.5"><IconTruck size={20} /> Free UK delivery over {gbp(500)}</span>
          <span className="flex items-center gap-2.5"><IconShield size={20} /> Inspect at the door first</span>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10 text-center">
        <Link href="/#how" className="font-semibold border-b-[1.5px] border-ink pb-0.5 hover:opacity-70">
          How pay on delivery works
        </Link>
      </div>
    </>
  );
}
