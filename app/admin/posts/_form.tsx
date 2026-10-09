"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sanitizeHtml } from "@/lib/sanitize";
import type { Post } from "@/lib/types";
import { Card, ErrorBox, api, btnAdmin, btnAdminPrimary, fieldClass, labelClass } from "../_ui";

const PRESET_COLORS = ["#EFE8DC", "#DCE5DA", "#E8DDC9", "#F5E6D3", "#E3D5C8", "#DCE4E8", "#E8DCE0", "#D5DCE5"];

function slugifyTitle(t: string) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function faqToText(faq: { q: string; a: string }[] | undefined): string {
  return (faq ?? []).map((f) => `${f.q} || ${f.a}`).join("\n");
}

function textToFaq(text: string): { q: string; a: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [q, ...rest] = l.split("||");
      return { q: q.trim(), a: rest.join("||").trim() };
    })
    .filter((f) => f.q && f.a);
}

export default function PostForm({ initial }: { initial?: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [coverColor, setCoverColor] = useState(initial?.coverColor ?? "#EFE8DC");
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [status, setStatus] = useState<"published" | "draft">(initial?.status ?? "draft");
  const [faqText, setFaqText] = useState(faqToText(initial?.faqJson));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onTitle = (t: string) => {
    setTitle(t);
    if (!slugTouched) setSlug(slugifyTitle(t));
  };

  const save = async () => {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugifyTitle(title),
        excerpt: excerpt.trim(),
        content,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        coverColor,
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
        status,
        faqJson: textToFaq(faqText),
        authorName: initial?.authorName ?? "Sofora Team",
      };
      if (initial) {
        await api<{ post: Post }>(`/api/posts/${initial.id}`, "PUT", payload);
      } else {
        await api<{ post: Post }>("/api/posts", "POST", payload);
      }
      router.push("/admin/posts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the article.");
      setSaving(false);
    }
  };

  const counter = (n: number, target: string) => (
    <span className={`text-[12px] ${n === 0 ? "text-muted" : "text-muted"}`}>
      {n} chars{target ? ` — aim ${target}` : ""}
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      <ErrorBox message={error} onRetry={() => setError("")} />

      <Card>
        <div className="grid gap-5">
          <div>
            <label className={labelClass} htmlFor="pf-title">Title</label>
            <input id="pf-title" className={fieldClass} value={title} onChange={(e) => onTitle(e.target.value)} placeholder="How to choose the right sofa size" />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-slug">URL slug</label>
            <input
              id="pf-slug"
              className={fieldClass}
              value={slug}
              onChange={(e) => { setSlug(slugifyTitle(e.target.value)); setSlugTouched(true); }}
              placeholder="how-to-choose-the-right-sofa-size"
            />
            <p className="mt-1.5 text-[12.5px] text-muted">Auto-generated from the title — edit only if you need a custom URL. Final URL: /blog/{slug || "…"}</p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass} htmlFor="pf-excerpt">Excerpt</label>
              {counter(excerpt.length, "150–160")}
            </div>
            <textarea
              id="pf-excerpt"
              className={fieldClass}
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One or two sentences shown on the blog index and used as the meta description fallback."
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-ink">Article content</h2>
          <button type="button" className={btnAdmin} onClick={() => setPreview((p) => !p)}>
            {preview ? "Edit HTML" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div
            className="rounded-[12px] border border-line bg-cream p-6 text-[15px] leading-[1.8] text-ink [&_h2]:mt-6 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-[17px] [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-forest [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-terra [&_blockquote]:pl-4 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) || "<p class='text-muted'>Nothing to preview yet.</p>" }}
          />
        ) : (
          <>
            <textarea
              className={`${fieldClass} font-mono! text-[13.5px]! leading-relaxed`}
              rows={18}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="<p>Write the article in HTML…</p>"
            />
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              HTML only — allowed tags: p, h2, h3, h4, ul, ol, li, strong, em, a, blockquote, table, figure.
              Scripts, iframes and inline styles are stripped automatically. Links should be absolute
              (https://…) or site-relative (/sofas/…).
            </p>
          </>
        )}
      </Card>

      <Card>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="pf-tags">Tags</label>
            <input id="pf-tags" className={fieldClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Guides, Fabrics" />
            <p className="mt-1.5 text-[12.5px] text-muted">Comma-separated. Tags become the filter chips on the blog index.</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-status">Status</label>
            <select id="pf-status" className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value as "published" | "draft")}>
              <option value="draft">Draft — hidden from the blog</option>
              <option value="published">Published — visible on the blog</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <span className={labelClass}>Cover colour</span>
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverColor(c)}
                  aria-label={`Use ${c}`}
                  aria-pressed={coverColor === c}
                  className={`h-11 w-11 rounded-full border-2 transition ${coverColor === c ? "border-forest scale-110" : "border-line"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={coverColor}
                onChange={(e) => setCoverColor(e.target.value)}
                aria-label="Custom cover colour"
                className="h-11 w-14 cursor-pointer rounded-[10px] border border-line bg-white p-1"
              />
              <span className="text-[13px] text-muted">{coverColor}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-[17px] font-semibold text-ink mb-4">SEO</h2>
        <div className="grid gap-5">
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass} htmlFor="pf-metatitle">Meta title</label>
              {counter(metaTitle.length, "~60")}
            </div>
            <input id="pf-metatitle" className={fieldClass} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Defaults to “Title | Sofora Blog”" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass} htmlFor="pf-metadesc">Meta description</label>
              {counter(metaDescription.length, "~155")}
            </div>
            <textarea id="pf-metadesc" className={fieldClass} rows={2} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Defaults to the excerpt." />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-[17px] font-semibold text-ink mb-1.5">Article FAQs <span className="text-[13px] font-normal text-muted">(optional)</span></h2>
        <p className="mb-3 text-[12.5px] text-muted">One per line as <code className="rounded bg-cream px-1.5 py-0.5">Question || Answer</code>. Shown on the page and emitted as FAQPage structured data.</p>
        <textarea className={fieldClass} rows={4} value={faqText} onChange={(e) => setFaqText(e.target.value)} placeholder="What size sofa fits a small living room? || Measure your wall…" />
      </Card>

      <div className="flex gap-3">
        <button type="button" className={btnAdminPrimary} disabled={saving} onClick={save}>
          {saving ? "Saving…" : initial ? "Save changes" : "Create article"}
        </button>
        <button type="button" className={btnAdmin} onClick={() => router.push("/admin/posts")}>
          Cancel
        </button>
      </div>
    </div>
  );
}
