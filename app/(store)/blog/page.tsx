import type { Metadata } from "next";
import { Suspense } from "react";
import { listPosts } from "@/lib/db";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";
import { JsonLd } from "@/components/storefront";
import BlogClient from "./BlogClient";

export const metadata: Metadata = {
  title: "Sofa Buying Guides & Style Ideas | Sofora Blog",
  description:
    "Sofa buying guides, fabric explainers and living-room ideas for UK homes. Learn how to choose the right sofa — then pay on delivery.",
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    title: "Sofa Buying Guides & Style Ideas | Sofora Blog",
    description:
      "Sofa buying guides, fabric explainers and living-room ideas for UK homes — from the Sofora team.",
    url: absoluteUrl("/blog"),
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    images: [defaultOgImage.url],
  },
};

export default async function BlogPage() {
  const posts = await listPosts(true);
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b));

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sofora Blog — sofa buying guides & style ideas",
    url: absoluteUrl("/blog"),
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/blog/${p.slug}`),
      name: p.title,
    })),
  };

  return (
    <>
      <JsonLd data={itemList} />
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-6 py-16" aria-label="Loading articles">
            <div className="skeleton h-10 w-2/3 max-w-md rounded-full" />
            <div className="skeleton h-5 w-1/2 max-w-sm rounded-full mt-4" />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mt-12">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="skeleton aspect-[16/10] rounded-[18px]" />
                  <div className="skeleton h-5 w-3/4 rounded-full" />
                  <div className="skeleton h-4 w-full rounded-full" />
                  <div className="skeleton h-4 w-2/3 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <BlogClient posts={posts} tags={tags} />
      </Suspense>
    </>
  );
}
