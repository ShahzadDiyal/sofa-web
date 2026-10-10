"use client";

/* Admin → Queries: inbox for contact-page messages. Read, reply, and
   manage statuses. Replies are saved to the query record. */

import { useEffect, useMemo, useState } from "react";
import { IconMail, IconSearch, IconTrash, IconX } from "@/components/Icons";
import type { ContactQuery } from "@/lib/types";
import { QUERY_STATUS_LABELS } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  labelClass,
  tdClass,
  thClass,
} from "../_ui";

const STATUS_STYLES: Record<ContactQuery["status"], string> = {
  new: "bg-terra/15 text-terra",
  read: "bg-cream text-muted",
  replied: "bg-mint text-forest",
};

export default function QueriesPage() {
  const [queries, setQueries] = useState<ContactQuery[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContactQuery["status"]>("all");
  const [open, setOpen] = useState<ContactQuery | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ContactQuery | null>(null);

  const load = () => {
    api<{ queries: ContactQuery[] }>("/api/queries")
      .then(({ queries }) => setQueries(queries))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load queries."));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    let list = queries ?? [];
    if (statusFilter !== "all") list = list.filter((x) => x.status === statusFilter);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((x) =>
        `${x.name} ${x.email} ${x.subject} ${x.message}`.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [queries, q, statusFilter]);

  const openQuery = async (item: ContactQuery) => {
    setOpen(item);
    setReply(item.reply ?? "");
    if (item.status === "new") {
      try {
        const { query } = await api<{ query: ContactQuery }>(`/api/queries/${item.id}`, "PATCH", { status: "read" });
        setQueries((qs) => (qs ?? []).map((x) => (x.id === item.id ? query : x)));
        setOpen(query);
      } catch { /* non-fatal */ }
    }
  };

  const sendReply = async () => {
    if (!open || !reply.trim()) return;
    setSaving(true);
    try {
      const { query } = await api<{ query: ContactQuery }>(`/api/queries/${open.id}`, "PATCH", { reply: reply.trim() });
      setQueries((qs) => (qs ?? []).map((x) => (x.id === open.id ? query : x)));
      setOpen(query);
      setReply(query.reply ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save reply.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/api/queries/${deleting.id}`, "DELETE");
      setDeleting(null);
      if (open?.id === deleting.id) setOpen(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[30px]">Queries</h1>
        <p className="text-muted text-[14px] mt-1">Messages from the contact page form. Click one to read and reply.</p>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <div className="flex gap-3 flex-wrap items-center">
          <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] w-full max-w-[340px]">
            <IconSearch size={17} className="text-muted flex-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search queries…"
              aria-label="Search queries"
              className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
            />
          </label>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by status">
            {(["all", "new", "read", "replied"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={`px-4 min-h-[40px] rounded-full text-[14px] font-semibold border-[1.5px] ${
                  statusFilter === s ? "bg-forest text-cream border-forest" : "border-line hover:border-ink"
                }`}
              >
                {s === "all" ? "All" : QUERY_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {queries === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No queries" hint="New contact-form messages will appear here." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>From</th>
                  <th className={thClass}>Subject</th>
                  <th className={thClass}>Received</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr
                    key={x.id}
                    className="border-t border-sand hover:bg-cream/50 cursor-pointer"
                    onClick={() => openQuery(x)}
                  >
                    <td className={tdClass}>
                      <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${STATUS_STYLES[x.status]}`}>
                        {QUERY_STATUS_LABELS[x.status]}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <div className="font-semibold">{x.name}</div>
                      <div className="text-[13px] text-muted">{x.email}</div>
                    </td>
                    <td className={tdClass}>
                      <span className={x.status === "new" ? "font-semibold" : ""}>{x.subject}</span>
                    </td>
                    <td className={tdClass + " whitespace-nowrap"}>{fmtDate(x.createdAt)}</td>
                    <td className={tdClass + " text-right"}>
                      <button
                        className={btnAdmin + " text-[#B3402F]"}
                        aria-label={`Delete query from ${x.name}`}
                        onClick={(e) => { e.stopPropagation(); setDeleting(x); }}
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-[24px] leading-tight">{open.subject}</h2>
                <p className="text-muted text-[14px] mt-1">
                  {open.name} · <a className="underline" href={`mailto:${open.email}`}>{open.email}</a>
                  {open.phone && <> · <a className="underline" href={`tel:${open.phone.replace(/\s/g, "")}`}>{open.phone}</a></>}
                  {" · "}{fmtDate(open.createdAt)}
                </p>
              </div>
              <button className="w-10 h-10 grid place-items-center rounded-full hover:bg-cream flex-none" onClick={() => setOpen(null)} aria-label="Close">
                <IconX size={20} />
              </button>
            </div>

            <div className="bg-cream rounded-[16px] p-5 text-[15px] leading-relaxed whitespace-pre-wrap">
              {open.message}
            </div>

            <div>
              <label className={labelClass} htmlFor="q-reply">
                Your reply {open.reply && <span className="font-normal text-muted">(sent {open.repliedAt ? fmtDate(open.repliedAt) : ""})</span>}
              </label>
              <textarea
                id="q-reply"
                rows={4}
                className={fieldClass}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write your reply…"
              />
              <p className="text-[13px] text-muted mt-1.5 flex items-center gap-1.5">
                <IconMail size={14} /> The reply is saved here. Send it to the customer by email yourself — automatic email sending isn't connected yet.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setOpen(null)}>Close</button>
              <button className={btnAdminPrimary} onClick={sendReply} disabled={saving || !reply.trim()}>
                {saving ? "Saving…" : open.reply ? "Update reply" : "Save reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-5">
            <h2 className="text-[24px]">Delete this query?</h2>
            <p className="text-muted text-[14px]">“{deleting.subject}” from {deleting.name} will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setDeleting(null)}>Cancel</button>
              <button className={btnAdminPrimary + " bg-[#B3402F]!"} onClick={remove}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
