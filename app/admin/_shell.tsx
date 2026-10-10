"use client";

/* Admin shell: forest sidebar (desktop) / top bar with horizontal nav (mobile). */

import Link from "next/link";
import Logo from "@/components/Logo";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconArrowRight,
  IconArticle,
  IconBolt,
  IconDashboard,
  IconHeart,
  IconMail,
  IconPackage,
  IconPalette,
  IconPhone,
  IconSettings,
  IconSofa,
  IconTag,
  IconTicket,
  IconTruck,
} from "@/components/Icons";
import { api } from "./_ui";
import type { ContactQuery, Order } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: IconDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", Icon: IconPackage, badge: true },
  { href: "/admin/queries", label: "Queries", Icon: IconMail, queryBadge: true },
  { href: "/admin/products", label: "Sofas", Icon: IconSofa },
  { href: "/admin/categories", label: "Categories", Icon: IconTag },
  { href: "/admin/colors", label: "Colours", Icon: IconPalette },
  { href: "/admin/product-reviews", label: "Reviews", Icon: IconHeart },
  { href: "/admin/coupons", label: "Coupons", Icon: IconTicket },
  { href: "/admin/flash-sales", label: "Flash sales", Icon: IconBolt },
  { href: "/admin/posts", label: "Blog", Icon: IconArticle },
  { href: "/admin/customers", label: "Customers", Icon: IconPhone },
  { href: "/admin/delivery", label: "Delivery & COD", Icon: IconTruck },
  { href: "/admin/settings", label: "Settings", Icon: IconSettings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
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
    fetch("/api/admin/session")
      .then((r) => {
        if (!r.ok) throw new Error("signed out");
        return r.json();
      })
      .then((d) => {
        setAdminEmail(d.email ?? null);
        setAuthChecked(true);
      })
      .catch(() => window.location.replace("/admin/login"));
  }, [isLoginPage]);

  useEffect(() => {
    if (!authChecked) return;
    api<{ orders: Order[] }>("/api/orders")
      .then(({ orders }) => setNewCount(orders.filter((o) => o.status === "new").length))
      .catch(() => {});
    api<{ queries: ContactQuery[] }>("/api/queries")
      .then(({ queries }) => setNewQueryCount(queries.filter((x) => x.status === "new").length))
      .catch(() => {});
  }, [pathname, authChecked]);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    window.location.replace("/admin/login");
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

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-3.5 py-[11px] rounded-[12px] font-medium text-[15px] min-h-[44px] transition whitespace-nowrap ${
      active ? "bg-forest-deep text-cream" : "text-[#C9D6CC] hover:bg-[#27463C] hover:text-cream"
    }`;

  const nav = (
    <>
      {NAV.map(({ href, label, Icon, exact, badge, queryBadge }) => {
        const active = isActive(pathname, href, exact);
        const count = badge ? newCount : queryBadge ? newQueryCount : 0;
        const showBadge = (badge || queryBadge) && count > 0;
        return (
          <Link key={href} href={href} className={linkCls(active)} aria-current={active ? "page" : undefined}>
            <Icon size={20} />
            <span>{label}</span>
            {showBadge && (
              <span className="ml-auto bg-terra text-white rounded-full text-[12px] font-semibold px-2 py-0.5 min-w-[24px] text-center">
                {count}
              </span>
            )}
          </Link>
        );
      })}
      <Link href="/" className={linkCls(false)}>
        <IconArrowRight size={20} />
        <span>View store</span>
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[250px] bg-forest text-cream flex-col gap-7 px-4 py-6 z-40">
        <Link href="/admin" className="flex items-center gap-2.5 px-1.5">
          <Logo variant="light" markSize={36} textSize={22} />
          <span className="text-[12px] text-[#C9D6CC]">Admin</span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Admin">
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
          <Link href="/" className="ml-auto text-[13px] underline text-[#C9D6CC]">
            View store
          </Link>
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
