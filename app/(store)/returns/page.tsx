import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/storefront";

export const metadata: Metadata = {
  title: "Returns & Refunds | 14-Day Returns",
  description:
    "Sofora returns: refuse at the door and pay nothing, a 14-day right to cancel after delivery, free collection, bank-transfer refunds and a 5-year guarantee.",
  alternates: { canonical: absoluteUrl("/returns") },
};

export default async function ReturnsPage() {
  const s = await getSettings();

  const faqs = [
    {
      id: "refuse-at-door",
      order: 1,
      q: "Can I refuse the sofa when it arrives?",
      a: "Yes. Inspect your sofa at the door before paying. If it is not right for any reason, refuse delivery and you pay nothing — no forms, no fees.",
    },
    {
      id: "cancel-window",
      order: 2,
      q: "How long do I have to change my mind after delivery?",
      a: "You have 14 days from the day after delivery to cancel under the Consumer Contracts Regulations 2013. Contact us and we will arrange collection.",
    },
    {
      id: "cod-refund-method",
      order: 3,
      q: "How will I be refunded if I paid cash on delivery?",
      a: "Refunds are paid by bank transfer within 14 days of us collecting (or receiving) the returned sofa. We will ask for your account details when you request the return.",
    },
    {
      id: "return-collection-cost",
      order: 4,
      q: "Who pays for return collection?",
      a: "We arrange and cover collection for cancellations within the 14-day window and for any faulty goods. You only need to make the sofa accessible for our team.",
    },
  ];

  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Returns & Refunds | Sofora",
            url: absoluteUrl("/returns"),
            description: metadata.description,
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Returns & Refunds", url: "/returns" },
          ]),
          faqJsonLd(faqs),
        ]}
      />
      <p className="label-caps mb-3">Returns &amp; refunds</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">
        Changed your mind? No problem.
      </h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p>
          Because you pay only after inspecting your sofa, most doubts are settled at the
          door. And if anything changes after delivery, you are protected by a{" "}
          <strong className="text-ink">14-day right to cancel</strong>, free collection, and
          our <strong className="text-ink">5-year guarantee</strong> against manufacturing
          faults.
        </p>

        <h2 className="text-2xl text-ink mt-2">Refuse at the door</h2>
        <p>{s.refusalPolicy}</p>
        <p>
          There are no forms to fill in and no fees. The drivers simply take the sofa back,
          your order is marked as refused, and that is the end of it.
        </p>

        <h2 className="text-2xl text-ink mt-2">14-day right to cancel</h2>
        <p>
          Under the Consumer Contracts (Information, Cancellation and Additional Charges)
          Regulations 2013, you may cancel your order within 14 days starting the day after
          delivery, for any reason. Our standard range is made to stock specifications — it
          is not custom or made-to-measure — so the full 14-day right applies to every sofa
          we sell.
        </p>

        <h2 className="text-2xl text-ink mt-2">How to request a return</h2>
        <ol className="list-decimal pl-6 flex flex-col gap-2">
          <li>
            Contact us within 14 days of delivery on{" "}
            <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
            or <a className="underline" href={`mailto:${s.email}`}>{s.email}</a> with your
            order number.
          </li>
          <li>Keep the sofa in the condition it was delivered in, as far as reasonable.</li>
          <li>
            We will agree a collection slot with you by phone — collection is arranged and
            paid for by us.
          </li>
          <li>
            Once collected, your refund is processed by bank transfer within 14 days. We
            will ask for your account details when you request the return.
          </li>
        </ol>

        <h2 className="text-2xl text-ink mt-2">Refunds on cash-on-delivery orders</h2>
        <p>
          Because you pay the driver rather than paying online, refunds cannot go back to a
          card automatically. Every refund is paid by{" "}
          <strong className="text-ink">bank transfer within 14 days</strong> of collection,
          in line with consumer law. You will receive confirmation by text or email once the
          transfer is made.
        </p>

        <h2 className="text-2xl text-ink mt-2">Faulty goods</h2>
        <p>
          If a fault appears, tell us as soon as reasonably possible with photos of the
          problem. Under the Consumer Rights Act 2015, goods must be of satisfactory
          quality, fit for purpose and as described. Where the fault is ours, we will arrange
          an inspection and then repair, replace or refund — including collection at our
          cost. Your statutory rights are never affected by this policy.
        </p>

        <h2 className="text-2xl text-ink mt-2">5-year guarantee</h2>
        <p>
          Many of our ranges carry a 5-year guarantee on the frame and structure against
          manufacturing faults, as stated on each product page. To make a guarantee claim,
          contact us with your order number and photos of the issue. We will assess the
          claim and, where it is covered, arrange a repair, replacement or refund. The
          guarantee sits alongside — never instead of — your statutory rights.
        </p>

        <h2 className="text-2xl text-ink mt-2">Exceptions</h2>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            The 14-day cancellation right does not apply to goods made to your personal
            specification. Our standard range is not custom, so this exception does not
            apply to anything we currently sell.
          </li>
          <li>
            We may deduct from your refund if the sofa shows diminished value from handling
            beyond what is necessary to inspect it — normal &ldquo;trying it out&rdquo;
            handling is always fine.
          </li>
        </ul>

        <h2 className="text-2xl text-ink mt-2">Frequently asked questions</h2>
        <div className="flex flex-col gap-4">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl bg-cream/60 p-5">
              <p className="font-semibold text-ink mb-1.5">{f.q}</p>
              <p>{f.a}</p>
            </div>
          ))}
        </div>

        <p>
          To start a return or report a fault:{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
          or <a className="underline" href={`mailto:${s.email}`}>{s.email}</a>.
        </p>
      </div>
    </article>
  );
}
