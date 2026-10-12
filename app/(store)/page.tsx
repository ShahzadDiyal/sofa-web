import type { Metadata } from "next";
import Link from "next/link";
import { getActiveFlashSale, getSettings, listCategories, listFaqs, listProductReviews, listProducts } from "@/lib/db";
import FlashSaleBanner from "@/components/FlashSaleBanner";
import { seedSteps, seedWhy } from "@/lib/seed";
import { absoluteUrl, defaultOgImage, gbp, itemListJsonLd, SITE_TAGLINE } from "@/lib/seo";
import SofaIllustration from "@/components/SofaIllustration";
import { FaqPreview, JsonLd, ProductCard, ReviewsCarousel } from "@/components/storefront";
import { IconArrowRight, IconCash, IconCheck, IconPackage, IconPhone, IconShield, IconTruck } from "@/components/Icons";

export const metadata: Metadata = {
  title: `Sofora — ${SITE_TAGLINE}`,
  description:
    "Handcrafted sofas delivered across the UK. Nothing to pay online — inspect your sofa at the door and pay the driver only when you love it.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: `Sofora — ${SITE_TAGLINE}`,
    description:
      "Handcrafted sofas delivered across the UK. Nothing to pay online — pay on delivery.",
    url: absoluteUrl("/"),
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    images: [defaultOgImage.url],
  },
};

