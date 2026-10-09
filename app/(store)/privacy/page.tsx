import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/storefront";

export const metadata: Metadata = {
  title: "Privacy Policy | How Sofora Uses Your Data",
  description:
    "Sofora's privacy policy: what order details we collect, why, lawful bases under UK GDPR, no card data stored, cookies, retention, and your rights.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default async function PrivacyPage() {
  const s = await getSettings();

  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Privacy Policy | Sofora",
            url: absoluteUrl("/privacy"),
            description: metadata.description,
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Privacy Policy", url: "/privacy" },
          ]),
        ]}
      />
      <p className="label-caps mb-3">Privacy policy</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">Privacy policy</h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p>
          Sofora ({s.address}) is the data controller for the personal data described in
          this policy. If you have any questions about it, contact us on{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
          or <a className="underline" href={`mailto:${s.email}`}>{s.email}</a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">What we collect</h2>
        <p>When you place an order or contact us, we collect:</p>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>Your name, phone number and delivery address.</li>
          <li>Your email address, if you provide one.</li>
          <li>Order details: the sofa, fabric, price and any delivery notes.</li>
          <li>
            Records of our phone and text conversations about your order, including the
            confirmation call.
          </li>
          <li>
            Your preferred payment method for the driver (cash, card or bank transfer) —
            chosen at checkout, not payment details themselves.
          </li>
        </ul>

        <h2 className="text-2xl text-ink mt-2">What we never collect</h2>
        <p>
          We <strong className="text-ink">never collect or store card numbers, bank
          details or any other payment credentials</strong>. There is nothing to pay
          online, so there is nothing for us to hold. If you pay the driver by card, the
          transaction happens on the driver&apos;s card machine; if you pay cash or by
          bank transfer, no payment data touches our systems at all.
        </p>

        <h2 className="text-2xl text-ink mt-2">How we use your data and our lawful bases</h2>
        <p>Under UK GDPR we rely on the following lawful bases:</p>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            <strong className="text-ink">Contract</strong> — to confirm your order by
            phone or text, agree a delivery slot, deliver your sofa and collect payment
            on delivery.
          </li>
          <li>
            <strong className="text-ink">Legitimate interests</strong> — to handle
            returns, guarantee claims and customer-service enquiries, and to keep
            accounting records.
          </li>
          <li>
            <strong className="text-ink">Consent</strong> — for any optional marketing
            messages, which you can withdraw at any time. We only ever contact you about
            your order unless you have separately opted in.
          </li>
        </ul>

        <h2 className="text-2xl text-ink mt-2">Phone confirmation calls</h2>
        <p>
          {s.confirmationCallText} We use the phone number you provide solely for this
          purpose and for delivery-day coordination. We do not use order phone numbers
          for unsolicited marketing.
        </p>

        <h2 className="text-2xl text-ink mt-2">Who we share your data with</h2>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            <strong className="text-ink">Our delivery team</strong> — your name, address
            and phone number, so they can complete your delivery and collect payment.
          </li>
          <li>
            <strong className="text-ink">Service providers</strong> — such as our
            website host and messaging provider, who process data only on our
            instructions.
          </li>
        </ul>
        <p>
          We never sell your details to third parties, and we do not share them for
          anyone else&apos;s marketing.
        </p>

        <h2 className="text-2xl text-ink mt-2">Cookies</h2>
        <p>
          We use a small amount of browser storage to remember your basket and wishlist,
          and cookies as described in our{" "}
          <a className="underline" href="/cookies">cookie policy</a>, where you can also
          find out how to manage or delete them.
        </p>

        <h2 className="text-2xl text-ink mt-2">How long we keep your data</h2>
        <p>
          Order records are kept for up to 6 years for accounting, tax and guarantee
          purposes. Marketing consents are kept until you withdraw them. You can ask us
          to delete data we no longer need at any time — see your rights below.
        </p>

        <h2 className="text-2xl text-ink mt-2">Your rights</h2>
        <p>Under UK GDPR you have the right to:</p>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>Access a copy of the personal data we hold about you.</li>
          <li>Have inaccurate data corrected.</li>
          <li>Have your data erased where we no longer need it.</li>
          <li>Restrict or object to how we process your data.</li>
          <li>Receive your data in a portable format.</li>
          <li>Withdraw consent at any time, where we rely on consent.</li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a className="underline" href={`mailto:${s.email}`}>{s.email}</a>. We will
          respond within one month.
        </p>

        <h2 className="text-2xl text-ink mt-2">Complaints</h2>
        <p>
          If you are unhappy with how we handle your data, please contact us first so we
          can put it right. You also have the right to complain to the Information
          Commissioner&apos;s Office (ICO) at{" "}
          <a className="underline" href="https://ico.org.uk" target="_blank" rel="noopener">
            ico.org.uk
          </a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The version published here is the
          current one.
        </p>

        <p className="text-[15px] text-muted">Last updated: October 2026.</p>
      </div>
    </article>
  );
}
