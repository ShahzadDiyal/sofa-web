import type { Metadata } from "next";
import { getSettings, listActiveCoupons } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import CheckoutClient from "./CheckoutClient";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "Checkout — pay on delivery",
  description:
    "Complete your Sofora order with your details only. Nothing to pay online — pay the driver when your sofa arrives.",
  alternates: { canonical: absoluteUrl("/checkout") },
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [settings, coupons] = await Promise.all([getSettings(), listActiveCoupons()]);
  return (
    <>
      <CheckoutClient
        settings={settings}
        activeCoupons={coupons.map((c) => ({ code: c.code, productIds: c.productIds ?? [] }))}
      />
      <ChatWidget />
    </>
  );
}