/* Homepage renders on every request: data stays live with the database
   and the "More to explore" picks reshuffle on each load. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, categories, faqs, productReviews, settings, flashSale] = await Promise.all([
    listProducts(),
    listCategories(),
    listFaqs(),
    listProductReviews(),
    getSettings(),
    getActiveFlashSale(),
  ]);
  const homeReviews = productReviews.slice(0, 9);
  const inStock = products.filter((p) => p.inStock);
  const featured = inStock.filter((p) => p.featured).slice(0, 4);
  const bestsellers = featured.length > 0 ? featured : inStock.slice(0, 4);
  const heroProducts = bestsellers.filter((p) => p.imageUrl).slice(0, 4);
  /* ~20 random in-stock products per load, excluding the bestsellers above. */
  const bestsellerIds = new Set(bestsellers.map((p) => p.id));
  const randomPicks = [...inStock]
    .filter((p) => !bestsellerIds.has(p.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));

  return (
    <>
      <JsonLd data={itemListJsonLd(bestsellers, "Bestselling sofas at Sofora", "/")} />

      {/* ── Hero ── */}
      <section className="mx-auto px-6 pt-14 pb-20 flex flex-wrap gap-12 items-center">
        <div className="flex-1 basis-[460px] flex flex-col gap-7">
          <span className="self-start inline-flex items-center gap-2 bg-mint text-forest rounded-full px-3.5 py-1.5 text-sm font-medium">
            <IconCash size={16} /> Cash on delivery across the UK
          </span>
          <h1 className="text-[clamp(44px,6.2vw,80px)] leading-[1.02]">
            Sofas worth coming home to.
          </h1>
          <p className="text-[19px] leading-relaxed text-body max-w-[46ch]">
            Handcrafted sofas delivered to your door. Check the fabric, the fit and the finish
            in person — and only pay once you love it.
          </p>
          <div className="flex gap-3.5 flex-wrap">
            <Link href="/sofas" className="btn btn-primary">
              Shop all sofas
            </Link>
            <Link href="#how" className="btn btn-outline">
              How pay on delivery works
            </Link>
          </div>
          <div className="flex gap-7 flex-wrap pt-2 text-sm font-medium text-forest">
            <span className="flex items-center gap-2">
              <IconTruck size={20} /> Free UK delivery
            </span>
            <span className="flex items-center gap-2">
              <IconShield size={20} /> 5-year frame guarantee
            </span>
            <span className="flex items-center gap-2">
              <IconPhone size={20} /> Confirmation call before dispatch
            </span>
          </div>
        </div>
        <div className="flex-1 basis-[480px] relative">
          <div className="rounded-[32px] overflow-hidden">
            {heroProducts.length > 0 ? (
              <img
                src={heroProducts[0].imageUrl}
                alt={heroProducts[0].name}
                className="w-full aspect-[1/1.05] object-cover"
                loading="eager"
              />
            ) : (
              <SofaIllustration
                type="three"
                fabric="#C9824F"
                bg="#DCE5DA"
                accent="#F4E1D6"
                title="Illustration of a Sofora three-seater sofa in terracotta weave"
                className="w-full aspect-[1/1.05]"
              />
            )}
          </div>
          <div className="absolute -left-3 bottom-7 bg-white rounded-[18px] px-5 py-4 flex gap-3.5 items-center shadow-[0_12px_32px_rgba(30,36,33,0.12)]">
            <span className="w-11 h-11 rounded-full bg-mint grid place-items-center text-forest">
              <IconCash size={22} />
            </span>
            <div>
              <div className="font-semibold text-[15px]">Pay when it arrives</div>
              <div className="text-[13px] text-muted mt-0.5">Cash or card to the driver</div>
            </div>
          </div>
        </div>
      </section>

      {flashSale && (
        <div className="px-6 pt-10">
          <FlashSaleBanner sale={flashSale} />
        </div>
      )}

      {/* ── How it works ── */}
      <section id="how" className="bg-forest text-cream scroll-mt-20">
        <div className="mx-auto px-6 py-[88px]">
          <div className="flex flex-wrap justify-between items-end gap-5 mb-12">
            <div className="flex flex-col gap-3">
              <span className="label-caps text-peach!">How it works</span>
              <h2 className="text-[clamp(34px,4vw,48px)] leading-tight max-w-[18ch]">
                You pay after you&apos;ve seen it. Not before.
              </h2>
            </div>
            <p className="max-w-[42ch] text-sand leading-relaxed">
              No card details online. We confirm by phone, deliver with a two-person team,
              and you pay the driver once you&apos;re happy.
            </p>
          </div>
          <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 list-none p-0 m-0">
            {seedSteps.map((s) => (
              <li
                key={s.n}
                className="bg-forest-deep rounded-[22px] p-7 flex flex-col gap-3.5"
              >
                <span className="font-serif text-[40px] text-peach leading-none">{s.n}</span>
                <h3 className="text-[22px] leading-snug">{s.t}</h3>
                <p className="text-mint leading-relaxed text-[15px]">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Shop by style ── */}
      <section className="mx-auto px-6 py-24">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-9">
          <h2 className="text-[clamp(32px,3.6vw,44px)]">Shop by style</h2>
          <Link
            href="/sofas"
            className="font-semibold border-b-[1.5px] border-ink pb-0.5 hover:opacity-70"
          >
            View every sofa
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/sofas?category=${c.slug}`}
              className="flex flex-col gap-3 group"
            >
              <div className="rounded-[18px] overflow-hidden">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt={`${c.name}`}
                    loading="lazy"
                    className="w-full aspect-[1/1.1] object-cover group-hover:scale-[1.03] transition-transform"
                  />
                ) : (
                  <SofaIllustration
                    type={c.type}
                    fabric={c.fabric}
                    bg={c.bg}
                    title={`${c.name} illustration`}
                    className="w-full aspect-[1/1.1] group-hover:scale-[1.03] transition-transform"
                  />
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-[17px] capitalize">{c.name}</span>
                <IconArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bestsellers ── */}
      <section className="bg-sand">
        <div className="mx-auto px-6 py-24">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-9">
            <div className="flex flex-col gap-2.5">
              <span className="label-caps">Bestsellers</span>
              <h2 className="text-[clamp(32px,3.6vw,44px)]">Made for real living rooms</h2>
            </div>
            <Link href="/sofas" className="btn btn-outline">
              See all sofas
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── More to explore: ~20 random products, reshuffled every load ── */}
      {randomPicks.length > 0 && (
        <section className="mx-auto px-6 py-24">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-9">
            <div className="flex flex-col gap-2.5">
              <span className="label-caps">More to explore</span>
              <h2 className="text-[clamp(32px,3.6vw,44px)]">Fresh picks, every visit</h2>
            </div>
            <Link href="/sofas" className="btn btn-outline">
              See all sofas
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {randomPicks.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Why choose us ── */}
      <section className="mx-auto px-6 py-24">
        <div className="flex flex-col gap-2.5 mb-12">
          <span className="label-caps">Why choose us</span>
          <h2 className="text-[clamp(32px,3.6vw,44px)]">Sofa buying without the risk</h2>
        </div>
        <div className="grid gap-12 md:grid-cols-3">
          {seedWhy.map((w) => (
            <div key={w.t} className="flex flex-col gap-3.5 border-t-2 border-ink pt-6">
              <h3 className="text-[26px] leading-snug">{w.t}</h3>
              <p className="text-body leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Our services ── */}
      <section className="bg-sand">
        <div className="mx-auto px-6 py-24">
          <div className="flex flex-col gap-2.5 mb-12">
            <span className="label-caps">Our services</span>
            <h2 className="text-[clamp(32px,3.6vw,44px)]">Everything handled, door to door</h2>
            <p className="text-body leading-relaxed max-w-[60ch]">
              From the moment you order to the moment your sofa is in place, every step is
              handled by our own team — with nothing to pay until you&apos;re happy.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: IconCash,
                t: "Cash on delivery furniture",
                d: "Order any sofa online with just your details — no card, no deposit. Pay the driver by cash, card or bank transfer only after you've inspected it at your door.",
              },
              {
                Icon: IconTruck,
                t: "Free UK delivery",
                d: `Free delivery across the UK on orders over ${gbp(settings.freeDeliveryThreshold)}, handled by our own two-person team — never left at the kerbside.`,
              },
              {
                Icon: IconPackage,
                t: "Room-of-choice delivery",
                d: "We carry your sofa to the room you want it in — including upstairs where access allows — on a day and time agreed with you in advance.",
              },
              {
                Icon: IconPhone,
                t: "Confirmation call",
                d: "A real person calls you before dispatch to confirm your order details and agree a delivery slot that suits your week.",
              },
              {
                Icon: IconCheck,
                t: "14-day returns",
                d: "Don't love it at the door? Refuse delivery and pay nothing. After delivery, you still have 14 days to change your mind.",
              },
              {
                Icon: IconShield,
                t: "5-year frame guarantee",
                d: "Solid hardwood frames built for busy family life, backed by a 5-year guarantee for complete peace of mind.",
              },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="bg-white rounded-[22px] p-7 flex flex-col gap-4">
                <span className="w-12 h-12 rounded-full bg-mint grid place-items-center text-forest">
                  <Icon size={24} />
                </span>
                <h3 className="text-[22px] leading-snug">{t}</h3>
                <p className="text-body leading-relaxed text-[15px]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews: only rendered when real reviews exist ── */}
      {homeReviews.length > 0 && (
      <section className="bg-peach">
        <div className="mx-auto px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-9">
            <div className="flex flex-col gap-2.5">
              <span className="label-caps text-terra!">Customer reviews</span>
              <h2 className="text-[clamp(32px,3.6vw,44px)]">
                What our customers say
              </h2>
            </div>
            <Link href="/reviews" className="btn btn-outline">
              View all reviews
            </Link>
          </div>
          <ReviewsCarousel reviews={homeReviews} />
        </div>
      </section>
      )}

      {/* ── FAQ ── */}
      <section className="mx-auto px-6 py-24 flex flex-wrap gap-14">
        <div className="flex-1 basis-[320px] flex flex-col gap-3.5">
          <span className="label-caps">Questions</span>
          <h2 className="text-[clamp(32px,3.6vw,44px)] leading-tight">
            Pay on delivery, explained
          </h2>
          <p className="text-body leading-relaxed max-w-[36ch]">
            Still unsure? Message us on WhatsApp and we&apos;ll walk you through it.
          </p>
          <a
            href={`https://wa.me/${settings.phone.replace(/[^0-9]/g, "")}`}
            className="btn btn-outline self-start"
          >
            WhatsApp us
          </a>
        </div>
        <div className="flex-[2_1_520px]">
          <FaqPreview faqs={faqs} />
        </div>
      </section>
    </>
  );
}
