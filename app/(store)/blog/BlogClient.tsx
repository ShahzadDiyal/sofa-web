"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import SofaIllustration from "@/components/SofaIllustration";
import { IconClock, IconSearch } from "@/components/Icons";
import type { Post } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_2px_16px_rgba(46,60,51,0.07)] transition hover:-translate-y-1 hover:shadow-[0_10px_32px_rgba(46,60,51,0.12)]"
    >
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${post.coverColor ?? "#EFE8DC"} 0%, #F8F5EE 100%)` }}
      >
        <SofaIllustration
          type="three"
          fabric={post.coverColor ?? "#D8CBB4"}
          bg={post.coverColor ?? "#EFE8DC"}
          title={post.title}
          className="absolute inset-0 m-auto h-[85%] w-[85%] transition duration-300 group-hover:scale-[1.04]"
        />
        {post.tags[0] && (
          <span className="absolute left-4 top-4 rounded-full bg-ink/70 px-3 py-1 text-[12px] font-semibold text-cream backdrop-blur">
            {post.tags[0]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h2 className="text-[19px] font-semibold leading-snug text-ink group-hover:text-forest">
          {post.title}
        </h2>
        <p className="text-[14.5px] leading-relaxed text-muted line-clamp-3">{post.excerpt}</p>
        <p className="mt-auto flex items-center gap-2 pt-2 text-[13px] text-muted">
          <IconClock size={15} />
          {post.readingMinutes} min read
          <span aria-hidden>·</span>
          {fmtDate(post.publishedAt)}
        </p>
      </div>
    </Link>
  );
}

export default function BlogClient({ posts, tags }: { posts: Post[]; tags: string[] }) {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(
    initialTag && tags.includes(initialTag) ? initialTag : null
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (!tag || p.tags.includes(tag)) &&
        (!needle ||
          p.title.toLowerCase().includes(needle) ||
          p.excerpt.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)))
    );
  }, [posts, q, tag]);

  const [featured, ...rest] = filtered;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      {/* Hero */}
      <p className="label-caps text-terra">The Sofora Journal</p>
      <h1 className="mt-2 max-w-2xl text-4xl font-semibold leading-tight text-ink md:text-5xl">
        Sofa buying guides & style ideas
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">
        Honest advice on choosing the right sofa for a UK home — fabrics, sizes, sofa beds and
        care — written by people who deliver them for a living.
      </p>

      {/* Search + tags */}
      <div className="mt-8 flex flex-col gap-4">
        <label className="relative max-w-md">
          <span className="sr-only">Search articles</span>
          <IconSearch size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guides, fabrics, sizes…"
            className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-[15px] outline-none placeholder:text-muted/70 focus:border-forest"
          />
        </label>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
            <button
              onClick={() => setTag(null)}
              className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                tag === null ? "bg-forest text-cream" : "bg-white text-ink border border-line hover:border-forest"
              }`}
            >
              All topics
            </button>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                aria-pressed={tag === t}
                className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                  tag === t ? "bg-forest text-cream" : "bg-white text-ink border border-line hover:border-forest"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-16 rounded-[18px] bg-white p-12 text-center">
          <p className="text-lg font-semibold text-ink">No articles found</p>
          <p className="mt-2 text-muted">Try a different search or topic.</p>
        </div>
      ) : (
        <>
          {featured && !q && !tag && (
            <Link
              href={`/blog/${featured.slug}`}
              className="group mt-10 grid overflow-hidden rounded-[18px] bg-white shadow-[0_2px_16px_rgba(46,60,51,0.07)] md:grid-cols-2"
            >
              <div
                className="relative min-h-[240px]"
                style={{ background: `linear-gradient(135deg, ${featured.coverColor ?? "#EFE8DC"} 0%, #F8F5EE 100%)` }}
              >
                <SofaIllustration
                  type="three"
                  fabric={featured.coverColor ?? "#D8CBB4"}
                  bg={featured.coverColor ?? "#EFE8DC"}
                  title={featured.title}
                  className="absolute inset-0 m-auto h-[85%] w-[85%] transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-col justify-center gap-3 p-8 md:p-10">
                <p className="label-caps text-terra">Latest guide</p>
                <h2 className="text-2xl font-semibold leading-snug text-ink group-hover:text-forest md:text-3xl">
                  {featured.title}
                </h2>
                <p className="leading-relaxed text-muted line-clamp-3">{featured.excerpt}</p>
                <p className="flex items-center gap-2 text-[13px] text-muted">
                  <IconClock size={15} />
                  {featured.readingMinutes} min read
                  <span aria-hidden>·</span>
                  {fmtDate(featured.publishedAt)}
                </p>
              </div>
            </Link>
          )}
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(featured && !q && !tag ? rest : filtered).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
