import type { Metadata } from "next";
import { Suspense } from "react";
import { listCategories, listProducts } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import CollectionClient from "./CollectionClient";

export const metadata: Metadata = {
  title: "All sofas — pay on delivery",
  description:
    "Browse every Sofora sofa: 3 seaters, corner sofas, 3+2 sets, armchairs, recliners and sofa beds. Free UK delivery, pay the driver on arrival.",
  alternates: { canonical: absoluteUrl("/sofas") },
  openGraph: {
    title: "All sofas — Sofora",
    description: "Every sofa ships free across the UK and is paid for on delivery.",
    url: absoluteUrl("/sofas"),
    type: "website",
  },
};

export default async function CollectionPage() {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading sofas">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="skeleton aspect-square rounded-[18px]" />
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-6 w-1/3" />
            </div>
          ))}
        </div>
      }
    >
      <CollectionClient products={products} categories={categories} />
    </Suspense>
  );
}
