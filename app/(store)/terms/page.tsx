import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for ordering from Sofora — pay on delivery, inspection at the door, and our guarantees.",
  alternates: { canonical: absoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <p className="label-caps mb-3">Terms of service</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">Terms of service</h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p><strong className="text-ink">Pay on delivery.</strong> Placing an order reserves your sofa. No payment is taken online. Payment is due to our driver on delivery, after you have inspected the sofa.</p>
        <p><strong className="text-ink">Inspection &amp; refusal.</strong> You may inspect the sofa at the door before paying. If it isn&apos;t right, you may refuse delivery and you owe nothing.</p>
        <p><strong className="text-ink">Being home.</strong> Delivery slots are agreed with you by phone before dispatch. Please make sure someone is available to accept the sofa during your slot.</p>
        <p><strong className="text-ink">Prices.</strong> All prices are in GBP and include VAT where applicable. Delivery is free over £500, otherwise £29.</p>
        <p><strong className="text-ink">Guarantee.</strong> Many ranges carry a 5-year frame guarantee against manufacturing faults, as described on each product page.</p>
        <p><strong className="text-ink">Contact.</strong> For anything about your order, contact us and we&apos;ll put it right.</p>
      </div>
    </article>
  );
}
