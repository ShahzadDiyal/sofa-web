import type { Metadata } from "next";
import { listFaqs } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { FaqAccordion, JsonLd } from "@/components/storefront";

export const metadata: Metadata = {
  title: "FAQs | Pay on Delivery, Fabrics, Guarantee & More",
  description:
    "Answers to common Sofora questions: pay on delivery, delivery slots, fabrics, the 5-year guarantee, measuring your room and caring for your sofa.",
  alternates: { canonical: absoluteUrl("/faqs") },
};

export default async function FaqsPage() {
  const faqs = await listFaqs();

  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "FAQs | Sofora",
            url: absoluteUrl("/faqs"),
            description: metadata.description,
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "FAQs", url: "/faqs" },
          ]),
          faqJsonLd(faqs),
        ]}
      />
      <h1 className="text-[clamp(34px,4vw,48px)] leading-tight mb-4">
        Frequently asked questions
      </h1>
      <p className="text-body leading-relaxed mb-10 max-w-[52ch]">
        Everything about ordering with Sofora — pay on delivery, delivery day,
        fabrics, guarantees and looking after your sofa. Can&apos;t find your
        answer? Message us on WhatsApp from the contact page.
      </p>
      <FaqAccordion faqs={faqs} />
    </article>
  );
}
