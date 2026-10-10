"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Order } from "@/lib/types";
import { gbp } from "@/lib/seo";
import SofaIllustration from "@/components/SofaIllustration";
import { IconCheck, IconSofa } from "@/components/Icons";

const STEPS = [
  { n: "✓", t: "Order received", d: "Your sofa is reserved. A confirmation has been sent to your email.", bg: "#2F7D4F", fg: "#FFFFFF" },
  { n: "2", t: "We confirm by phone", d: "Expect a text and a quick call to check your address and agree a slot.", bg: "#1F3A32", fg: "#F6F1EA" },
  { n: "3", t: "Packed and dispatched", d: "Your sofa leaves our warehouse. We'll message you when the driver is on the way.", bg: "#EBE3D6", fg: "#1E2421" },
  { n: "4", t: "Inspect, then pay", d: "Check your sofa at the door. Happy? Pay the driver. Not right? You can refuse delivery.", bg: "#EBE3D6", fg: "#1E2421" },
];

export default function OrderConfirmedClient() {
  const params = useSearchParams();
  const number = params.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = params.get("t");
    if (!number || !token) { setFailed(true); return; }
    fetch(`/api/orders/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setOrder(d.order))
      .catch(() => setFailed(true));
  }, [number]);

  const firstName = order?.customer.name.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-cream border-b border-line">
        <div className="mx-auto max-w-7xl px-6 py-[18px]">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Sofora home">
            <span className="w-[38px] h-[38px] rounded-full bg-forest grid place-items-center text-cream">
              <IconSofa size={20} />
            </span>
            <span className="font-serif text-[27px]">Sofora</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-14 pb-24 flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-4">
          <span className="w-[72px] h-[72px] rounded-full bg-[#DDEFE3] grid place-items-center text-[#2F7D4F]">
            <IconCheck size={34} strokeWidth={2.5} />
          </span>
          <h1 className="text-[clamp(36px,5vw,56px)] leading-tight">
            Thank you{order ? `, ${firstName}` : ""}.<br />Your order is in.
          </h1>
          {failed ? (
            <p className="text-body text-[18px] max-w-[52ch] leading-relaxed">
              We couldn&apos;t find that order. If you just placed it, it&apos;s still being saved —
              check your email or <Link href="/contact" className="underline">contact us</Link>.
            </p>
          ) : (
            <p className="text-body text-[18px] max-w-[52ch] leading-relaxed">
              Order <strong className="text-ink">#{number}</strong> is reserved. We&apos;ll text
              and call you shortly to confirm your delivery slot. Nothing to pay until it arrives.
            </p>
          )}
        </div>

        {order && (
          <div className="flex flex-wrap gap-6 items-start">
            <section className="flex-[3_1_460px] bg-white rounded-[20px] p-6 md:p-8 flex flex-col gap-1.5" aria-label="What happens next">
              <h2 className="text-[28px] mb-[18px]">What happens next</h2>
              {STEPS.map((s, i) => (
                <div key={s.t} className="flex gap-[18px]">
                  <div className="flex flex-col items-center">
                    <span
                      className="w-[34px] h-[34px] rounded-full grid place-items-center font-semibold text-sm flex-none"
                      style={{ background: s.bg, color: s.fg }}
                      aria-hidden
                    >
                      {s.n}
                    </span>
                    {i < STEPS.length - 1 && <span className="flex-1 w-[2px] bg-line my-1.5 min-h-4" aria-hidden />}
                  </div>
                  <div className="pb-5">
                    <div className="font-semibold text-[17px]">{s.t}</div>
                    <p className="text-body leading-relaxed text-[15px] mt-1">{s.d}</p>
                  </div>
                </div>
              ))}
            </section>

            <aside className="flex-[2_1_320px] flex flex-col gap-4">
              <div className="bg-forest text-cream rounded-3xl p-7 flex flex-col gap-1.5">
                <span className="label-caps text-peach!">Due on delivery</span>
                <span className="font-serif font-semibold text-[46px] leading-tight">{gbp(order.total)}.00</span>
                <p className="text-mint text-sm leading-relaxed mt-1.5">
                  Please have payment ready for the driver. Accepted: cash, card machine, bank transfer.
                </p>
              </div>
              <div className="bg-white rounded-[20px] p-6 flex flex-col gap-3.5 text-[15px]">
                {order.items.map((i) => (
                  <div key={i.productId} className="flex gap-3.5 items-center">
                    <div className="w-[72px] rounded-xl overflow-hidden flex-none">
                      <SofaIllustration type={i.type} fabric={i.fabric} bg={i.bg} className="w-full aspect-square" />
                    </div>
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-sm text-muted">Qty {i.qty}</div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-line pt-3.5">
                  <span className="label-caps">Delivering to</span>
                  <p className="mt-1.5 leading-relaxed">
                    {order.customer.name}<br />
                    {order.customer.address}, {order.customer.city} {order.customer.postcode}
                  </p>
                </div>
                {order.deliverySlot && (
                  <div className="border-t border-line pt-3.5">
                    <span className="label-caps">Requested slot</span>
                    <p className="mt-1.5">{order.deliverySlot}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link href="/sofas" className="btn btn-primary flex-1 basis-[140px]">Keep shopping</Link>
                <Link href="/contact" className="btn btn-outline flex-1 basis-[140px]">WhatsApp us</Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
