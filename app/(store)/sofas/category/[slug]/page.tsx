import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listCategories, listColors, listFabrics, listProducts } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/storefront";
import CollectionClient from "../../CollectionClient";

/** Trim copy to 150–160 chars on a word boundary. */
function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > 120 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await listCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: "Sofas | Sofora" };
  const label = category.name;
  const title = `${label} | Sofora`.length <= 60 ? `${label} | Sofora` : label;
  const blurb = category.blurb?.trim();
  const description = trimDescription(
    `Shop ${label.toLowerCase()} with free UK delivery over £500. Pay cash on delivery after inspection.${
      blurb ? ` ${blurb}` : " Handcrafted comfort, delivered by a two-person team to your room of choice."
    }`
  );
  const canonical = absoluteUrl(`/sofas/category/${category.slug}`);
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

export default async function SofaCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [products, categories, colors, fabricLib] = await Promise.all([
    listProducts(),
    listCategories(),
    listColors(),
    listFabrics(),
  ]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "All sofas", url: "/sofas" },
          { name: category.name, url: `/sofas/category/${category.slug}` },
        ])}
      />
      <Suspense
        fallback={
          <div className="mx-auto px-6 py-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading sofas">
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
        <CollectionClient
          products={products}
          categories={categories}
          colors={colors}
          fabricLib={fabricLib}
          initialCategory={category.slug}
          canonicalPath={`/sofas/category/${category.slug}`}
        />
      </Suspense>
    </>
  );
}
