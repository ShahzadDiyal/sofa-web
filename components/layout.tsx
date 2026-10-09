"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { IconBasket, IconHeart, IconMenu, IconSearch, IconSofa, IconX } from "./Icons";

const NAV = [
  { label: "All sofas", href: "/sofas" },
  { label: "Corner sofas", href: "/sofas?category=corner-sofas" },
  { label: "3+2 sets", href: "/sofas?category=3-plus-2-sets" },
  { label: "Armchairs", href: "/sofas?category=armchairs" },
  { label: "Sofa beds", href: "/sofas?category=sofa-beds" },
  { label: "Sale", href: "/sofas?sale=1", accent: true },
];

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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open ]);

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
          <span className="w-[38px] h-[38px] rounded-full bg-forest grid place-items-center text-cream">
            <IconSofa size={20} />
          </span>
          <span className="font-serif text-[27px] tracking-tight">Sofora</span>
        </Link>

        <nav className="hidden lg:flex gap-7 flex-1 font-medium text-[15px]" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className={`py-2.5 hover:opacity-70 ${n.accent ? "text-terra" : ""}`}
            >
              {n.label}
            </Link>
          ))}
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
              <span className="font-serif text-2xl">Sofora</span>
              <button
                className="w-11 h-11 grid place-items-center rounded-full hover:bg-sand"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <IconX />
              </button>
            </div>
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`py-3 text-lg font-medium border-b border-line ${n.accent ? "text-terra" : ""}`}
              >
                {n.label}
              </Link>
            ))}
            <Link href="/wishlist" onClick={() => setOpen(false)} className="py-3 text-lg font-medium border-b border-line">
              Wishlist
            </Link>
            <p className="mt-6 text-sm text-muted">Nothing to pay online — pay on delivery.</p>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer({ settings }: { settings: { phone: string; email: string; address: string } }) {
  return (
    <footer className="bg-forest text-mint">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10 flex flex-wrap gap-10">
        <div className="flex-[2_1_280px] flex flex-col gap-3.5">
          <span className="font-serif text-3xl text-cream">Sofora</span>
          <p className="leading-relaxed max-w-[36ch] text-[15px]">
            Sofas only. Delivered across the UK, paid for on arrival.
          </p>
        </div>
        <nav className="flex-1 min-w-[150px] flex flex-col gap-2.5 text-[15px]" aria-label="Shop">
          <span className="label-caps text-peach! mb-1.5">Shop</span>
          <Link href="/sofas" className="hover:opacity-70">All sofas</Link>
          <Link href="/sofas?category=corner-sofas" className="hover:opacity-70">Corner sofas</Link>
          <Link href="/sofas?category=3-plus-2-sets" className="hover:opacity-70">3+2 sets</Link>
          <Link href="/sofas?category=armchairs" className="hover:opacity-70">Armchairs</Link>
        </nav>
        <nav className="flex-1 min-w-[150px] flex flex-col gap-2.5 text-[15px]" aria-label="Help">
          <span className="label-caps text-peach! mb-1.5">Help</span>
          <Link href="/#how" className="hover:opacity-70">How COD works</Link>
          <Link href="/delivery" className="hover:opacity-70">Delivery policy</Link>
          <Link href="/returns" className="hover:opacity-70">Returns</Link>
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
            <Link href="/terms" className="hover:opacity-70">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
