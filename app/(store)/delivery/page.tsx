import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl, gbp } from "@/lib/seo";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "Delivery policy — pay on delivery",
  description:
    "How Sofora delivery works: free UK delivery over £500, two-person team, slot agreed by phone, and you pay the driver on arrival.",
  alternates: { canonical: absoluteUrl("/delivery") },
};

export default async function DeliveryPage() {
  const s = await getSettings();
  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <p className="label-caps mb-3">Delivery policy</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">Delivery, the Sofora way</h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p>
          <strong className="text-ink">Free UK delivery</strong> on all orders over {gbp(s.freeDeliveryThreshold)}
          {" "}(£29 below that). Every sofa is delivered by a <strong className="text-ink">two-person team</strong>{" "}
          to your room of choice.
        </p>
        <h2 className="text-2xl text-ink mt-2">How it works</h2>
        <ol className="list-decimal pl-6 flex flex-col gap-2">
          <li>You order online with your details only — nothing to pay.</li>
          <li>{s.confirmationCallText}</li>
          <li>Our two-person team delivers your sofa to the room of your choice.</li>
          <li>You inspect the sofa, then pay the driver: {s.acceptedPayments.map((m) => PAYMENT_METHOD_LABELS[m].toLowerCase()).join(", ")}.</li>
        </ol>
        <h2 className="text-2xl text-ink mt-2">Delivery times</h2>
        <p>{s.deliveryTimeText}</p>
        <h2 className="text-2xl text-ink mt-2">Inspect before you pay</h2>
        <p>{s.refusalPolicy}</p>
        <h2 className="text-2xl text-ink mt-2">Access</h2>
        <p>
          At checkout, tell us which floor the sofa is going to and whether there&apos;s a lift, plus
          anything the drivers should know (narrow hallways, parking, gate codes). If you&apos;re unsure
          a sofa will fit, measure your doorways first — our team can advise on{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>.
        </p>
      </div>
    </article>
  );
}
