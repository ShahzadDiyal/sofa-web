import type { Metadata } from "next";
import { Suspense } from "react";
import { listCategories, listProducts } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import CollectionClient from "./CollectionClient";

/** Trim copy to 150–160 chars on a word boundary. */
function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > 120 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category: catSlug } = await searchParams;
  if (catSlug) {
    const categories = await listCategories();
    const category = categories.find((c) => c.slug === catSlug);
    if (category) {
      const label = category.name;
      const title = `${label} | Sofora`.length <= 60 ? `${label} | Sofora` : label;
      const blurb = category.blurb?.trim();
      const description = trimDescription(
        `Shop ${label.toLowerCase()} with free UK delivery over £500. Pay cash on delivery after inspection.${
          blurb ? ` ${blurb}` : " Handcrafted comfort, delivered by a two-person team to your room of choice."
        }`
      );
      const canonical = absoluteUrl(`/sofas?category=${category.slug}`);
      return {
        title: { absolute: title },
        description,
        alternates: { canonical },
        openGraph: {
          title,
          description,
          url: canonical,
          type: "website",
        },
      };
    }
  }
  return {
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
}

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
