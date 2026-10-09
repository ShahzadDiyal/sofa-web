"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash } from "@/components/Icons";
import type { Post } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  Pill,
  SkeletonTable,
  Toggle,
  api,
  btnAdmin,
  btnAdminPrimary,
  tdClass,
  thClass,
} from "../_ui";

type Tab = "all" | "published" | "draft";

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setError("");
    api<{ posts: Post[] }>("/api/posts?all=1")
      .then(({ posts }) => setPosts(posts))
      .catch((e) => setError(e.message || "Could not load articles."));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const list = posts ?? [];
    return {
      all: list.length,
      published: list.filter((p) => p.status === "published").length,
      draft: list.filter((p) => p.status !== "published").length,
    };
  }, [posts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (posts ?? [])
      .filter((p) => (tab === "all" ? true : p.status === tab))
      .filter(
        (p) =>
          !needle ||
          p.title.toLowerCase().includes(needle) ||
          p.slug.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle))
      );
  }, [posts, tab, q]);

  const setStatus = async (post: Post, status: "published" | "draft") => {
    setBusyId(post.id);
    try {
      const { post: updated } = await api<{ post: Post }>(`/api/posts/${post.id}`, "PUT", { ...post, status });
      setPosts((prev) => (prev ?? []).map((p) => (p.id === post.id ? updated : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the article.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (post: Post) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setBusyId(post.id);
    try {
      await api(`/api/posts/${post.id}`, "DELETE");
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== post.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the article.");
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "published", label: "Published", n: counts.published },
    { key: "draft", label: "Drafts", n: counts.draft },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Blog</h1>
          <p className="text-[14px] text-muted">Buying guides and style ideas for the Sofora Journal.</p>
        </div>
        <Link href="/admin/posts/new" className={btnAdminPrimary}>
          <IconPlus size={17} /> New article
        </Link>
      </div>

      <ErrorBox message={error} onRetry={() => { setError(""); load(); }} />

      <Card>
        <div className="flex flex-wrap items-center gap-2 pb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-[14px] font-semibold transition ${
                tab === t.key ? "bg-forest text-cream" : "bg-cream text-ink hover:bg-sand"
              }`}
            >
              {t.label} <span className="opacity-70">({t.n})</span>
            </button>
          ))}
          <label className="relative ml-auto w-full sm:w-64">
            <span className="sr-only">Search articles</span>
            <IconSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, slug, tag…"
              className="w-full rounded-full border border-line bg-white py-2.5 pl-10 pr-4 text-[14px] outline-none placeholder:text-muted/70 focus:border-forest"
            />
          </label>
        </div>

        {posts === null ? (
          <SkeletonTable rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No articles here" hint={q ? "Try a different search." : "Write your first guide with “New article”."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>Tags</th>
                  <th className={thClass}>Read</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={busyId === p.id ? "opacity-50" : ""}>
                    <td className={tdClass}>
                      <Link href={`/admin/posts/${p.id}`} className="font-semibold text-ink hover:text-forest">
                        {p.title}
                      </Link>
                      <p className="text-[12.5px] text-muted">/blog/{p.slug}</p>
                    </td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-1.5">
                        {p.tags.map((t) => (
                          <Pill key={t} bg="#EFE8DC" fg="#2E3C33">{t}</Pill>
                        ))}
                      </div>
                    </td>
                    <td className={tdClass}>{p.readingMinutes} min</td>
                    <td className={tdClass}>
                      <Toggle
                        on={p.status === "published"}
                        onChange={(on: boolean) => setStatus(p, on ? "published" : "draft")}
                        label={p.status === "published" ? "Published" : "Draft"}
                      />
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/posts/${p.id}`} className={btnAdmin}>Edit</Link>
                        <button
                          className={btnAdmin}
                          aria-label={`Delete ${p.title}`}
                          onClick={() => remove(p)}
                          disabled={busyId === p.id}
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
