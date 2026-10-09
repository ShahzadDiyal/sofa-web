"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconCheck } from "@/components/Icons";
import SofaIllustration from "@/components/SofaIllustration";
import { gbp } from "@/lib/seo";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Card,
  CardTitle,
  EmptyState,
  ErrorBox,
  Pill,
  Skeleton,
  StatusPill,
  UK_POSTCODE_RE,
  api,
  btnAdmin,
  btnAdminPrimary,
  fmtDateTime,
  initials,
  patchOrder,
} from "../../_ui";

const STAGES = ["Order placed", "Confirmed", "Out for delivery", "Delivered & paid"];

function stageIndex(status: OrderStatus): number {
  switch (status) {
    case "new":
      return 1;
    case "confirmed":
      return 2;
    case "out_for_delivery":
      return 3;
    case "delivered":
      return 4;
    default:
      return 1;
  }
}

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `44${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");

  const load = () => {
    setError("");
    Promise.all([
      api<{ order: Order }>(`/api/orders/${id}`).then((r) => r.order),
      api<{ orders: Order[] }>("/api/orders").then((r) => r.orders),
    ])
      .then(([o, all]) => {
        setOrder(o);
        setAllOrders(all);
      })
      .catch((e) => setError(e.message || "Could not load order."));
  };
  useEffect(load, [id]);

  const mutate = async (status: OrderStatus, noteText?: string) => {
    if (!order) return;
    setBusy(true);
    try {
      const { order: updated } = await patchOrder(order.id, status, noteText);
      setOrder(updated);
      setAllOrders((all) => all.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!note.trim() || !order) return;
    await mutate(order.status, `Note: ${note.trim()}`);
    setNote("");
  };

  const checks = useMemo(() => {
    if (!order) return [];
    const notes = order.timeline.map((t) => t.note ?? "").join(" ");
    return [
      {
        id: "placed",
        title: "Order placed online",
        hint: "Details captured at checkout",
        done: true,
        action: { label: "View items", href: "#items" } as const,
      },
      {
        id: "verified",
        title: "Mobile number verified",
        hint: "SMS code not yet entered",
        done: /verif/i.test(notes),
        action: { label: "Mark verified", run: () => mutate(order.status, "Mobile number verified by team") } as const,
      },
      {
        id: "call",
        title: "Confirmation call",
        hint: "No call logged yet",
        done: /call/i.test(notes),
        action: { label: "Log call", run: () => mutate(order.status, "Confirmation call logged — delivery slot agreed") } as const,
      },
      {
        id: "address",
        title: "Address & access confirmed",
        hint: "Check stairs, lift and doorway width",
        done: /address/i.test(notes),
        action: { label: "Confirm", run: () => mutate(order.status, "Address & access confirmed with customer") } as const,
      },
    ];
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps

  const doneChecks = checks.filter((c) => c.done).length;

  const risk = useMemo(() => {
    if (!order) return [];
    const rows: { ok: boolean; warn?: boolean; text: string }[] = [];
    rows.push(
      UK_POSTCODE_RE.test(order.customer.postcode.trim())
        ? { ok: true, text: "Postcode matches UK format" }
        : { ok: false, text: "Postcode looks invalid — double-check" }
    );
    const samePhone = allOrders.filter(
      (o) => o.id !== order.id && o.customer.phone.replace(/\D/g, "") === order.customer.phone.replace(/\D/g, "")
    );
    const refusedBefore = samePhone.filter((o) => o.status === "refused" || o.status === "cancelled").length;
    rows.push(
      refusedBefore > 0
        ? { ok: false, text: `${refusedBefore} previous refused order${refusedBefore > 1 ? "s" : ""} on this number` }
        : { ok: true, text: samePhone.length > 0 ? `Repeat customer (${samePhone.length} previous order${samePhone.length > 1 ? "s" : ""})` : "No previous refusals" }
    );
    rows.push(
      order.total >= 1000
        ? { ok: true, warn: true, text: "High order value — confirm carefully" }
        : { ok: true, text: "Standard order value" }
    );
    return rows;
  }, [order, allOrders]);

  if (error && !order)
    return (
      <>
        <Link href="/admin/orders" className="underline text-[14px] font-medium">
          ← Orders
        </Link>
        <ErrorBox message={error} onRetry={load} />
      </>
    );

  if (!order)
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[40px] w-[280px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );

  const current = stageIndex(order.status);
  const ended = order.status === "cancelled" || order.status === "refused";
  // doneIdx: last completed stage (0-based); currentIdx: the in-progress stage, -1 when none
  const doneIdx = order.status === "delivered" ? 3 : ended ? 0 : current - 1;
  const currentIdx = ended || order.status === "delivered" ? -1 : doneIdx + 1;
  const c = order.customer;

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex gap-2 text-muted text-[14px]">
        <Link href="/admin/orders" className="underline">
          Orders
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">#{order.number}</span>
      </nav>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3.5 flex-wrap">
          <h1 className="text-[38px] leading-tight">Order #{order.number}</h1>
          <StatusPill status={order.status} />
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button className={btnAdmin} onClick={() => window.print()}>
            Print delivery note
          </button>
          {!ended && order.status !== "delivered" && (
            <button
              className={btnAdmin + " text-[#B3402F]!"}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Cancel order #${order.number}? The customer will not be charged (COD).`))
                  mutate("cancelled", "Order cancelled by team");
              }}
            >
              Cancel order
            </button>
          )}
          {!ended && order.status !== "delivered" && (
            <button
              className={btnAdmin + " text-[#B3402F]!"}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Mark order #${order.number} as refused at the door?`))
                  mutate("refused", "Refused at the door — nothing collected");
              }}
            >
              Mark refused
            </button>
          )}
          {order.status === "new" && (
            <button className={btnAdminPrimary} disabled={busy} onClick={() => mutate("confirmed", "Order confirmed by team")}>
              Confirm order
            </button>
          )}
          {order.status === "confirmed" && (
            <button className={btnAdminPrimary} disabled={busy} onClick={() => mutate("out_for_delivery", "Out for delivery")}>
              Mark out for delivery
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      {ended && (
        <div className="bg-[#F6DDD8] text-[#B3402F] rounded-[16px] px-5 py-4 text-[14px] font-semibold">
          This order was {order.status === "cancelled" ? "cancelled" : "refused at the door"}. Nothing was collected.
        </div>
      )}

      <Card>
        <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-muted">COD progress</span>
        <div className="flex flex-wrap gap-4">
          {STAGES.map((s, i) => {
            const isDone = i <= doneIdx;
            const isCurrent = i === currentIdx;
            const style = isDone
              ? { bg: "#2F7D4F", fg: "#fff" }
              : isCurrent
                ? { bg: "#1F3A32", fg: "#F6F1EA" }
                : { bg: "#EBE3D6", fg: "#646A63" };
            return (
              <div key={s} className="flex-[1_1_150px] flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-[30px] h-[30px] rounded-full grid place-items-center text-[13px] font-semibold shrink-0"
                    style={{ background: style.bg, color: style.fg }}
                  >
                    {isDone ? <IconCheck size={15} /> : i + 1}
                  </span>
                  {i < STAGES.length - 1 && (
                    <span
                      className="flex-1 h-[3px] rounded-full"
                      style={{ background: isDone ? "#2F7D4F" : "#DDD3C4" }}
                    />
                  )}
                </div>
                <div className="font-semibold text-[14px]" style={{ color: isDone || isCurrent ? "#1E2421" : "#646A63" }}>
                  {s}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex-[3_1_520px] min-w-0 flex flex-col gap-5">
          <Card>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h2 className="text-[24px]">Confirmation checklist</h2>
              <Pill bg={doneChecks === 4 ? "#DDEFE3" : "#F8EAC8"} fg={doneChecks === 4 ? "#2F7D4F" : "#9A6A12"}>
                {doneChecks} of 4 done
              </Pill>
            </div>
            <div className="flex flex-col">
              {checks.map((chk) => (
                <div key={chk.id} className="flex gap-3.5 items-start py-3.5 border-b border-sand last:border-0">
                  <span
                    className="w-[30px] h-[30px] rounded-full grid place-items-center shrink-0"
                    style={{ background: chk.done ? "#2F7D4F" : "#EBE3D6", color: chk.done ? "#fff" : "#EBE3D6" }}
                  >
                    <IconCheck size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[15px]">{chk.title}</div>
                    <div className="text-muted text-[13px] mt-0.5">{chk.done ? "Done" : chk.hint}</div>
                  </div>
                  {!chk.done &&
                    ("href" in chk.action ? (
                      <a href={chk.action.href} className={btnAdmin + " min-h-[36px]! py-1.5!"}>
                        {chk.action.label}
                      </a>
                    ) : (
                      <button className={btnAdmin + " min-h-[36px]! py-1.5!"} disabled={busy} onClick={chk.action.run}>
                        {chk.action.label}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div id="items" className="scroll-mt-6">
              <CardTitle>Items</CardTitle>
            </div>
            {order.items.map((it) => (
              <div key={it.productId} className="flex gap-4 items-center flex-wrap">
                <div className="w-[92px] rounded-[14px] overflow-hidden shrink-0">
                  <SofaIllustration type={it.type} fabric={it.fabric} bg={it.bg} title={it.name} className="w-full aspect-square" />
                </div>
                <div className="flex-[1_1_200px]">
                  <div className="font-semibold text-[16px]">{it.name}</div>
                  <div className="text-muted text-[14px] mt-0.5">Qty {it.qty}</div>
                </div>
                <div className="font-semibold min-w-[64px] text-right">{gbp(it.price * it.qty)}</div>
              </div>
            ))}
            <div className="border-t border-sand pt-3.5 flex flex-col gap-2 text-[15px]">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="text-ink">{gbp(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span className={order.deliveryFee === 0 ? "text-[#2F7D4F] font-medium" : "text-ink"}>
                  {order.deliveryFee === 0 ? "Free" : gbp(order.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-[16px] border-t border-sand pt-3">
                <span className="text-ink">Due on delivery</span>
                <span>{gbp(order.total)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Activity</CardTitle>
            <div className="flex flex-col gap-3.5">
              {[...order.timeline].reverse().map((t, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-forest mt-1.5 shrink-0" />
                  <div>
                    <div className="text-[14px]">{t.note || t.status}</div>
                    <div className="text-[12px] text-muted mt-0.5">{fmtDateTime(t.at)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 flex-wrap">
              <input
                aria-label="Add internal note"
                placeholder="Add an internal note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                className="flex-[1_1_220px] border-[1.5px] border-line rounded-[12px] px-3.5 py-2.5 min-h-[44px] text-[14px] outline-none focus:border-forest"
              />
              <button className={btnAdmin} disabled={busy || !note.trim()} onClick={addNote}>
                Add note
              </button>
            </div>
          </Card>
        </div>

        <aside className="flex-[2_1_320px] min-w-0 flex flex-col gap-5">
          <section className="bg-forest text-cream rounded-[20px] p-6 flex flex-col gap-4">
            <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-peach">Cash to collect</span>
            <span className="font-serif font-semibold text-[48px] leading-none">{gbp(order.total)}</span>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="paymethod" className="text-[13px] text-mint">
                Payment received as
              </label>
              <select
                id="paymethod"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="border-0 rounded-[12px] px-3.5 py-3 min-h-[46px] bg-cream text-ink font-medium text-[15px]"
              >
                <option>Not yet collected</option>
                <option>Cash</option>
                <option>Card (driver terminal)</option>
              </select>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 px-[18px] py-[10px] rounded-full bg-forest-deep text-cream font-semibold text-[14px] min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={busy || order.status !== "out_for_delivery" || payMethod === "Not yet collected"}
              onClick={() => mutate("delivered", `Delivered & paid — collected ${gbp(order.total)} by ${payMethod.toLowerCase()}`)}
            >
              Mark delivered & paid
            </button>
            <p className="text-[12px] text-[#C9D6CC] leading-relaxed">
              {order.status === "out_for_delivery"
                ? "Choose how the driver collected payment, then mark paid."
                : "Available once the order is out for delivery."}
            </p>
          </section>

          <Card>
            <div className="flex justify-between items-center">
              <h2 className="text-[22px]">Customer</h2>
            </div>
            <div className="flex gap-3 items-center">
              <span className="w-11 h-11 rounded-full bg-mint text-forest grid place-items-center font-semibold shrink-0">
                {initials(c.name)}
              </span>
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-muted text-[13px]">
                  {sameCustomerCount(allOrders, c.phone, order.id) > 0 ? "Repeat customer" : "First order"}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between gap-3">
                <span className="text-muted">Phone</span>
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-ink font-medium">
                  {c.phone}
                </a>
              </div>
              {c.email && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Email</span>
                  <a href={`mailto:${c.email}`} className="text-ink font-medium break-all text-right">
                    {c.email}
                  </a>
                </div>
              )}
            </div>
            <div className="flex gap-2.5">
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className={btnAdmin + " flex-1"}>
                Call
              </a>
              <a href={`sms:${c.phone.replace(/\s/g, "")}`} className={btnAdmin + " flex-1"}>
                Text
              </a>
              <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className={btnAdmin + " flex-1"}>
                WhatsApp
              </a>
            </div>
          </Card>

          <Card>
            <h2 className="text-[22px]">Delivery</h2>
            <div>
              <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-muted">Address</span>
              <p className="mt-1.5 leading-relaxed text-[15px]">
                {c.address}
                <br />
                {c.city} {c.postcode}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between gap-3">
                <span className="text-muted">Slot</span>
                <span className="text-ink text-right">{order.deliverySlot || "Not chosen"}</span>
              </div>
              {c.notes && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Driver notes</span>
                  <span className="text-ink text-right">{c.notes}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-muted">Route</span>
                <span className="text-ink">Not assigned</span>
              </div>
            </div>
            <button
              className={btnAdmin}
              disabled={busy}
              onClick={() => mutate(order.status, "Assigned to a delivery route")}
            >
              Assign to route
            </button>
          </Card>

          <Card>
            <div className="flex justify-between items-center">
              <h2 className="text-[22px]">Risk check</h2>
              <Pill
                bg={risk.some((r) => !r.ok) ? "#F6DDD8" : risk.some((r) => r.warn) ? "#F8EAC8" : "#DDEFE3"}
                fg={risk.some((r) => !r.ok) ? "#B3402F" : risk.some((r) => r.warn) ? "#9A6A12" : "#2F7D4F"}
              >
                {risk.some((r) => !r.ok) ? "High" : risk.some((r) => r.warn) ? "Medium" : "Low"}
              </Pill>
            </div>
            <div className="flex flex-col gap-2.5 text-[14px]">
              {risk.map((r) => (
                <div key={r.text} className="flex gap-2.5 items-center">
                  <span style={{ color: r.ok && !r.warn ? "#2F7D4F" : "#9A6A12" }}>●</span>
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function sameCustomerCount(all: Order[], phone: string, excludeId: string): number {
  const digits = phone.replace(/\D/g, "");
  return all.filter((o) => o.id !== excludeId && o.customer.phone.replace(/\D/g, "") === digits).length;
}
