import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout — pay on delivery",
  description:
    "Complete your Sofora order with your details only. Nothing to pay online — pay the driver when your sofa arrives.",
  alternates: { canonical: absoluteUrl("/checkout") },
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const settings = await getSettings();
  return <CheckoutClient settings={settings} />;
}
