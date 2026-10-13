"use client";

/* Admin → Audit logs: who did what, when. Every admin write action
   (products, orders, coupons, logins, …) is recorded via logAudit(). */

import { Fragment, useCallback, useEffect, useState } from "react";
import { IconChevronDown, IconSearch } from "@/components/Icons";
import type { AuditLog } from "@/lib/db";
import {
  AdminPagination,
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  fieldClass,
  fmtDateTime,
  tdClass,
  thClass,
  usePagination,
} from "../_ui";

const PAGE_LIMIT = 200;

interface Facets {
  actions: string[];
  admins: string[];
}

/* "order.status" -> "Order status" */
function actionLabel(action: string): string {
  return action
    .split(/[._-]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function actionPillClass(action: string): string {
  if (action.startsWith("auth.")) return "bg-[#E4EAF6] text-[#31456E]";
  if (action.endsWith(".create") || action.endsWith(".login")) return "bg-mint text-forest";
  if (action.endsWith(".delete") || action.endsWith(".login_failed")) return "bg-[#F7E2DC] text-[#B3402F]";
  return "bg-cream text-muted";
}

function prettyDetails(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets>({ actions: [], admins: [] });
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [admin, setAdmin] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Debounce the search box so typing doesn't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
    const sp = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (action) sp.set("action", action);
    if (admin) sp.set("adminEmail", admin);
    if (q) sp.set("q", q);
    setError("");
    api<{ logs: AuditLog[]; total: number; facets: Facets }>(`/api/admin/audit-logs?${sp}`)
      .then(({ logs, total, facets }) => {
        setLogs(logs);
        setTotal(total);
        setFacets(facets);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load audit logs."));
  }, [action, admin, q]);

  useEffect(load, [load]);

  const pg = usePagination(logs ?? []);

  const filtered = action || admin || q;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[30px]">Audit logs</h1>
        <p className="text-muted text-[14px] mt-1">
          Every admin action is recorded here — sign-ins, product changes, order status updates, coupon edits and more.
          {total > 0 && <span className="font-semibold text-ink"> {total} entr{total === 1 ? "y" : "ies"}</span>}
        </p>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      <Card>
        <div className="flex gap-3 flex-wrap items-center">
          <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] w-full max-w-[320px]">
            <IconSearch size={17} className="text-muted flex-none" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search summary, record id, admin…"
              aria-label="Search audit logs"
              className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
            />
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filter by action"
            className={fieldClass + " w-auto cursor-pointer"}
          >
            <option value="">All actions</option>
            {facets.actions.map((a) => (
              <option key={a} value={a}>{actionLabel(a)}</option>
            ))}
          </select>
          <select
            value={admin}
            onChange={(e) => setAdmin(e.target.value)}
            aria-label="Filter by admin"
            className={fieldClass + " w-auto cursor-pointer"}
          >
            <option value="">All admins</option>            {facets.admins.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {filtered && (
            <button
              type="button"
              onClick={() => { setAction(""); setAdmin(""); setQInput(""); setQ(""); }}
              className="text-[13px] underline text-muted hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {logs === null ? (
        <SkeletonTable rows={8} cols={5} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit entries yet"
          hint={filtered ? "Try widening the filters." : "Admin actions will appear here as they happen."}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr>
                  <th className={thClass}>Time</th>
                  <th className={thClass}>Admin</th>
                  <th className={thClass}>Action</th>
                  <th className={thClass}>Summary</th>
                  <th className={thClass}>Record</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((l) => (
                  <Fragment key={l.id}>
                    <tr key={l.id} className="border-t border-sand">
                      <td className={tdClass + " whitespace-nowrap text-muted"}>{fmtDateTime(l.createdAt)}</td>
                      <td className={tdClass}>
                        <span className="font-medium text-[13px] break-all">{l.adminEmail}</span>
                      </td>
                      <td className={tdClass}>
                        <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap ${actionPillClass(l.action)}`}>
                          {actionLabel(l.action)}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px]">{l.summary}</span>
                          {l.details && (
                            <button
                              type="button"
                              onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                              aria-expanded={expanded === l.id}
                              aria-label="Show details"
                              className="flex-none text-muted hover:text-ink"
                            >
                              <IconChevronDown size={15} className={`transition-transform ${expanded === l.id ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={tdClass}>
                        {l.entity ? (
                          <code className="text-[12px] bg-cream rounded-lg px-2 py-1 whitespace-nowrap">
                            {l.entity}{l.entityId ? ` · ${l.entityId}` : ""}
                          </code>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                    {expanded === l.id && l.details && (
                      <tr key={`${l.id}-details`} className="border-t border-sand bg-cream/50">
                        <td colSpan={5} className={tdClass}>
                          <pre className="text-[12px] leading-relaxed bg-ink text-cream rounded-[12px] p-4 overflow-x-auto max-h-[240px] overflow-y-auto">
                            {prettyDetails(l.details)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5">
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
          </div>
        </Card>
      )}
    </div>
  );
}
