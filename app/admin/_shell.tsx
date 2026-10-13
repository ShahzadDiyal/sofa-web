"use client";

/* Admin shell: forest sidebar (desktop) / top bar with horizontal nav (mobile). */

import Link from "next/link";
import Logo from "@/components/Logo";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/seo";
import {
  IconArrowRight,
  IconArticle,
  IconBell,
  IconBolt,
  IconChevronDown,
  IconDashboard,
  IconFabric,
  IconHeart,
  IconHistory,
  IconMail,
  IconPackage,
  IconPalette,
  IconPhone,
  IconPin,
  IconSettings,
  IconShield,
  IconSofa,
  IconTag,
  IconTicket,
  IconTruck,
} from "@/components/Icons";
import { api } from "./_ui";
import AdminSearch from "./_search";
import { AdminBell } from "./_notifications";
import type { ContactQuery, Order } from "@/lib/types";
import type { ComponentType } from "react";

type IconT = ComponentType<{ size?: number; className?: string }>;

interface NavLeaf {
  href: string;
  label: string;
  Icon: IconT;
  exact?: boolean;
  badge?: boolean;
  queryBadge?: boolean;
}

interface NavGroup {
  label: string;
  Icon: IconT;
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

const isGroup = (e: NavEntry): e is NavGroup => "items" in e;

const NAV: NavEntry[] = [
  {
    label: "Dashboard",
    Icon: IconDashboard,
    items: [
      { href: "/uk/admin", label: "Overview", Icon: IconDashboard, exact: true },
      { href: "/uk/admin/customers", label: "Customers", Icon: IconPhone },
      { href: "/uk/admin/users", label: "Users", Icon: IconShield },
      { href: "/uk/admin/orders", label: "Orders", Icon: IconPackage, badge: true },
      { href: "/uk/admin/queries", label: "Queries", Icon: IconMail, queryBadge: true },
      { href: "/uk/admin/notifications", label: "Notifications", Icon: IconBell },
      { href: "/uk/admin/audit-logs", label: "Audit logs", Icon: IconHistory },
      { href: "/uk/admin/tracking", label: "Tracking", Icon: IconPin },
    ],
  },
  {
    label: "Products",
    Icon: IconSofa,
    items: [
      { href: "/uk/admin/products", label: "Sofas", Icon: IconSofa },
      { href: "/uk/admin/categories", label: "Categories", Icon: IconTag },
      { href: "/uk/admin/colors", label: "Colours", Icon: IconPalette },
      { href: "/uk/admin/fabrics", label: "Fabrics", Icon: IconFabric },
      { href: "/uk/admin/product-reviews", label: "Reviews", Icon: IconHeart },
    ],
  },
  {
    label: "Content",
    Icon: IconArticle,
    items: [
      { href: "/uk/admin/coupons", label: "Coupons", Icon: IconTicket },
      { href: "/uk/admin/flash-sales", label: "Flash sales", Icon: IconBolt },
      { href: "/uk/admin/posts", label: "Blog", Icon: IconArticle },
      { href: "/uk/admin/delivery", label: "Delivery & COD", Icon: IconTruck },
    ],
  },
  { href: "/uk/admin/settings", label: "Settings", Icon: IconSettings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  // Hrefs carry the public /uk prefix, but usePathname() returns the
  // rewritten (unprefixed) path — compare against both forms.
  const bare = href.replace(/^\/uk(?=\/|$)/, "");
  const match = (p: string) => (exact ? pathname === p : pathname === p || pathname.startsWith(p + "/"));
  return match(href) || match(bare);
}

const NAV_OPEN_KEY = "sofora-admin-nav";

function AdminNav({ pathname, newCount, newQueryCount }: { pathname: string; newCount: number; newQueryCount: number }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(NAV_OPEN_KEY) ?? "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  const toggle = (label: string) =>
    setOpen((o) => {
      const next = { ...o, [label]: !(o[label] ?? false) };
      try {
        localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-3.5 py-[11px] rounded-[12px] font-medium text-[15px] min-h-[44px] transition whitespace-nowrap ${
      active ? "bg-forest-deep text-cream" : "text-[#C9D6CC] hover:bg-[#27463C] hover:text-cream"
    }`;

  const badgeCount = (leaf: NavLeaf) => (leaf.badge ? newCount : leaf.queryBadge ? newQueryCount : 0);

  const renderLeaf = (leaf: NavLeaf) => {
    const active = isActive(pathname, leaf.href, leaf.exact);
    const count = badgeCount(leaf);
    return (
      <Link key={leaf.href} href={leaf.href} className={linkCls(active)} aria-current={active ? "page" : undefined}>
        <leaf.Icon size={20} />
        <span>{leaf.label}</span>
        {count > 0 && (
          <span className="ml-auto bg-terra text-white rounded-full text-[12px] font-semibold px-2 py-0.5 min-w-[24px] text-center">
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {NAV.map((entry) => {
        if (!isGroup(entry)) return renderLeaf(entry);
        const groupActive = entry.items.some((i) => isActive(pathname, i.href, i.exact));
        // A group holding the current page is always expanded; otherwise the
        // admin's own toggle (remembered) decides.
        const isOpen = groupActive || (open[entry.label] ?? false);
        const groupBadge = entry.items.reduce((s, i) => s + badgeCount(i), 0);
        return (
          <div key={entry.label} className="flex items-center gap-1 lg:flex-col lg:items-stretch">
            <button
              type="button"
              onClick={() => toggle(entry.label)}
              aria-expanded={isOpen}
              className={linkCls(groupActive) + " w-full text-left cursor-pointer"}
            >
              <entry.Icon size={20} />
              <span>{entry.label}</span>
              {groupBadge > 0 && (
                <span className="ml-auto bg-terra text-white rounded-full text-[12px] font-semibold px-2 py-0.5 min-w-[24px] text-center">
                  {groupBadge}
                </span>
              )}
              <IconChevronDown
                size={16}
                className={`transition-transform ${isOpen ? "rotate-180" : ""} ${groupBadge > 0 ? "" : "ml-auto"}`}
              />
            </button>
            {isOpen && (
              <div className="flex gap-1 lg:flex-col lg:ml-4 lg:pl-2 lg:border-l lg:border-[#3A5A4F]">
                {entry.items.map(renderLeaf)}
              </div>
            )}
          </div>
        );
      })}
      <Link href="/uk/" className={linkCls(false)}>
        <IconArrowRight size={20} />
        <span>View store</span>
      </Link>
    </>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [newCount, setNewCount] = useState(0);
  const [newQueryCount, setNewQueryCount] = useState(0);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  // Auth gate for the admin UI: the real security boundary is the API
  // (every admin route calls requireAdmin()), this keeps signed-out
  // visitors from seeing empty admin screens.
  useEffect(() => {
    if (isLoginPage) return;
    fetch(apiUrl("/api/admin/session"))
      .then((r) => {
        if (!r.ok) throw new Error("signed out");
        return r.json();
      })
      .then((d) => {
        setAdminEmail(d.email ?? null);
        setAuthChecked(true);
      })
      .catch(() => window.location.replace("/uk/admin/login"));
  }, [isLoginPage]);

  /* Sidebar badges count only unread items (new orders, new queries).
     Refetched on navigation AND whenever a page reports that something was
     read/handled, via window event "sofora:badges" — so the counts drop the
     moment you read a query or update an order, not just on page change. */
  const refreshBadges = useCallback(() => {
    api<{ orders: Order[] }>("/api/orders")
      .then(({ orders }) => setNewCount(orders.filter((o) => o.status === "new").length))
      .catch(() => {});
    api<{ queries: ContactQuery[] }>("/api/queries")
      .then(({ queries }) => setNewQueryCount(queries.filter((x) => x.status === "new").length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refreshBadges();
  }, [pathname, authChecked, refreshBadges]);

  useEffect(() => {
    window.addEventListener("sofora:badges", refreshBadges);
    return () => window.removeEventListener("sofora:badges", refreshBadges);
  }, [refreshBadges]);

  async function signOut() {
    await fetch(apiUrl("/api/admin/session"), { method: "DELETE" }).catch(() => {});
    window.location.replace("/uk/admin/login");
  }

  // Login page renders without the admin chrome.
  if (isLoginPage) return <>{children}</>;

  // Shimmer while the session check runs (no content flash for signed-out visitors).
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="lg:pl-[250px]">
          <div className="px-4 sm:px-6 lg:px-9 py-6 lg:py-8 flex flex-col gap-4 max-w-[1400px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[120px] rounded-[12px] bg-stone/20 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const nav = <AdminNav pathname={pathname} newCount={newCount} newQueryCount={newQueryCount} />;

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[250px] bg-forest text-cream flex-col gap-7 px-4 py-6 z-40">
        <div className="flex items-center gap-2.5 px-1.5">
          <Link href="/uk/admin" className="flex items-center gap-2.5">
            <Logo variant="light" markSize={36} textSize={22} />
            <span className="text-[12px] text-[#C9D6CC]">Admin</span>
          </Link>
          <div className="ml-auto">
            <AdminBell />
          </div>
        </div>
        <AdminSearch id="admin-global-search" />
        <nav
          className="flex flex-col gap-1 overflow-y-auto min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Admin"
        >
          {nav}
        </nav>
        <div className="mt-auto flex items-center gap-3 p-3 bg-[#27463C] rounded-[14px]">
          <span className="w-[38px] h-[38px] rounded-full bg-peach text-terra grid place-items-center font-semibold shrink-0">
            {(adminEmail?.[0] ?? "S").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[14px] truncate">{adminEmail ?? "Admin"}</div>
            <button
              type="button"
              onClick={signOut}
              className="text-[12px] text-[#C9D6CC] underline hover:text-cream"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-forest text-cream">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Logo variant="light" markSize={34} textSize={20} />
          <span className="text-[12px] text-[#C9D6CC]">Admin</span>
          <div className="ml-auto flex items-center gap-1">
            <AdminBell />
            <Link href="/uk/" className="text-[13px] underline text-[#C9D6CC]">
              View store
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3">
          <AdminSearch id="admin-global-search-mobile" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Admin">
          {nav}
        </nav>
      </div>

      <main className="lg:pl-[250px]">
        <div className="px-4 sm:px-6 lg:px-9 py-6 lg:py-8 flex flex-col gap-6 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
