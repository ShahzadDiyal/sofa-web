"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { gbp } from "@/lib/seo";
import { useStore } from "@/lib/store";
import SofaIllustration from "./SofaIllustration";
import { IconCash, IconHeart } from "./Icons";

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
