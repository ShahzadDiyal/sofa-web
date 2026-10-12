"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product, ProductReview } from "@/lib/types";
import { gbp } from "@/lib/seo";
import { useStore } from "@/lib/store";
import SofaIllustration from "./SofaIllustration";
import { IconArrowLeft, IconArrowRight, IconCash, IconHeart } from "./Icons";

export function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, isWishlisted } = useStore();
  const wished = isWishlisted(product.id);

  return (
    <div className="flex flex-col gap-3 group">
      <div className="rounded-[18px] overflow-hidden relative">
        <Link href={`/sofas/${product.slug}`} aria-label={product.name}>
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-full aspect-square object-cover group-hover:scale-[1.02] transition-transform" loading="lazy" />
          ) : (
            <SofaIllustration
              type={product.type}
              fabric={product.fabric}
              bg={product.bg}
              accent={product.accent}
              title={product.name}
              className="w-full aspect-square group-hover:scale-[1.02] transition-transform"
            />
          )}
        </Link>
        {product.tag && (
          <span
            className="absolute left-3 top-3 px-2.5 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{
              background: product.tag.toLowerCase().startsWith("save") ? "#B65A35" : product.tag === "New" ? "#fff" : "#1F3A32",
              color: product.tag === "New" ? "#1E2421" : "#fff",
            }}
          >
            {product.tag}
          </span>
        )}
        <button
          className="absolute right-3 top-3 w-[38px] h-[38px] rounded-full bg-white grid place-items-center shadow-sm hover:scale-105 transition-transform"
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          onClick={() => toggleWishlist(product.id)}
        >
          <span className={wished ? "text-terra" : "text-ink"}>
            <IconHeart size={19} filled={wished} />
          </span>
        </button>
      </div>
      <div>
        <Link href={`/sofas/${product.slug}`} className="font-medium text-[17px] hover:opacity-70">
          {product.name}
        </Link>
        <p className="text-muted text-sm mt-0.5">{product.sub}</p>
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif font-semibold text-[22px]">{gbp(product.price)}</span>
        {product.wasPrice && (
          <span className="text-muted text-sm line-through">{gbp(product.wasPrice)}</span>
        )}
      </div>
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-forest">
        <IconCash size={15} /> Pay on delivery
      </span>
    </div>
  );
}

export function Breadcrumbs({ trail }: { trail: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap gap-2 items-center">
        {trail.map((t, i) => (
          <li key={t.name} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {t.href && i < trail.length - 1 ? (
              <Link href={t.href} className="hover:text-ink hover:underline">{t.name}</Link>
            ) : (
              <span aria-current="page" className="text-ink font-medium">{t.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function FaqAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div>
      {faqs.map((f) => (
        <details key={f.q} className="faq">
          <summary>
            {f.q}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <p className="faq-answer">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/**
 * Homepage reviews carousel: 9 real product reviews, 3 visible per view
 * on desktop (2 on tablet, 1 on mobile). Prev/Next page through them;
 * on the last page a "View all reviews" button appears.
 */
function usePerView() {
  const [perView, setPerView] = useState(3);
  useEffect(() => {
    const sm = window.matchMedia("(max-width: 639px)");
    const md = window.matchMedia("(max-width: 1023px)");
    const update = () => setPerView(sm.matches ? 1 : md.matches ? 2 : 3);
    update();
    sm.addEventListener("change", update);
    md.addEventListener("change", update);
    return () => {
      sm.removeEventListener("change", update);
      md.removeEventListener("change", update);
    };
  }, []);
  return perView;
}

export function ReviewsCarousel({ reviews }: { reviews: ProductReview[] }) {
  const perView = usePerView();
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(reviews.length / perView));
  const safePage = Math.min(page, pageCount - 1);
  const visible = reviews.slice(safePage * perView, safePage * perView + perView);
  const isLast = safePage >= pageCount - 1;

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => (
          <figure
            key={r.id}
            className="m-0 bg-white rounded-[22px] p-7 flex flex-col gap-4"
          >
            <span className="text-terra tracking-[3px] text-[18px]" aria-label={`${r.rating} out of 5 stars`}>
              {"★".repeat(r.rating)}
            </span>
            {r.title && <strong className="text-[16px] leading-snug">{r.title}</strong>}
            <blockquote className="m-0 leading-relaxed text-[16px]">“{r.body}”</blockquote>
            <figcaption className="text-sm text-muted mt-auto">
              {r.author}{r.location ? `, ${r.location}` : ""}
              {r.productSlug && r.productName && (
                <>
                  {" "}on{" "}
                  <Link href={`/sofas/${r.productSlug}`} className="underline hover:text-ink">
                    {r.productName}
                  </Link>
                </>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-8">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
          className="btn btn-outline disabled:opacity-40"
          aria-label="Previous reviews"
        >
          <IconArrowLeft size={18} /> Prev
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={isLast}
          className="btn btn-outline disabled:opacity-40"
          aria-label="Next reviews"
        >
          Next <IconArrowRight size={18} />
        </button>
        {isLast && (
          <Link href="/reviews" className="btn btn-primary">
            View all reviews
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Homepage FAQ preview: shows 5 FAQs, reveals 5 more per click,
 * and links to the full FAQ page.
 */
export function FaqPreview({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [visible, setVisible] = useState(5);
  return (
    <div>
      <FaqAccordion faqs={faqs.slice(0, visible)} />
      <div className="flex flex-wrap gap-3 mt-7">
        {visible < faqs.length && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + 5)}
            className="btn btn-outline"
          >
            Show more
          </button>
        )}
        <Link href="/faqs" className="btn btn-outline">
          View all FAQs
        </Link>
      </div>
    </div>
  );
}

/** Inject JSON-LD structured data (SEO/AEO/GEO). */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/* Star rating display: filled stars for the rating, muted for the rest. */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span
      className="inline-flex gap-[2px] text-terra"
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden className={i <= full ? "" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}
