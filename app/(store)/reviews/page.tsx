import type { Metadata } from "next";
import Link from "next/link";
import { listProductReviews } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { Stars } from "@/components/storefront";
import type { ProductReview } from "@/lib/types";

export const metadata: Metadata = {
  title: "Customer reviews",
  description:
    "What Sofora shoppers say about comfort, quality and pay-on-delivery — ratings across the sofa range.",
  alternates: { canonical: absoluteUrl("/reviews") },
};

const PER_PAGE = 12;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="bg-white rounded-[20px] p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Stars rating={review.rating} />
      </div>
      {review.title && <h3 className="font-semibold text-[17px] leading-snug">{review.title}</h3>}
      <p className="text-body text-[15px] leading-relaxed">{review.body}</p>
      <div className="mt-auto pt-2 border-t border-line flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-muted">
          <span className="font-semibold text-ink">{review.author}</span>
          {review.location ? ` · ${review.location}` : ""} · {fmtDate(review.createdAt)}
        </p>
        <Link
          href={`/sofas/${review.productSlug}`}
          className="text-[13px] font-semibold text-forest underline underline-offset-2 hover:text-ink"
        >
          {review.productName} →
        </Link>
      </div>
    </article>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const all = await listProductReviews();
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const current = Math.max(1, Math.min(totalPages, Number(page) || 1));
  const reviews = all.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const avg = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    n: all.filter((r) => r.rating === s).length,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 pt-12 pb-24">
      <p className="label-caps mb-3">Reviews</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-4">What our customers say</h1>
      <div className="flex items-center gap-4 flex-wrap mb-10">
        <Stars rating={avg} size={22} />
        <p className="text-body text-[17px]">
          <strong className="text-ink">{avg.toFixed(1)}</strong> out of 5 from{" "}
          <strong className="text-ink">{all.length}</strong> reviews
        </p>
      </div>

      <div className="flex gap-2.5 flex-wrap mb-10" aria-label="Rating breakdown">
        {dist.map((d) => (
          <span key={d.stars} className="bg-white rounded-full px-4 py-2 text-[14px] font-medium">
            {d.stars}★ · {d.n}
          </span>
        ))}
      </div>

      {reviews.length === 0 ? (
        <p className="text-body text-[17px]">No reviews yet — check back soon.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-12 flex-wrap" aria-label="Review pages">
          {current > 1 && (
            <Link
              href={`/reviews?page=${current - 1}`}
              className="min-h-[44px] px-5 inline-flex items-center rounded-full border-[1.5px] border-line font-semibold text-[15px] hover:border-ink"
            >
              ← Newer
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - current) <= 2)
            .map((p, i, arr) => (
              <span key={p} className="inline-flex items-center gap-2">
                {i > 0 && arr[i - 1] !== p - 1 && <span className="text-muted">…</span>}
                <Link
                  href={`/reviews?page=${p}`}
                  aria-current={p === current ? "page" : undefined}
                  className={`w-11 h-11 inline-flex items-center justify-center rounded-full font-semibold text-[15px] ${
                    p === current ? "bg-forest text-cream" : "border-[1.5px] border-line hover:border-ink"
                  }`}
                >
                  {p}
                </Link>
              </span>
            ))}
          {current < totalPages && (
            <Link
              href={`/reviews?page=${current + 1}`}
              className="min-h-[44px] px-5 inline-flex items-center rounded-full border-[1.5px] border-line font-semibold text-[15px] hover:border-ink"
            >
              Older →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
