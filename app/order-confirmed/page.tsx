import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl } from "@/lib/seo";
import OrderConfirmedClient from "./OrderConfirmedClient";

export const metadata: Metadata = {
  title: "Order confirmed — pay on delivery",
  description: "Your Sofora order is reserved. We'll call to confirm your delivery slot — nothing to pay until your sofa arrives.",
  alternates: { canonical: absoluteUrl("/order-confirmed") },
  robots: { index: false, follow: false },
};

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center"><div className="skeleton w-64 h-8" /></div>}>
      <OrderConfirmedClient />
    </Suspense>
  );
}
