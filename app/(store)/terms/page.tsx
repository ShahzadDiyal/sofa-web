import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd, gbp } from "@/lib/seo";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";
import { JsonLd } from "@/components/storefront";

export const metadata: Metadata = {
  title: "Terms & Conditions for Pay-on-Delivery Orders",
  description:
    "Sofora's terms: ordering forms a contract only after phone confirmation, no payment is taken online, inspection at the door, GBP prices include VAT.",
  alternates: { canonical: absoluteUrl("/terms") },
};

export default async function TermsPage() {
  const s = await getSettings();
  const paymentList = s.acceptedPayments
    .map((m) => PAYMENT_METHOD_LABELS[m].toLowerCase())
    .join(", ");

  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Terms & Conditions | Sofora",
            url: absoluteUrl("/terms"),
            description: metadata.description,
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Terms & Conditions", url: "/terms" },
          ]),
        ]}
      />
      <p className="label-caps mb-3">Terms &amp; conditions</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">
        Terms &amp; conditions
      </h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p>
          These terms apply to every order placed with Sofora ({s.address}). By placing an
          order you agree to them. If anything is unclear, contact us on{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
          or <a className="underline" href={`mailto:${s.email}`}>{s.email}</a> before
          ordering.
        </p>

        <h2 className="text-2xl text-ink mt-2">1. How the contract is formed</h2>
        <p>
          Placing an order on our website is an invitation for us to sell you the sofa — it
          is not yet a contract. The contract is formed when we{" "}
          <strong className="text-ink">confirm your order by phone or text</strong>, at
          which point we verify your details and agree a delivery slot. If we cannot fulfil
          your order for any reason, we will tell you promptly and no contract is formed.
        </p>

        <h2 className="text-2xl text-ink mt-2">2. No payment taken online</h2>
        <p>
          We never take payment through the website. No card or bank details are requested
          at checkout. Payment is due only to our driver on delivery, after you have had
          the chance to inspect your sofa. If anyone asks you for payment before delivery
          day, do not pay and report it to us immediately.
        </p>

        <h2 className="text-2xl text-ink mt-2">3. Prices and VAT</h2>
        <p>
          All prices are in pounds sterling (GBP) and include VAT where applicable. Delivery
          is free on orders over {gbp(s.freeDeliveryThreshold)} and {gbp(29)} below that.
          The price confirmed at checkout is the price you pay on delivery — it will not
          change.
        </p>

        <h2 className="text-2xl text-ink mt-2">4. Delivery</h2>
        <p>
          Delivery slots are agreed with you by phone before dispatch. Our two-person team
          delivers to your room of choice, including upstairs rooms where safe access
          allows. Please ensure someone aged 18 or over is present during your slot. Our
          full delivery policy, including access requirements and timeframes, is set out on
          our <a className="underline" href="/delivery">delivery page</a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">5. Inspection, acceptance and refusal</h2>
        <p>
          You may inspect the sofa at the door before paying. Payment by {paymentList}{" "}
          signifies acceptance. If the sofa is not right, you may refuse delivery and you
          owe nothing — see our <a className="underline" href="/returns">returns page</a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">6. Title and risk</h2>
        <p>
          Ownership of the sofa passes to you when you have paid the driver in full. Risk
          of loss or damage passes to you on delivery. Until payment is made, the sofa
          remains our property.
        </p>

        <h2 className="text-2xl text-ink mt-2">7. Your right to cancel</h2>
        <p>
          You have a 14-day right to cancel starting the day after delivery, under the
          Consumer Contracts Regulations 2013. We arrange and pay for collection, and
          refunds are made by bank transfer within 14 days of collection. Full details are
          on our <a className="underline" href="/returns">returns page</a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">8. Guarantee</h2>
        <p>
          Many of our ranges carry a 5-year guarantee on the frame and structure against
          manufacturing faults, as stated on each product page. This guarantee is in
          addition to your statutory rights under the Consumer Rights Act 2015, which are
          never affected.
        </p>

        <h2 className="text-2xl text-ink mt-2">9. Fire safety</h2>
        <p>
          All sofas we sell comply with the Furniture and Furnishings (Fire) (Safety)
          Regulations 1988 (as amended) and carry the required permanent labelling.
        </p>

        <h2 className="text-2xl text-ink mt-2">10. Liability</h2>
        <p>
          Nothing in these terms limits our liability for death or personal injury caused
          by our negligence, fraud, or any other liability that cannot be limited by law.
          Subject to that, our total liability for any order is limited to the price of
          that order, and we are not liable for losses that were not foreseeable at the
          time the contract was formed.
        </p>

        <h2 className="text-2xl text-ink mt-2">11. Privacy</h2>
        <p>
          How we collect and use your details is set out in our{" "}
          <a className="underline" href="/privacy">privacy policy</a> and{" "}
          <a className="underline" href="/cookies">cookie policy</a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">12. Governing law</h2>
        <p>
          These terms are governed by the law of England and Wales, and any disputes will
          be subject to the non-exclusive jurisdiction of the courts of England and Wales.
          If you live in Scotland or Northern Ireland, you may also bring proceedings in
          your local courts.
        </p>

        <h2 className="text-2xl text-ink mt-2">13. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. The version in force at the time
          your contract was formed (on phone confirmation) applies to your order.
        </p>

        <p className="text-[15px] text-muted">
          Last updated: October 2026. Questions about these terms? Call{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
          or email <a className="underline" href={`mailto:${s.email}`}>{s.email}</a>.
        </p>
      </div>
    </article>
  );
}
