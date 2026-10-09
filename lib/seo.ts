/* SEO / AEO / GEO helpers: canonical URLs, metadata, and JSON-LD builders.
   AEO (answer engines) and GEO (generative engines) both reward: factual,
   self-contained copy, FAQPage + HowTo structured data, a clear entity
   description of the business, and an llms.txt — all provided here. */

import type { Metadata } from "next";
import type { Faq, Product, SiteSettings } from "./types";

export const SITE_NAME = "Sofora";
export const SITE_TAGLINE = "Sofas worth coming home to.";
export const SITE_DESCRIPTION =
  "Sofora sells handcrafted sofas across the UK with cash on delivery: order online with no payment, we confirm by phone, deliver with a two-person team, and you pay the driver only after inspecting your sofa at the door.";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://sofora.example").replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function gbp(amount: number): string {
  return `£${amount.toLocaleString("en-GB")}`;
}

/* ---------- base metadata ---------- */

export function baseMetadata(): Metadata {
  const url = siteUrl();
  return {
    metadataBase: new URL(url),
    title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    keywords: [
      "sofas UK",
      "cash on delivery sofas",
      "pay on delivery sofa",
      "corner sofas UK",
      "3 seater sofas",
      "sofa beds UK",
      "armchairs UK",
      "buy sofa pay cash on delivery",
    ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      url,
      locale: "en_GB",
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
    },
    alternates: { canonical: url },
  };
}

/* ---------- JSON-LD ---------- */

export function orgJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "@id": absoluteUrl("/#store"),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl(),
    slogan: SITE_TAGLINE,
    telephone: settings.phone,
    email: settings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressCountry: "GB",
    },
    areaServed: { "@type": "Country", name: "United Kingdom" },
    priceRange: "££",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
    currenciesAccepted: "GBP",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE_NAME,
    url: siteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/sofas?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

export function productJsonLd(product: Product, categoryName?: string) {
  const url = absoluteUrl(`/sofas/${product.slug}`);
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url,
    priceCurrency: "GBP",
    price: product.price,
    availability: product.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
  };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description || `${product.name} — ${product.sub}. Pay on delivery across the UK.`,
    category: categoryName,
    url,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount ?? 0,
          },
        }
      : {}),
    offers: offer,
  };
}

export function breadcrumbJsonLd(trail: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.url),
    })),
  };
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** AEO/GEO: the pay-on-delivery flow as explicit steps answer engines can quote. */
export function howCodWorksJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How pay on delivery works at Sofora",
    description:
      "Order a sofa online with no payment. We confirm by phone, deliver with a two-person team, and you pay the driver after inspecting your sofa.",
    step: [
      { "@type": "HowToStep", position: 1, name: "Order online", text: "Pick your sofa and fabric. No payment details needed." },
      { "@type": "HowToStep", position: 2, name: "We confirm by phone", text: "A quick call or text to check your address and delivery slot." },
      { "@type": "HowToStep", position: 3, name: "We deliver", text: "A two-person team brings it to your room of choice." },
      { "@type": "HowToStep", position: 4, name: "Inspect, then pay", text: "Happy with it? Pay the driver by cash or card. Not right? Refuse it." },
    ],
  };
}

export function itemListJsonLd(products: Product[], listName: string, listUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    url: absoluteUrl(listUrl),
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/sofas/${p.slug}`),
      name: p.name,
    })),
  };
}

/** Render a JSON-LD script tag's contents safely. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
