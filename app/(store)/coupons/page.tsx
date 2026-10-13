import type { Metadata } from "next";
import Link from "next/link";
import { flashSaleTargets, getActiveFlashSales, listActiveCoupons, listProducts } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs, JsonLd } from "@/components/storefront";
import FlashSaleRenderer from "@/components/FlashSaleRenderer";
import { IconCash, IconCheck, IconShield, IconTruck } from "@/components/Icons";
import CopyCodeButton from "./CopyCodeButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discount codes & sofa offers | Sofora",
  description:
    "Live Sofora discount codes and flash sofa offers for UK shoppers. Copy a code, apply it at checkout, and pay the driver on delivery — nothing to pay online.",
  alternates: { canonical: absoluteUrl("/coupons") },
  openGraph: {
    title: "Discount codes & sofa offers | Sofora",
    description:
      "Live Sofora discount codes and flash sofa offers. Apply at checkout and pay on delivery.",
    url: absoluteUrl("/coupons"),
    type: "website",
  },
};

const FAQS = [
  {
    q: "How do I use a Sofora discount code?",
    a: "Add sofas to your basket and head to checkout. If a code applies to your sofas, you'll see the coupon field — enter the code and the discount comes off your total before you pay.",
  },
  {
    q: "Can I use more than one code per order?",
    a: "One discount code per order. If you have two codes, place separate orders or pick the one that saves you more.",
  },
  {
    q: "Do discount codes work with cash on delivery?",
    a: "Yes. The discount reduces your order total, and you pay the reduced amount to the driver by cash or card after inspecting your sofa.",
  },
  {
    q: "Why isn't my code working?",
    a: "Codes expire, some need a minimum order, and some only apply to specific sofas. The checkout tells you exactly why a code didn't apply.",
  },
  {
    q: "Where do I find new codes?",
    a: "Right here — this page always shows the codes that are live now. We also announce flash offers on the homepage.",
  },
];

function discountLabel(type: "percent" | "fixed", value: number) {
  return type === "percent" ? `${value}% off` : `£${value} off`;
}

