"use client";

/* Global admin search: searches sofas, categories, blog posts, colours,
   coupons, orders and queries in one place. Autocomplete dropdown grouped
   by content type; clicking a result deep-links into the admin panel. */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { apiUrl } from "@/lib/seo";
import type { AdminSearchResult } from "@/app/api/admin/search/route";

type Group = { type: string; label: string; items: AdminSearchResult[] };

export default function AdminSearch({ id }: { id: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setGroups([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/admin/search?q=${encodeURIComponent(q.trim())}`));
        const json = (await res.json().catch(() => ({}))) as { groups?: Group[] };
        setGroups(Array.isArray(json.groups) ? json.groups : []);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const go = (url: string) => {
    setOpen(false);
    setQ("");
    router.push(url);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2.5 bg-[#27463C] rounded-[12px] px-3.5 min-h-[44px] focus-within:ring-2 focus-within:ring-peach/60">
        <IconSearch size={18} className="text-[#C9D6CC] shrink-0" />
        <input
          ref={inputRef}
          id={id}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search sofas, orders, blog…"
          aria-label="Search everything in admin"
          autoComplete="off"
          className="bg-transparent outline-none text-[14px] text-cream w-full placeholder:text-[#C9D6CC]/70"
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-white text-ink rounded-[16px] shadow-xl border border-line max-h-[420px] overflow-y-auto z-50"
          role="listbox"
          aria-label="Search results"
        >
          {loading && total === 0 ? (
            <div className="p-4 flex flex-col gap-2.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[38px] rounded-[10px] bg-cream animate-pulse" />
              ))}
            </div>
          ) : total === 0 ? (
            searched && (
              <p className="px-4 py-5 text-[14px] text-muted">
                No matches for “{q.trim()}”. Try a name, slug, order number or email.
              </p>
            )
          ) : (
            groups.map((g) => (
              <div key={g.type}>
                <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {g.label}
                </div>
                <ul>
                  {g.items.map((r) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => go(r.url)}
                        className="w-full text-left px-4 py-2.5 hover:bg-cream transition-colors flex flex-col gap-0.5"
                      >
                        <span className="text-[14px] font-semibold truncate">{r.title}</span>
                        {r.subtitle && <span className="text-[12px] text-muted truncate">{r.subtitle}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
