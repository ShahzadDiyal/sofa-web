import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings, listCategories, listFaqs, listProducts } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/lib/seo";
import { Breadcrumbs, JsonLd } from "@/components/storefront";
import ProductClient from "./ProductClient";

export async function generateStaticParams() {
  const products = await listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

/** Keep the product name so that "{Name} | Sofora" stays within 60 chars. */
function shortName(name: string): string {
  const max = 60 - " | Sofora".length;
  return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
}

/** Trim copy to 150–160 chars on a word boundary. */
function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > 120 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const products = await listProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) return { title: "Sofa not found" };
  const name = shortName(product.name);
  const title = `${name} | Sofora`;
  const description = trimDescription(
    `${product.name} — ${product.sub}. Pay nothing online: we confirm by phone, deliver with a two-person team, and you pay the driver on delivery across the UK.`
  );
  const url = absoluteUrl(`/sofas/${product.slug}`);
  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: product.imageUrl ?? absoluteUrl("/opengraph-image"), alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.imageUrl ?? absoluteUrl("/opengraph-image")],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [products, categories, faqs, settings] = await Promise.all([
    listProducts(),
    listCategories(),
    listFaqs(),
    getSettings(),
  ]);
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const category = categories.find((c) => c.slug === product.category);
  const related = products
    .filter((p) => p.id !== product.id && p.inStock)
    .sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))
    .slice(0, 4);

  return (
    <>
      <JsonLd data={productJsonLd(product, category?.name)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: category?.name ?? "All sofas", url: "/sofas" },
          { name: product.name, url: `/sofas/${product.slug}` },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <div className="mx-auto max-w-7xl px-6 pt-7">
        <Breadcrumbs
          trail={[
            { name: "Home", href: "/" },
            { name: category?.name ?? "All sofas", href: "/sofas" },
            { name: product.name },
          ]}
        />
      </div>

      <ProductClient product={product} related={related} faqs={faqs} settings={settings} />
    </>
  );
}
