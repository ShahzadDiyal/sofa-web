"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Category, FooterLink, FooterMenu, Product } from "@/lib/types";
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

const SALE_LINK = { label: "Sale", href: "/uk/sofas?sale=1" };

/* Menu groups are built from the `menu` field on categories (editable in
   Admin → Categories). Nothing is hardcoded: rename a group or move a
   category there and the navbar follows. */

/* SSR/CSR standard: Header is a client component ONLY for interactivity
   (hover menus, drawer, search). All content data (categories, products)
   arrives as props from the server layout — it never fetches content
   itself, so nav/mega-menu links are present in the page source. */

/* Compact product tile for the mega-menu "Most popular" panel — shows the
   product's real photo when it has one, falling back to the illustration. */
function ProductTile({ product }: { product: Product }) {
  return (
    <Link href={`/uk/sofas/${product.slug}`} className="group/tile flex flex-col gap-2">
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

export function AnnouncementBar({ messages }: { messages: string[] }) {
  return (
    <div className="bg-forest text-cream text-sm">
      <div className="mx-auto px-6 flex gap-1 md:gap-9 flex-wrap justify-center py-2.5">
        {messages.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

export function Header({
  logoUrl,
  categories,
  products,
}: {
  logoUrl?: string;
  categories: Category[];
  products: Product[];
}) {
  const { basketCount, wishlist } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [products]);
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
    for (const c of categories) {
      if (!c.menu?.trim()) continue;
      const label = c.menu.trim();
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  })();

  /* Most popular PRODUCTS in a menu group — real photos first, then
     featured/rating order. */
  const popularFor = (cats: Category[]) => {
    const catSlugs = new Set(cats.map((c) => c.slug));
    return (products ?? [])
      .filter((p) => catSlugs.has(p.category) && p.inStock !== false)
      .sort((a, b) => {
        const ai = a.imageUrl ? 0 : 1;
        const bi = b.imageUrl ? 0 : 1;
        if (ai !== bi) return ai - bi;
        if (!!a.featured !== !!b.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return (b.rating ?? 0) - (a.rating ?? 0);
      })
      .slice(0, 4);
  };
  const openCats = menuGroups.find(([label]) => label === openMenu)?.[1] ?? [];
  const openPopular = popularFor(openCats);

  return (
    <header className="bg-cream border-b border-line sticky top-0 z-40">
      <div className="mx-auto px-6 flex items-center gap-6 py-4">
        <button
          className="lg:hidden w-11 h-11 grid place-items-center rounded-full"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <IconMenu />
        </button>
        <Link href="/uk/" className="flex items-center gap-2.5" aria-label="Sofora home">
          <Logo src={logoUrl || undefined} />
        </Link>

        <nav className="hidden lg:flex gap-7 flex-1 font-medium text-[15px]" aria-label="Primary">
          {menuGroups.map(([label]) => {
            const isOpen = openMenu === label;
            return (
              <div
                key={label}
                onMouseEnter={() => showMenu(label)}
                onMouseLeave={scheduleHide}
              >
                <Link
                  href="/uk/sofas"
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
            href="/uk/wishlist"
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
            href="/uk/checkout"
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

      {/* Full-width mega menu panel (desktop) */}
      {openMenu && (
        <div
          className="absolute inset-x-0 top-full z-50 hidden lg:block"
          onMouseEnter={() => showMenu(openMenu)}
          onMouseLeave={scheduleHide}
          onClick={() => setOpenMenu(null)}
        >
          <div className="mega-menu-in bg-white border-y border-line shadow-[0_36px_70px_-28px_rgba(31,58,50,0.35)]">
            <div className="mx-auto px-6 lg:px-10 py-8 lg:py-10 max-w-[1440px] grid gap-10 lg:grid-cols-[minmax(360px,470px)_1fr]">
              <div>
                <p className="label-caps mb-4">Shop by category</p>
                <ul className="grid sm:grid-cols-2 gap-x-3">
                  {openCats.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/uk/sofas?category=${c.slug}`}
                          className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-[14px] hover:bg-cream transition-colors group/cat"
                        >
                          <span className="w-11 h-11 rounded-[12px] overflow-hidden bg-cream flex-none grid place-items-center">
                            {c.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[15px] font-semibold text-forest/60">
                                {c.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-[14px] flex-1 leading-snug">{c.name}</span>
                          <span className="text-[12px] text-muted tabular-nums bg-cream group-hover/cat:bg-white rounded-full px-2 py-0.5 transition-colors">
                            {counts[c.slug] ?? 0}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                <Link
                  href="/uk/sofas"
                  className="inline-flex items-center gap-2 mt-5 text-[14px] font-semibold text-forest underline underline-offset-4 hover:opacity-70"
                >
                  View all {openMenu.toLowerCase()}
                  <span aria-hidden>→</span>
                </Link>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="label-caps">Most popular</p>
                  <Link
                    href="/uk/sofas"
                    className="text-[13px] font-semibold text-terra underline underline-offset-4 hover:opacity-70"
                  >
                    Shop bestsellers
                  </Link>
                </div>
                {openPopular.length > 0 && (
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
                    {openPopular.map((p) => (
                      <ProductTile key={p.slug} product={p} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <form
          className="border-t border-line"
          action="/sofas"
          onSubmit={(e) => {
            if (!q.trim()) e.preventDefault();
          }}
        >
          <div className="mx-auto px-6 py-3 flex gap-3">
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
              <Logo textSize={24} markSize={34} src={logoUrl || undefined} />
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
                      {cats.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/uk/sofas?category=${c.slug}`}
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
                        ))}
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
            <Link href="/uk/wishlist" onClick={() => setOpen(false)} className="py-3 text-lg font-medium border-b border-line">
              Wishlist
            </Link>
            <Link href="/uk/blog" onClick={() => setOpen(false)} className="py-3 text-lg font-medium border-b border-line">
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
  settings: {
    phone: string;
    email: string;
    address: string;
    footerTagline: string;
    footerMenus: FooterMenu[];
    legalLinks: FooterLink[];
    copyrightText: string;
    footerHtml: string;
    logoUrl: string;
  };
  shopLinks: { label: string; href: string }[];
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-forest text-mint">
      <div className="mx-auto px-6 pt-16 pb-10 flex flex-wrap gap-10">
        <div className="flex-[2_1_280px] flex flex-col gap-3.5">
          <Logo variant="light" textSize={30} markSize={40} src={settings.logoUrl || undefined} />
          {settings.footerTagline && (
            <p className="leading-relaxed max-w-[36ch] text-[15px]">{settings.footerTagline}</p>
          )}
          {settings.footerHtml && (
            <div
              className="text-[14px] leading-relaxed max-w-[40ch] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: settings.footerHtml }}
            />
          )}
        </div>
        <nav className="flex-1 min-w-[150px] flex flex-col gap-2.5 text-[15px]" aria-label="Shop">
          <span className="label-caps text-peach! mb-1.5">Shop</span>
          <Link href="/uk/sofas" className="hover:opacity-70">All sofas</Link>
          {shopLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:opacity-70 capitalize">
              {l.label}
            </Link>
          ))}
        </nav>
        {settings.footerMenus.map((menu) => (
          <nav
            key={menu.title}
            className="flex-1 min-w-[150px] flex flex-col gap-2.5 text-[15px]"
            aria-label={menu.title}
          >
            <span className="label-caps text-peach! mb-1.5">{menu.title}</span>
            {menu.links.map((l) => (
              <Link key={`${l.href}-${l.label}`} href={l.href} className="hover:opacity-70">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
        <div className="flex-1 min-w-[200px] flex flex-col gap-2.5 text-[15px]">
          <span className="label-caps text-peach! mb-1.5">Contact</span>
          <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:opacity-70">{settings.phone}</a>
          <a href={`mailto:${settings.email}`} className="hover:opacity-70">{settings.email}</a>
          <span>{settings.address}</span>
        </div>
      </div>
      <div className="border-t border-forest-deep">
        <div className="mx-auto px-6 py-5 text-[13px] text-mint/70 flex flex-wrap gap-4 justify-between">
          <span>{settings.copyrightText || `© ${year} Sofora. All rights reserved.`}</span>
          <span className="flex gap-5">
            {settings.legalLinks.map((l) => (
              <Link key={`${l.href}-${l.label}`} href={l.href} className="hover:opacity-70">
                {l.label}
              </Link>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
