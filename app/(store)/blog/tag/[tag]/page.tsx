import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listPosts } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import BlogClient from "../../BlogClient";

function findTag(posts: { tags: string[] }[], raw: string): string | undefined {
  const decoded = decodeURIComponent(raw);
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  return tags.find((t) => t === decoded) ?? tags.find((t) => t.toLowerCase() === decoded.toLowerCase());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const posts = await listPosts(true);
  const matched = findTag(posts, tag);
  if (!matched) return { title: "Blog | Sofora", description: "", alternates: { canonical: absoluteUrl("/blog") } };
  const canonical = absoluteUrl(`/blog/tag/${encodeURIComponent(matched)}`);
  const meta: Metadata = {
    title: `${matched} — sofa guides | Sofora Blog`,
    description: `Sofora blog articles tagged “${matched}”: sofa buying guides and living-room ideas for UK homes.`,
    alternates: { canonical },
  };
  return meta;
}

export default async function BlogTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const posts = await listPosts(true);
  const matched = findTag(posts, tag);
  if (!matched) notFound();
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b));
  return (
    <Suspense fallback={<div className="mx-auto px-6 py-16" aria-label="Loading articles"><div className="skeleton h-10 w-2/3 max-w-md rounded-full" /></div>}>
      <BlogClient posts={posts} tags={tags} initialTag={matched} />
    </Suspense>
  );
}
