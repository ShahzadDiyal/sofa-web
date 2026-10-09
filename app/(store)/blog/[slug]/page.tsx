import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, listPosts } from "@/lib/db";
import { absoluteUrl, blogPostJsonLd, breadcrumbJsonLd, postFaqJsonLd } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize";
import { JsonLd } from "@/components/storefront";
import SofaIllustration from "@/components/SofaIllustration";
import { IconArrowRight, IconClock } from "@/components/Icons";
import { PostCard } from "../BlogClient";
import ReadingProgress from "./ReadingProgress";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "published") return { title: { absolute: "Article not found | Sofora" } };
  const base = post.metaTitle || post.title;
  /* Keep the rendered <title> ≤60 chars; use an absolute title to bypass the "| Sofora" template. */
  const withBlog = `${base} | Sofora Blog`;
  const title =
    withBlog.length <= 60 ? withBlog : base.length <= 60 ? base : `${base.slice(0, 57).trimEnd()}…`;
  const description = post.metaDescription || post.excerpt;
  const ogImage = {
    url: absoluteUrl("/opengraph-image"),
    width: 1200,
    height: 630,
    alt: post.title,
  };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: absoluteUrl(`/blog/${post.slug}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/blog/${post.slug}`),
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.authorName || "Sofora Team"],
      tags: post.tags,
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage.url] },
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/* AEO: pull the opening sentences into a self-contained answer box. */
function keyTakeaway(html: string): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, 2).join(" ").trim();
}

const PROSE =
  "blog-prose text-[16.5px] leading-[1.85] text-ink/90 " +
  "[&_h2]:mt-10 [&_h2]:text-[26px] [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:text-ink " +
  "[&_h3]:mt-8 [&_h3]:text-[20px] [&_h3]:font-semibold [&_h3]:text-ink " +
  "[&_p]:my-5 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 " +
  "[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 " +
  "[&_li]:leading-[1.8] [&_strong]:font-semibold [&_strong]:text-ink " +
  "[&_a]:text-forest [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-terra " +
  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-terra [&_blockquote]:bg-white " +
  "[&_blockquote]:rounded-r-[12px] [&_blockquote]:px-6 [&_blockquote]:py-4 [&_blockquote]:italic [&_blockquote]:text-ink";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "published") notFound();

  const all = await listPosts(true);
  const idx = all.findIndex((p) => p.id === post.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const related = all
    .filter((p) => p.id !== post.id && p.tags.some((t) => post.tags.includes(t)))
    .slice(0, 3);

  const body = sanitizeHtml(post.content);
  const takeaway = keyTakeaway(body);
  const pageUrl = absoluteUrl(`/blog/${post.slug}`);
  const shareText = encodeURIComponent(`${post.title} — Sofora`);
  const shareUrl = encodeURIComponent(pageUrl);
  const faqLd = postFaqJsonLd(post);

  return (
    <>
      <JsonLd data={blogPostJsonLd(post)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` },
        ])}
      />
      {faqLd && <JsonLd data={faqLd} />}
      <ReadingProgress />

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[14px] text-muted">
          <Link href="/" className="hover:text-forest">Home</Link>
          <span aria-hidden>/</span>
          <Link href="/blog" className="hover:text-forest">Blog</Link>
          <span aria-hidden>/</span>
          <span className="truncate text-ink" aria-current="page">{post.title}</span>
        </nav>

        {/* Header */}
        {post.tags[0] && (
          <span className="inline-block rounded-full bg-forest px-3.5 py-1.5 text-[12.5px] font-semibold text-cream">
            {post.tags[0]}
          </span>
        )}
        <h1 className="mt-4 text-4xl font-semibold leading-[1.15] text-ink md:text-[44px]">{post.title}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">{post.excerpt}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted">
          <span className="font-medium text-ink">By {post.authorName || "Sofora Team"}</span>
          <span className="flex items-center gap-1.5">
            <IconClock size={15} /> {post.readingMinutes} min read
          </span>
          <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>
        </div>

        {/* Hero */}
        <div
          className="relative mt-8 aspect-[16/8] overflow-hidden rounded-[18px]"
          style={{ background: `linear-gradient(135deg, ${post.coverColor ?? "#EFE8DC"} 0%, #F8F5EE 100%)` }}
        >
          <SofaIllustration
            type="three"
            fabric={post.coverColor ?? "#D8CBB4"}
            bg={post.coverColor ?? "#EFE8DC"}
            title={post.title}
            className="absolute inset-0 m-auto h-[88%] w-[70%]"
          />
        </div>

        {/* Key takeaway (AEO) */}
        {takeaway && (
          <aside className="mt-8 rounded-[16px] border border-terra/30 bg-[#FBF7EF] p-6" aria-label="Key takeaway">
            <p className="label-caps text-terra">Key takeaway</p>
            <p className="mt-2 text-[15.5px] leading-relaxed text-ink">{takeaway}</p>
          </aside>
        )}

        {/* Body */}
        <div className={PROSE} dangerouslySetInnerHTML={{ __html: body }} />

        {/* Article FAQ (visible, mirrors FAQPage schema) */}
        {post.faqJson && post.faqJson.length > 0 && (
          <section className="mt-12" aria-label="Frequently asked questions">
            <h2 className="text-[26px] font-semibold text-ink">Frequently asked questions</h2>
            <div className="mt-5 flex flex-col gap-4">
              {post.faqJson.map((f, i) => (
                <div key={i} className="rounded-[16px] bg-white p-6 shadow-[0_2px_16px_rgba(46,60,51,0.07)]">
                  <h3 className="text-[17px] font-semibold text-ink">{f.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tags + share */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="rounded-full border border-line bg-white px-4 py-1.5 text-[13.5px] font-medium hover:border-forest"
              >
                {t}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[14px]">
            <span className="text-muted">Share:</span>
            <a
              href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`}
              target="_blank"
              rel="noopener"
              className="rounded-full border border-line bg-white px-4 py-1.5 font-medium hover:border-forest"
            >
              X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
              target="_blank"
              rel="noopener"
              className="rounded-full border border-line bg-white px-4 py-1.5 font-medium hover:border-forest"
            >
              Facebook
            </a>
            <a
              href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
              target="_blank"
              rel="noopener"
              className="rounded-full border border-line bg-white px-4 py-1.5 font-medium hover:border-forest"
            >
              WhatsApp
            </a>
          </div>
        </div>

        {/* Prev / next */}
        {(prev || next) && (
          <nav className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="More articles">
            {prev ? (
              <Link href={`/blog/${prev.slug}`} className="group rounded-[16px] bg-white p-5 shadow-[0_2px_16px_rgba(46,60,51,0.07)]">
                <p className="label-caps text-muted">Newer</p>
                <p className="mt-1.5 font-semibold text-ink group-hover:text-forest line-clamp-2">{prev.title}</p>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`/blog/${next.slug}`} className="group rounded-[16px] bg-white p-5 text-right shadow-[0_2px_16px_rgba(46,60,51,0.07)]">
                <p className="label-caps text-muted">Older</p>
                <p className="mt-1.5 font-semibold text-ink group-hover:text-forest line-clamp-2">{next.title}</p>
              </Link>
            )}
          </nav>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14" aria-label="Related articles">
            <div className="flex items-center justify-between">
              <h2 className="text-[26px] font-semibold text-ink">Keep reading</h2>
              <Link href="/blog" className="flex items-center gap-1.5 text-[15px] font-medium text-forest hover:text-terra">
                All articles <IconArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
