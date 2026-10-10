"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Category, Product } from "@/lib/types";
import {
  IconBasket,
  IconChevronDown,
  IconHeart,
  IconMenu,
  IconSearch,
  IconSofa,
  IconX,
} from "./Icons";
import SofaIllustration from "./SofaIllustration";
import Logo from "./Logo";

const SALE_LINK = { label: "Sale", href: "/sofas?sale=1" };

/* Menu groups are built from the `menu` field on categories (editable in
   Admin → Categories). Nothing is hardcoded: rename a group or move a
   category there and the navbar follows. */

function useMenuData() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        const list = d.products ?? [];
        const m: Record<string, number> = {};
        for (const p of list) m[p.category] = (m[p.category] ?? 0) + 1;
        setCounts(m);
        setProducts(list);
      })
      .catch(() => {});
  }, []);
  return { categories, counts, products };
}

/* Compact product tile for the mega-menu "Most popular" panel — shows the
   product's real photo when it has one, falling back to the illustration. */
function ProductTile({ product }: { product: Product }) {
  return (
    <Link href={`/sofas/${product.slug}`} className="group/tile flex flex-col gap-2">
      <span className="rounded-[18px] overflow-hidden block bg-cream">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full aspect-[4/3] object-cover group-hover/tile:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <SofaIllustration
            type={product.type}
            fabric={product.fabric}
            bg={product.bg}
            accent={product.accent}
            title={product.name}
            className="w-full aspect-[4/3] group-hover/tile:scale-[1.04] transition-transform duration-300"
          />
        )}
      </span>
      <span>
        <span className="block text-[14px] font-medium leading-snug group-hover/tile:underline underline-offset-4">
          {product.name}
        </span>
        <span className="block text-[12px] text-muted mt-0.5">
          £{product.price.toLocaleString("en-GB")}
        </span>
      </span>
    </Link>
  );
}

function ShimmerTiles() {
  return (
    <div className="grid grid-cols-2 gap-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="rounded-[18px] aspect-[4/3] skeleton" />
          <div className="h-4 w-3/4 rounded-full skeleton" />
        </div>
      ))}
    </div>
  );
}

