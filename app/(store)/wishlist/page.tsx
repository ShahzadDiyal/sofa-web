import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import WishlistClient from "./WishlistClient";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved Sofora sofas.",
  alternates: { canonical: absoluteUrl("/wishlist") },
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistClient />;
}
