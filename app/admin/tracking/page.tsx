"use client";

/* Admin → Tracking: every chat-widget open, with the visitor's page,
   location, IP, identity (or "Guest") and time spent on site. */

import { useEffect, useState } from "react";
import { IconSearch } from "@/components/Icons";
import type { Visit } from "@/lib/db";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  tdClass,
  thClass,
  RefreshButton,
} from "../_ui";
import { AdminPagination, usePagination } from "../_ui";

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(sec?: number) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function locationOf(v: Visit) {
  const parts = [v.city, v.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export default function TrackingPage() {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const fetchVisits = () => {
    return api<{ visits: Visit[]; total: number }>(
      `/api/admin/visits?limit=200${debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ""}`
    )
      .then(({ visits, total }) => {
        setVisits(visits);
        setTotal(total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tracking data."));
  };

  useEffect(() => {
    setVisits(null);
    fetchVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const refresh = () => {
    setRefreshing(true);
    fetchVisits().finally(() => setRefreshing(false));
  };

  const pg = usePagination(visits ?? []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-[26px] font-semibold">Tracking</h1>
          <p className="text-[14px] text-muted">
            {total} visitor{total === 1 ? "" : "s"} opened the chat widget
          </p>
        </div>
        <div className="ml-auto relative flex items-center gap-3">
          <RefreshButton refreshing={refreshing} onRefresh={refresh} />
          <div className="relative">
            <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, page, IP…"
              className="bg-white border-[1.5px] border-line rounded-[12px] pl-10 pr-4 min-h-[44px] text-[14px] outline-none focus:border-forest transition placeholder:text-muted/70 w-[260px]"
            />
          </div>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        {visits === null ? (
          <SkeletonTable rows={8} cols={6} />
        ) : visits.length === 0 ? (
          <EmptyState
            title="No visitors tracked yet"
            hint="A row appears here every time someone opens the chat button on the storefront."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] min-w-[900px]">
                <thead>
                  <tr className="text-left">
                    <th className={thClass}>Time</th>
                    <th className={thClass}>Visitor</th>
                    <th className={thClass}>Page</th>
                    <th className={thClass}>Location</th>
                    <th className={thClass}>IP address</th>
                    <th className={thClass}>Time on site</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.pageItems.map((v) => (
                    <tr key={v.id} className="border-t border-line/70">
                      <td className={tdClass + " whitespace-nowrap text-muted"}>{fmtTime(v.createdAt)}</td>
                      <td className={tdClass}>
                        {v.name || v.email || v.phone ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{v.name || "Guest"}</span>
                            {(v.email || v.phone) && (
                              <span className="text-[12px] text-muted">
                                {[v.email, v.phone].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block bg-stone/15 text-muted rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                            Guest
                          </span>
                        )}
                      </td>
                      <td className={tdClass + " max-w-[260px]"}>
                        <a
                          href={v.page}
                          target="_blank"
                          rel="noreferrer"
                          className="text-forest underline truncate block"
                          title={v.page}
                        >
                          {v.page.replace(/^https?:\/\//, "")}
                        </a>
                      </td>
                      <td className={tdClass}>{locationOf(v)}</td>
                      <td className={tdClass + " font-mono text-[13px]"}>{v.ip || "—"}</td>
                      <td className={tdClass}>{fmtDuration(v.timeOnSite)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={pg.page}
              pageCount={pg.pageCount}
              perPage={pg.perPage}
              onPage={pg.setPage}
              onPerPage={pg.setPerPage}
              total={pg.total}
              from={pg.from}
              to={pg.to}
            />
          </>
        )}
      </Card>
    </div>
  );
}
