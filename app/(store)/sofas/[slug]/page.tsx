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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const products = await listProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) return { title: "Sofa not found" };
  const title = `${product.name} — ${product.sub}`;
  const description = `${product.description.slice(0, 150)}… Pay nothing online — pay the driver on delivery across the UK.`;
  const url = absoluteUrl(`/sofas/${product.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Sofora`,
      description,
      url,
      type: "website",
      ...(product.imageUrl ? { images: [{ url: product.imageUrl, alt: product.name }] } : {}),
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