export default async function CouponsPage() {
  const [coupons, sales, products] = await Promise.all([
    listActiveCoupons(),
    getActiveFlashSales(),
    listProducts(),
  ]);
  const couponSales = sales.filter((s) => flashSaleTargets(s, "coupons"));
  const productById = new Map(products.map((p) => [p.id, p]));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Sofora discount codes & sofa offers",
          url: absoluteUrl("/coupons"),
          description: "Live Sofora discount codes and flash sofa offers for UK shoppers.",
          mainEntity: {
            "@type": "ItemList",
            name: "Live discount codes",
            itemListElement: coupons.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `Code ${c.code}: ${discountLabel(c.type, c.value)}`,
              description: [
                c.minSubtotal ? `Minimum order £${c.minSubtotal}.` : null,
                (c.productIds?.length ?? 0) > 0 ? "Valid on selected sofas." : "Valid on all sofas.",
                c.endsAt ? `Ends ${new Date(c.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` : null,
              ]
                .filter(Boolean)
                .join(" "),
            })),
          },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Discount codes", url: "/coupons" },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS.map((f, i) => ({ id: `coupon-faq-${i}`, q: f.q, a: f.a, order: i })))} />

      <div className="mx-auto px-6 pt-7">
        <Breadcrumbs trail={[{ name: "Home", href: "/uk/" }, { name: "Discount codes" }]} />
      </div>

      {/* Header */}
      <section className="mx-auto px-6 pt-8 pb-10 max-w-[1100px]">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-terra">Savings</p>
        <h1 className="text-[clamp(34px,5vw,56px)] leading-tight mt-2">Discount codes &amp; sofa offers</h1>
        <p className="text-muted text-[17px] mt-4 max-w-[680px]">
          Every code below is live right now. Copy one, apply it at checkout, and pay the
          reduced total to the driver when your sofa arrives — nothing to pay online, ever.
        </p>
        <div className="flex gap-6 flex-wrap mt-6 text-[14px] text-muted">
          <span className="inline-flex items-center gap-2"><IconCash size={17} /> Pay on delivery</span>
          <span className="inline-flex items-center gap-2"><IconTruck size={17} /> Free UK delivery over £500</span>
          <span className="inline-flex items-center gap-2"><IconShield size={17} /> Inspect before you pay</span>
        </div>
      </section>

      {/* Coupon cards */}
      <section className="mx-auto px-6 pb-12 max-w-[1100px]" aria-label="Live discount codes">
        {coupons.length === 0 ? (
          <div className="rounded-[24px] border-[1.5px] border-dashed border-line p-10 text-center">
            <p className="text-[18px] font-semibold">No codes live right now</p>
            <p className="text-muted text-[15px] mt-2">Check back soon — new offers land here first.</p>
            <Link href="/uk/sofas" className="inline-flex mt-5 min-h-[48px] items-center px-7 rounded-full bg-forest text-cream font-semibold text-[15px]">
              Shop sofas
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {coupons.map((c) => {
              const scoped = (c.productIds?.length ?? 0) > 0;
              const scopedProducts = scoped
                ? (c.productIds ?? []).map((id) => productById.get(id)).filter(Boolean)
                : [];
              return (
                <article key={c.id} className="rounded-[24px] bg-white border border-line p-6 sm:p-7 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-terra">{discountLabel(c.type, c.value)}</p>
                      <p className="font-mono font-bold text-[26px] tracking-wider mt-1">{c.code}</p>
                    </div>
                    <CopyCodeButton code={c.code} />
                  </div>
                  <ul className="text-[14px] text-muted flex flex-col gap-1.5">
                    {c.minSubtotal ? (
                      <li className="inline-flex items-center gap-2"><IconCheck size={15} /> Minimum order £{c.minSubtotal}</li>
                    ) : null}
                    <li className="inline-flex items-center gap-2">
                      <IconCheck size={15} />
                      {scoped ? (
                        <span>
                          Valid on:{" "}
                          {scopedProducts.length > 0
                            ? scopedProducts.map((p, i) => (
                                <span key={p!.id}>
                                  {i > 0 && ", "}
                                  <Link href={`/uk/sofas/${p!.slug}`} className="underline underline-offset-2 hover:text-ink">
                                    {p!.name}
                                  </Link>
                                </span>
                              ))
                            : "selected sofas"}
                        </span>
                      ) : (
                        "Valid on all sofas"
                      )}
                    </li>
                    {c.endsAt ? (
                      <li className="inline-flex items-center gap-2">
                        <IconCheck size={15} /> Ends {new Date(c.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </li>
                    ) : null}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Flash offers */}
      {couponSales.length > 0 && (
        <section className="mx-auto px-6 pb-12 max-w-[1100px] flex flex-col gap-6" aria-label="Flash offers">
          <h2 className="text-[clamp(26px,3.5vw,38px)]">Flash offers</h2>
          {couponSales.filter((s) => (s.displayMode || "inline") === "inline").map((s) => (
            <FlashSaleRenderer key={s.id} sale={s} />
          ))}
          {couponSales.filter((s) => s.displayMode === "popup").map((s) => (
            <FlashSaleRenderer key={s.id} sale={s} />
          ))}
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto px-6 pb-12 max-w-[1100px]">
        <h2 className="text-[clamp(26px,3.5vw,38px)] mb-6">How to use a code</h2>
        <ol className="grid sm:grid-cols-3 gap-5">
          {[
            { n: "1", t: "Copy a code", d: "Tap “Copy code” on any offer above — it lands on your clipboard." },
            { n: "2", t: "Apply at checkout", d: "The coupon field appears when your basket holds a sofa the code applies to." },
            { n: "3", t: "Pay less on delivery", d: "Your total drops straight away. Pay the driver after you've inspected your sofa." },
          ].map((s) => (
            <li key={s.n} className="rounded-[24px] bg-white border border-line p-6">
              <span className="grid place-items-center w-11 h-11 rounded-full bg-forest text-cream font-bold text-[18px]">{s.n}</span>
              <p className="font-semibold text-[17px] mt-4">{s.t}</p>
              <p className="text-muted text-[14px] mt-1.5">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="mx-auto px-6 pb-16 max-w-[860px]">
        <h2 className="text-[clamp(26px,3.5vw,38px)] mb-6">Discount code questions</h2>
        <div className="flex flex-col gap-4">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-[20px] bg-white border border-line px-6 py-5 group">
              <summary className="font-semibold text-[16px] cursor-pointer list-none flex justify-between items-center gap-4">
                {f.q}
                <span className="text-muted group-open:rotate-45 transition-transform text-[22px] leading-none">+</span>
              </summary>
              <p className="text-muted text-[15px] mt-3">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/uk/sofas" className="inline-flex min-h-[52px] items-center px-9 rounded-full bg-forest text-cream font-semibold text-[16px]">
            Shop sofas
          </Link>
        </div>
      </section>
    </>
  );
}
