"use client";

/* Admin shell: forest sidebar (desktop) / top bar with horizontal nav (mobile). */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconArrowRight,
  IconDashboard,
  IconPackage,
  IconPhone,
  IconSettings,
  IconSofa,
  IconTag,
  IconTruck,
} from "@/components/Icons";
import { api } from "./_ui";
import type { Order } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: IconDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", Icon: IconPackage, badge: true },
  { href: "/admin/products", label: "Sofas", Icon: IconSofa },
  { href: "/admin/categories", label: "Categories", Icon: IconTag },
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

  useEffect(() => {
    api<{ orders: Order[] }>("/api/orders")
      .then(({ orders }) => setNewCount(orders.filter((o) => o.status === "new").length))
      .catch(() => {});
  }, [pathname]);

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-3.5 py-[11px] rounded-[12px] font-medium text-[15px] min-h-[44px] transition whitespace-nowrap ${
      active ? "bg-forest-deep text-cream" : "text-[#C9D6CC] hover:bg-[#27463C] hover:text-cream"
    }`;

  const nav = (
    <>
      {NAV.map(({ href, label, Icon, exact, badge }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link key={href} href={href} className={linkCls(active)} aria-current={active ? "page" : undefined}>
            <Icon size={20} />
            <span>{label}</span>
            {badge && newCount > 0 && (
              <span className="ml-auto bg-terra text-white rounded-full text-[12px] font-semibold px-2 py-0.5 min-w-[24px] text-center">
                {newCount}
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
          <span className="w-9 h-9 rounded-full bg-cream grid place-items-center text-forest">
            <IconSofa size={20} />
          </span>
          <span>
            <span className="block font-serif text-[22px] leading-none">Sofora</span>
            <span className="block text-[12px] text-[#C9D6CC] mt-1">Admin</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Admin">
          {nav}
        </nav>
        <div className="mt-auto flex items-center gap-3 p-3 bg-[#27463C] rounded-[14px]">
          <span className="w-[38px] h-[38px] rounded-full bg-peach text-terra grid place-items-center font-semibold shrink-0">
            SO
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-[14px]">Store Owner</div>
            <div className="text-[12px] text-[#C9D6CC]">Store owner</div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-forest text-cream">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <span className="w-9 h-9 rounded-full bg-cream grid place-items-center text-forest">
            <IconSofa size={20} />
          </span>
          <span className="font-serif text-[20px]">Sofora</span>
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