export function AnnouncementBar({ messages }: { messages: string[] }) {
  return (
    <div className="bg-forest text-cream text-sm">
      <div className="mx-auto max-w-7xl px-6 flex gap-9 flex-wrap justify-center py-2.5">
        {messages.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

export function Header() {
  const { basketCount, wishlist } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { categories, counts, products } = useMenuData();
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showMenu = (label: string) => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenMenu(label);
  };
  const scheduleHide = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 150);
  };

  /* Navbar menu groups, derived live from the database. */
  const menuGroups = (() => {
    const map = new Map<string, Category[]>();
    for (const c of categories ?? []) {
      if (!c.menu?.trim()) continue;
      const label = c.menu.trim();
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <header className="bg-cream border-b border-line sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 flex items-center gap-6 py-4">
        <button
          className="lg:hidden w-11 h-11 grid place-items-center rounded-full"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <IconMenu />
        </button>
        <Link href="/" className="flex items-center gap-2.5" aria-label="Sofora home">
          <Logo />
        </Link>

        <nav className="hidden lg:flex gap-7 flex-1 font-medium text-[15px]" aria-label="Primary">
          {menuGroups.map(([label, cats]) => {
            /* Most popular PRODUCTS in this menu group — real photos first,
               then featured/rating order. */
            const catSlugs = new Set(cats.map((c) => c.slug));
            const popular = (products ?? [])
              .filter((p) => catSlugs.has(p.category) && p.inStock !== false)
              .sort((a, b) => {
                const ai = a.imageUrl ? 0 : 1;
                const bi = b.imageUrl ? 0 : 1;
                if (ai !== bi) return ai - bi;
                if (!!a.featured !== !!b.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
                return (b.rating ?? 0) - (a.rating ?? 0);
              })
              .slice(0, 4);
            const isOpen = openMenu === label;
            return (
              <div
                key={label}
                className="relative"
                onMouseEnter={() => showMenu(label)}
                onMouseLeave={scheduleHide}
              >
                <Link
                  href="/sofas"
                  className="py-2.5 hover:opacity-70 flex items-center gap-1.5"
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => setOpenMenu(null)}
                >
                  {label}
                  <IconChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </Link>
                {isOpen && (
                  <div className="absolute left-0 top-full pt-2 z-50">
                    <div className="w-[640px] bg-white rounded-[24px] border border-line shadow-[0_24px_70px_-20px_rgba(31,58,50,0.35)] p-6 grid grid-cols-[1fr_1.4fr] gap-7">
                      <div>
                        <p className="label-caps mb-3">Shop by category</p>
                        {categories === null ? (
                          <div className="flex flex-col gap-2.5" aria-hidden>
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div key={i} className="h-5 w-4/5 rounded-full skeleton" />
                            ))}
                          </div>
                        ) : (
                          <ul className="flex flex-col">
                            {cats.map((c) => (
                              <li key={c.slug}>
                                <Link
                                  href={`/sofas?category=${c.slug}`}
                                  onClick={() => setOpenMenu(null)}
                                  className="flex items-center justify-between gap-3 py-2 rounded-xl px-2 -mx-2 hover:bg-cream text-[14px]"
                                >
                                  <span className="font-medium">{c.name}</span>
                                  <span className="text-[12px] text-muted tabular-nums">
                                    {counts[c.slug] ?? 0}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          href="/sofas"
                          onClick={() => setOpenMenu(null)}
                          className="inline-block mt-3 text-[14px] font-semibold text-forest underline underline-offset-4"
                        >
                          View all {label.toLowerCase()}
                        </Link>
                      </div>
                      <div>
                        <p className="label-caps mb-3">Most popular</p>
                        {products === null ? (
                          <ShimmerTiles />
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            {popular.map((p) => (
                              <div key={p.slug} onClick={() => setOpenMenu(null)}>
                                <ProductTile product={p} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Link
            href={SALE_LINK.href}
            className="py-2.5 hover:opacity-70 text-terra"
          >
            {SALE_LINK.label}
          </Link>
        </nav>

        <div className="flex gap-1 items-center ml-auto lg:ml-0">
          <button
            className="w-11 h-11 grid place-items-center rounded-full hover:bg-sand"
            aria-label="Search"
            onClick={() => setSearchOpen((s) => !s)}
          >
            <IconSearch />
          </button>
          <Link
            href="/wishlist"
            className="w-11 h-11 grid place-items-center rounded-full hover:bg-sand relative"
            aria-label={`Wishlist, ${wishlist.length} items`}
          >
            <IconHeart />
            {wishlist.length > 0 && (
              <span className="absolute right-0.5 top-0.5 bg-terra text-white rounded-full text-[11px] font-semibold min-w-[18px] h-[18px] grid place-items-center px-1">
                {wishlist.length}
              </span>
            )}
          </Link>
          <Link
            href="/checkout"
            className="w-11 h-11 grid place-items-center rounded-full hover:bg-sand relative"
            aria-label={`Basket, ${basketCount} items`}
          >
            <IconBasket />
            {basketCount > 0 && (
              <span className="absolute right-0.5 top-0.5 bg-terra text-white rounded-full text-[11px] font-semibold min-w-[18px] h-[18px] grid place-items-center px-1">
                {basketCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <form
          className="border-t border-line"
          action="/sofas"
          onSubmit={(e) => {
            if (!q.trim()) e.preventDefault();
          }}
        >
          <div className="mx-auto max-w-7xl px-6 py-3 flex gap-3">
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sofas — e.g. “corner velvet”…"
              className="field-input"
              aria-label="Search sofas"
              autoFocus
            />
            <button type="submit" className="btn btn-primary shrink-0">
              Search
            </button>
          </div>
        </form>
      )}

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-cream p-6 flex flex-col gap-2 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Logo textSize={24} markSize={34} />
              <button
                className="w-11 h-11 grid place-items-center rounded-full hover:bg-sand"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <IconX />
              </button>
            </div>
            {menuGroups.map(([label, cats]) => {
              const isExpanded = expanded === label;
              return (
                <div key={label} className="border-b border-line">
                  <button
                    className="w-full flex items-center justify-between py-3 text-lg font-medium"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(isExpanded ? null : label)}
                  >
                    {label}
                    <IconChevronDown
                      size={18}
                      className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="pb-3 flex flex-col gap-1">
                      {categories === null ? (
                        <div className="flex flex-col gap-2.5 py-1" aria-hidden>
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-5 w-3/4 rounded-full skeleton" />
                          ))}
                        </div>
                      ) : (
                        cats.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/sofas?category=${c.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 py-2 text-[16px]"
                          >
                            <span className="w-11 rounded-[12px] overflow-hidden flex-none bg-cream">
                              {c.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.imageUrl}
                                  alt=""
                                  loading="lazy"
                                  className="w-full aspect-square object-cover"
                                />
                              ) : (
                                <SofaIllustration
                                  type={c.type}
                                  fabric={c.fabric}
                                  bg={c.bg}
                                  title={c.name}
                                  className="w-full aspect-square"
                                />
                              )}
                            </span>
                            <span>{c.name}</span>
                            <span className="ml-auto text-[13px] text-muted tabular-nums">
                              {counts[c.slug] ?? 0}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <Link
              href={SALE_LINK.href}
              onClick={() => setOpen(false)}
              className="py-3 text-lg font-medium border-b border-line text-terra"
            >
              {SALE_LINK.label}
            </Link>
            <Link href="/wishlist" onClick={() => setOpen(false)} className="py-3 text-lg font-medium border-b border-line">
              Wishlist
            </Link>
            <Link href="/blog" onClick={() => setOpen(false)} className="py-3 text-lg font-medium border-b border-line">
              Blog
            </Link>
            <p className="mt-6 text-sm text-muted">Nothing to pay online — pay on delivery.</p>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer({
  settings,
  shopLinks,
}: {
  settings: { phone: string; email: string; address: string };
  shopLinks: { label: string; href: string }[];
}) {
  return (
    <footer className="bg-forest text-mint">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10 flex flex-wrap gap-10">
        <div className="flex-[2_1_280px] flex flex-col gap-3.5">
          <Logo variant="light" textSize={30} markSize={40} />
          <p className="leading-relaxed max-w-[36ch] text-[15px]">
            Sofas only. Delivered across the UK, paid for on arrival.
          </p>
        </div>
        <nav className="flex-1 min-w-[150px] flex flex-col gap-2.5 text-[15px]" aria-label="Shop">
          <span className="label-caps text-peach! mb-1.5">Shop</span>
          <Link href="/sofas" className="hover:opacity-70">All sofas</Link>
          {shopLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:opacity-70 capitalize">
              {l.label}
            </Link>
          ))}
        </nav>
        <nav className="flex-1 min-w-[150px] flex flex-col gap-2.5 text-[15px]" aria-label="Help">
          <span className="label-caps text-peach! mb-1.5">Help</span>
          <Link href="/#how" className="hover:opacity-70">How COD works</Link>
          <Link href="/delivery" className="hover:opacity-70">Delivery policy</Link>
          <Link href="/returns" className="hover:opacity-70">Returns</Link>
          <Link href="/reviews" className="hover:opacity-70">Customer reviews</Link>
          <Link href="/blog" className="hover:opacity-70">Blog</Link>
          <Link href="/contact" className="hover:opacity-70">Contact</Link>
        </nav>
        <div className="flex-1 min-w-[200px] flex flex-col gap-2.5 text-[15px]">
          <span className="label-caps text-peach! mb-1.5">Contact</span>
          <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:opacity-70">{settings.phone}</a>
          <a href={`mailto:${settings.email}`} className="hover:opacity-70">{settings.email}</a>
          <span>{settings.address}</span>
        </div>
      </div>
      <div className="border-t border-forest-deep">
        <div className="mx-auto max-w-7xl px-6 py-5 text-[13px] text-mint/70 flex flex-wrap gap-4 justify-between">
          <span>© 2026 Sofora. All rights reserved.</span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:opacity-70">Privacy</Link>
            <Link href="/cookies" className="hover:opacity-70">Cookies</Link>
            <Link href="/terms" className="hover:opacity-70">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
