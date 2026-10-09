"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Post } from "@/lib/types";
import { EmptyState, ErrorBox, Skeleton, api } from "../../_ui";
import PostForm from "../_form";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api<{ post: Post }>(`/api/posts/${id}`)
      .then(({ post }) => setPost(post))
      .catch((e) => {
        if (e instanceof Error && /404|not found/i.test(e.message)) setMissing(true);
        else setError(e instanceof Error ? e.message : "Could not load the article.");
      });
  }, [id]);

  if (missing) {
    return <EmptyState title="Article not found" hint="It may have been deleted." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit article</h1>
          {post && (
            <p className="text-[14px] text-muted">
              <Link href={`/blog/${post.slug}`} target="_blank" className="underline underline-offset-2 hover:text-forest">
                View live article
              </Link>
            </p>
          )}
        </div>
      </div>
      <ErrorBox message={error} onRetry={() => setError("")} />
      {!post ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 rounded-[12px]" />
          <Skeleton className="h-64 rounded-[18px]" />
          <Skeleton className="h-40 rounded-[18px]" />
        </div>
      ) : (
        <PostForm key={post.id} initial={post} />
      )}
    </div>
  );
}
