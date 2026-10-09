import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, gbp } from "@/lib/seo";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";
import { JsonLd } from "@/components/storefront";

export const metadata: Metadata = {
  title: "Delivery Information | Free UK Sofa Delivery",
  description:
    "Sofora delivery explained: free UK delivery over £500, two-person room-of-choice delivery, phone-agreed slots, and pay the driver after you inspect.",
  alternates: { canonical: absoluteUrl("/delivery") },
};

export default async function DeliveryPage() {
  const s = await getSettings();
  const paymentList = s.acceptedPayments
    .map((m) => PAYMENT_METHOD_LABELS[m].toLowerCase())
    .join(", ");

  const faqs = [
    {
      id: "delivery-cost",
      order: 1,
      q: "How much does Sofora delivery cost?",
      a: `Delivery is free on all UK orders over ${gbp(s.freeDeliveryThreshold)}. Orders below that threshold carry a flat ${gbp(29)} delivery charge.`,
    },
    {
      id: "pay-when-ordering",
      order: 2,
      q: "Do I pay anything when I order?",
      a: "No. You order online with your details only and pay nothing. Payment is due to our driver on delivery day, after you have inspected your sofa.",
    },
    {
      id: "upstairs-delivery",
      order: 3,
      q: "Will the drivers carry the sofa upstairs?",
      a: "Yes. Our two-person team delivers to your room of choice, including upstairs rooms where access allows. Tell us the floor and whether there is a lift when you order.",
    },
    {
      id: "sofa-does-not-fit",
      order: 4,
      q: "What if my sofa does not fit through the door?",
      a: "Measure your doorways, hallways and stairwells before ordering and share anything unusual with us. If access proves impossible on the day, the drivers will return the sofa and you pay nothing.",
    },
  ];

  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Delivery Information | Sofora",
            url: absoluteUrl("/delivery"),
            description: metadata.description,
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Delivery Information", url: "/delivery" },
          ]),
          faqJsonLd(faqs),
        ]}
      />
      <p className="label-caps mb-3">Delivery policy</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">
        Delivery, the Sofora way
      </h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p>
          <strong className="text-ink">Free UK delivery</strong> on all orders over{" "}
          {gbp(s.freeDeliveryThreshold)} — and you never pay a penny online. Every order is
          confirmed by phone, delivered by a <strong className="text-ink">two-person team</strong>{" "}
          to your room of choice, and you only pay the driver after you have inspected your
          sofa at the door.
        </p>

        <h2 className="text-2xl text-ink mt-2">How it works</h2>
        <ol className="list-decimal pl-6 flex flex-col gap-2">
          <li>
            <strong className="text-ink">Order online</strong> with your details only — no
            payment details are taken, ever.
          </li>
          <li>
            <strong className="text-ink">We confirm by phone.</strong> {s.confirmationCallText}
          </li>
          <li>
            <strong className="text-ink">We deliver.</strong> Our two-person team brings your
            sofa to the room of your choice at your agreed slot.
          </li>
          <li>
            <strong className="text-ink">Inspect, then pay.</strong> Check the sofa over, then
            pay the driver by {paymentList}.
          </li>
        </ol>

        <h2 className="text-2xl text-ink mt-2">Delivery charges</h2>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            Orders over {gbp(s.freeDeliveryThreshold)}: <strong className="text-ink">free</strong>{" "}
            UK mainland delivery.
          </li>
          <li>
            Orders under {gbp(s.freeDeliveryThreshold)}: a flat {gbp(29)} delivery charge.
          </li>
          <li>No hidden surcharges — the price you see at checkout is the price you pay.</li>
        </ul>

        <h2 className="text-2xl text-ink mt-2">Delivery timeframes</h2>
        <p>{s.deliveryTimeText}</p>
        <p>
          We will never dispatch your sofa without agreeing a delivery slot with you first. If
          your circumstances change, call us on{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
          and we will rearrange.
        </p>

        <h2 className="text-2xl text-ink mt-2">On delivery day</h2>
        <p>
          Please make sure someone aged 18 or over is home during your agreed slot. Our team
          will call or text when they are nearby. They will carry your sofa to the room of your
          choice, position it where you ask, and take the packaging away with them.
        </p>

        <h2 className="text-2xl text-ink mt-2">Upstairs rooms and lifts</h2>
        <p>
          The two-person team delivers upstairs and to higher floors where safe access allows,
          including buildings with lifts. At checkout, tell us which floor the sofa is going
          to, whether there is a lift, and anything the drivers should know — narrow
          stairwells, tight turns, parking restrictions or gate codes.
        </p>

        <h2 className="text-2xl text-ink mt-2">Access requirements</h2>
        <p>
          Before you order, measure your doorways, hallways and stairwells and compare them
          with the sofa&apos;s dimensions on its product page (add around 10&nbsp;cm of
          clearance for manoeuvring). If you are unsure a sofa will fit, call us on{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
          before ordering and we will advise. If access proves impossible on the day despite
          our best efforts, the sofa goes back on the van and you pay nothing.
        </p>

        <h2 className="text-2xl text-ink mt-2">Inspect before you pay</h2>
        <p>{s.refusalPolicy}</p>
        <p>
          No payment is taken online at any point — not by us, and not by the driver in
          advance. If anyone contacts you asking for payment before delivery, do not pay and
          report it to us immediately on{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">Frequently asked questions</h2>
        <div className="flex flex-col gap-4">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl bg-cream/60 p-5">
              <p className="font-semibold text-ink mb-1.5">{f.q}</p>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
