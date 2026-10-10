"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/types";
import { gbp } from "@/lib/seo";
import { useStore } from "@/lib/store";
import SofaIllustration from "@/components/SofaIllustration";
import { IconCash, IconCheck, IconMinus, IconPlus, IconShield, IconSofa, IconTrash, IconTruck } from "@/components/Icons";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";

function nextSlots(): { day: string; time: string; value: string }[] {
  const out: { day: string; time: string; value: string }[] = [];
  const d = new Date();
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
  let added = 0;
  while (added < 4) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue; // no Sundays
    const day = fmtDay.format(d);
    out.push({ day, time: "9am – 1pm", value: `${day} · 9am – 1pm` });
    out.push({ day, time: "1pm – 6pm", value: `${day} · 1pm – 6pm` });
    added++;
  }
  return out.slice(0, 5);
}

const inputCls = "field-input";
const panel = "bg-white rounded-[20px] p-6 md:p-7 flex flex-col gap-5 shadow-[0_1px_2px_rgba(30,36,33,0.04)]";

export default function CheckoutClient({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const { basket, setQty, removeFromBasket, clearBasket, basketTotal } = useStore();
  const slots = useMemo(nextSlots, []);

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    postcode: "", address1: "", address2: "", city: "", county: "",
    floor: "Ground floor", lift: "No lift", notes: "",
    slot: slots[0]?.value ?? "",
    paymentMethod: "cash" as "cash" | "card" | "bank_transfer",
    agree: false,
  });
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  /* Coupon code: validated server-side; the order total is re-validated
     again in createOrder so the client discount is never trusted. */
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(""); // applied code
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);

  const applyCoupon = async (code: string, subtotal: number, silent = false) => {
    const c = code.trim();
    if (!c) return false;
    if (!silent) {
      setCouponChecking(true);
      setCouponMsg("");
    }
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, subtotal }),
      });
      const data = await res.json();
      if (!data.valid) {
        if (!silent) setCouponMsg(data.reason || "That code didn't work.");
        setCoupon("");
        setDiscount(0);
        return false;
      }
      setCoupon(data.code);
      setDiscount(data.discount);
      if (!silent) setCouponMsg("");
      return true;
    } catch {
      if (!silent) setCouponMsg("Couldn't check that code — try again.");
      return false;
    } finally {
      if (!silent) setCouponChecking(false);
    }
  };

  // Re-validate the coupon if the basket changes underneath it.
  useEffect(() => {
    if (coupon) applyCoupon(coupon, basketTotal, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketTotal]);

  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  };

  const deliveryFee = basketTotal >= settings.freeDeliveryThreshold || basketTotal === 0 ? 0 : 29;
  const due = Math.max(0, basketTotal - discount) + deliveryFee;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (basket.length === 0) return;
    if (!form.agree) {
      setError("Please confirm you'll be home for delivery and accept the terms.");
      return;
    }
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: basket.map((i) => ({ productId: i.productId, slug: i.slug, name: i.name, qty: i.qty })),
          customer: {
            name: form.name, email: form.email, phone: form.phone,
            address: [form.address1, form.address2].filter(Boolean).join(", "),
            city: `${form.city}${form.county ? `, ${form.county}` : ""}`,
            postcode: form.postcode,
            notes: [`Floor: ${form.floor}`, `Lift: ${form.lift}`, form.notes].filter((x) => x && !x.endsWith(": ")).join(" · ") || undefined,
          },
          deliverySlot: form.slot,
          paymentMethod: form.paymentMethod,
          couponCode: coupon || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong placing your order.");
      clearBasket();
      router.push(
        `/order-confirmed?order=${encodeURIComponent(data.order.number)}&t=${encodeURIComponent(data.order.publicToken ?? "")}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong placing your order.");
      setPlacing(false);
    }
  }

  if (basket.length === 0) {
    return (
      <div className="min-h-[60vh]">
        <SlimHeader />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center flex flex-col items-center gap-5">
          <span className="w-16 h-16 rounded-full bg-mint grid place-items-center text-forest">
            <IconSofa size={30} />
          </span>
          <h1 className="text-4xl">Your basket is empty</h1>
          <p className="text-body">Add a sofa or two and come back — checkout takes a minute, and there&apos;s nothing to pay online.</p>
          <Link href="/sofas" className="btn btn-primary mt-2">Shop all sofas</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SlimHeader />

      <div className="mx-auto max-w-7xl px-6 pt-10 pb-24">
        <h1 className="text-[clamp(34px,4vw,48px)] mb-2">Checkout</h1>
        <p className="text-body mb-8">No payment today. You&apos;ll pay the driver when your sofa arrives.</p>

        <div className="flex flex-wrap gap-8 items-start">
          <form onSubmit={placeOrder} className="flex-[2_1_560px] min-w-0 flex flex-col gap-6">
            {/* 1 — details */}
            <section className={panel} aria-labelledby="co-details">
              <div className="flex items-center gap-3">
                <StepNum n="1" />
                <h2 id="co-details" className="text-[26px]">Your details</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label" htmlFor="co-name">Full name</label>
                  <input id="co-name" className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required />
                </div>
                <div>
                  <label className="field-label" htmlFor="co-email">Email</label>
                  <input id="co-email" type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" placeholder="you@example.co.uk" />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="co-phone">Mobile number</label>
                <input id="co-phone" className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" required placeholder="07700 900000" />
                <p className="text-[13px] text-muted mt-1.5">We&apos;ll text to confirm your order, and call to agree your delivery slot.</p>
              </div>
            </section>

            {/* 2 — address */}
            <section className={panel} aria-labelledby="co-address">
              <div className="flex items-center gap-3">
                <StepNum n="2" />
                <h2 id="co-address" className="text-[26px]">Delivery address</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label" htmlFor="co-pc">Postcode</label>
                  <input id="co-pc" className={inputCls} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} autoComplete="postal-code" required placeholder="M30 7SA" />
                </div>
                <div>
                  <label className="field-label" htmlFor="co-city">Town / city</label>
                  <input id="co-city" className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" required />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="co-a1">Address line 1</label>
                <input id="co-a1" className={inputCls} value={form.address1} onChange={(e) => set("address1", e.target.value)} autoComplete="street-address" required />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label" htmlFor="co-a2">Address line 2 <span className="text-muted font-normal">(optional)</span></label>
                  <input id="co-a2" className={inputCls} value={form.address2} onChange={(e) => set("address2", e.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor="co-county">County</label>
                  <input id="co-county" className={inputCls} value={form.county} onChange={(e) => set("county", e.target.value)} autoComplete="address-level1" />
                </div>
              </div>
              <div className="border-t border-line pt-5 flex flex-col gap-4">
                <span className="label-caps">Access for delivery</span>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="co-floor">Floor</label>
                    <select id="co-floor" className="field-select" value={form.floor} onChange={(e) => set("floor", e.target.value)}>
                      <option>Ground floor</option>
                      <option>1st floor</option>
                      <option>2nd floor or higher</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="co-lift">Lift available?</label>
                    <select id="co-lift" className="field-select" value={form.lift} onChange={(e) => set("lift", e.target.value)}>
                      <option>No lift</option>
                      <option>Yes, lift</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="co-notes">Notes for the driver <span className="text-muted font-normal">(optional)</span></label>
                  <textarea id="co-notes" rows={2} className="field-textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Narrow hallway, parking, gate code…" />
                  <p className="text-[13px] text-muted mt-1.5">Helps our two-person team bring the sofa in without surprises.</p>
                </div>
              </div>
            </section>

            {/* 3 — slot */}
            <section className={panel} aria-labelledby="co-slot">
              <div className="flex items-center gap-3">
                <StepNum n="3" />
                <h2 id="co-slot" className="text-[26px]">Delivery slot</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Delivery slot">
                {slots.map((s) => {
                  const on = form.slot === s.value;
                  return (
                    <button
                      type="button"
                      key={s.value}
                      role="radio"
                      aria-checked={on}
                      onClick={() => set("slot", s.value)}
                      className={`flex items-center gap-3.5 rounded-2xl border-[1.5px] p-4 text-left min-h-[64px] transition-colors ${on ? "border-forest bg-mint/40" : "border-line bg-white hover:border-ink"}`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 grid place-items-center flex-none ${on ? "border-forest" : "border-line"}`} aria-hidden>
                        {on && <span className="w-2.5 h-2.5 rounded-full bg-forest" />}
                      </span>
                      <span>
                        <span className="font-semibold block">{s.day}</span>
                        <span className="text-sm text-body">{s.time}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[13px] text-muted">Slots are confirmed by phone before dispatch.</p>
            </section>

            {/* 4 — payment */}
            <section className={panel} aria-labelledby="co-pay">
              <div className="flex items-center gap-3">
                <StepNum n="4" />
                <h2 id="co-pay" className="text-[26px]">Payment</h2>
              </div>
              <div className="rounded-2xl border-[1.5px] border-forest bg-mint/40 p-5 flex flex-col gap-4">
                <div className="flex gap-3.5 items-start">
                  <span className="w-5 h-5 rounded-full border-2 border-forest grid place-items-center flex-none mt-0.5" aria-hidden>
                    <span className="w-2.5 h-2.5 rounded-full bg-forest" />
                  </span>
                  <div>
                    <div className="font-semibold text-[17px]">Pay on delivery</div>
                    <p className="text-[15px] text-forest-deep mt-1 leading-relaxed">
                      Pay the driver once you&apos;ve inspected your sofa. Accepted:{" "}
                      {settings.acceptedPayments.map((m) => PAYMENT_METHOD_LABELS[m]).join(", ")}.
                    </p>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-forest-deep">
                  {["Nothing to pay online", "Check the sofa before you pay", `Please have ${gbp(due)} ready when we arrive`].map((t) => (
                    <li key={t} className="flex gap-2.5 items-center">
                      <IconCheck size={16} className="text-[#2F7D4F]" /> {t}
                    </li>
                  ))}
                </ul>
                <div>
                  <label className="field-label" htmlFor="co-paymethod">How you&apos;ll pay the driver</label>
                  <select id="co-paymethod" className="field-select" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                    {settings.acceptedPayments.map((m) => (
                      <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex gap-3 items-start text-sm leading-relaxed text-body cursor-pointer">
                <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="w-5 h-5 mt-0.5 accent-[#1F3A32]" />
                <span>
                  I&apos;ll be home for delivery, and I agree to the{" "}
                  <Link href="/terms" className="underline">terms</Link>,{" "}
                  <Link href="/delivery" className="underline">delivery policy</Link> and{" "}
                  <Link href="/privacy" className="underline">privacy policy</Link>.
                </span>
              </label>
              {error && (
                <p role="alert" className="text-sm font-medium text-[#B3402F] bg-[#F6DDD8] rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
              <button type="submit" disabled={placing} className="btn btn-primary w-full sm:w-auto">
                {placing ? "Placing your order…" : `Place order — pay ${gbp(due)} on delivery`}
              </button>
            </section>
          </form>

          {/* Summary */}
          <aside className="flex-1 basis-[340px] min-w-0 flex flex-col gap-4 lg:sticky lg:top-24">
            <div className={`${panel} gap-[18px]!`}>
              <h2 className="text-2xl">Order summary</h2>
              <ul className="flex flex-col gap-4">
                {basket.map((i) => (
                  <li key={i.productId} className="flex gap-4 items-center">
                    <div className="w-24 rounded-[14px] overflow-hidden flex-none">
                      <SofaIllustration type={i.type} fabric={i.fabric} bg={i.bg} className="w-full aspect-square" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-snug">{i.name}</div>
                      <div className="text-sm text-muted mt-0.5">Qty {i.qty}</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <button className="w-8 h-8 grid place-items-center rounded-full border border-line hover:border-ink" aria-label={`Decrease quantity of ${i.name}`} onClick={() => setQty(i.productId, i.qty - 1)}>
                          <IconMinus size={14} />
                        </button>
                        <button className="w-8 h-8 grid place-items-center rounded-full border border-line hover:border-ink" aria-label={`Increase quantity of ${i.name}`} onClick={() => setQty(i.productId, i.qty + 1)}>
                          <IconPlus size={14} />
                        </button>
                        <button className="w-8 h-8 grid place-items-center rounded-full text-muted hover:text-[#B3402F]" aria-label={`Remove ${i.name} from basket`} onClick={() => removeFromBasket(i.productId)}>
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </div>
                    <span className="font-semibold">{gbp(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line pt-4 flex flex-col gap-2.5 text-[15px]">
                <div className="flex justify-between">
                  <span className="text-body">Subtotal</span>
                  <span>{gbp(basketTotal)}.00</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#2F7D4F]">
                    <span>Coupon {coupon}</span>
                    <span>−{gbp(discount)}.00</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-body">Delivery</span>
                  {deliveryFee === 0 ? (
                    <span className="text-[#2F7D4F] font-medium">Free</span>
                  ) : (
                    <span>{gbp(deliveryFee)}.00</span>
                  )}
                </div>
              </div>
              <div>
                {coupon ? (
                  <div className="flex justify-between items-center bg-mint rounded-[14px] px-4 py-3 text-[14px]">
                    <span className="font-semibold text-forest">Code {coupon} applied</span>
                    <button
                      type="button"
                      className="underline underline-offset-2 text-forest/70 hover:text-forest"
                      onClick={() => { setCoupon(""); setDiscount(0); setCouponInput(""); setCouponMsg(""); }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        className="flex-1 min-w-0 bg-white border-[1.5px] border-line rounded-[14px] px-4 min-h-[48px] text-[15px] uppercase outline-none focus:border-forest transition placeholder:normal-case placeholder:text-muted/70"
                      />
                      <button
                        type="button"
                        disabled={couponChecking || !couponInput.trim()}
                        onClick={() => applyCoupon(couponInput, basketTotal)}
                        className="px-5 min-h-[48px] rounded-[14px] bg-forest text-cream font-semibold text-[15px] disabled:opacity-50"
                      >
                        {couponChecking ? "…" : "Apply"}
                      </button>
                    </div>
                    {couponMsg && <p className="text-[13px] text-[#B3402F] mt-1.5">{couponMsg}</p>}
                  </div>
                )}
              </div>
              <div className="border-t border-line pt-4 flex justify-between items-baseline">
                <span className="font-semibold">Due on delivery</span>
                <span className="font-serif font-semibold text-[30px]">{gbp(due)}.00</span>
              </div>
            </div>
            <div className="bg-mint rounded-[20px] p-[20px_22px] flex flex-col gap-3 text-sm text-forest">
              <div className="flex gap-3 items-center"><IconCash size={20} /> We&apos;ll call to confirm before dispatch</div>
              <div className="flex gap-3 items-center"><IconTruck size={20} /> Free two-person delivery</div>
              <div className="flex gap-3 items-center"><IconShield size={20} /> 5-year frame guarantee</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SlimHeader() {
  return (
    <header className="bg-cream border-b border-line">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between gap-4 flex-wrap py-[18px]">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Sofora home">
          <span className="w-[38px] h-[38px] rounded-full bg-forest grid place-items-center text-cream">
            <IconSofa size={20} />
          </span>
          <span className="font-serif text-[27px]">Sofora</span>
        </Link>
        <span className="flex items-center gap-2 text-sm text-forest font-medium">
          <IconShield size={18} /> Secure checkout · Pay on delivery
        </span>
        <Link href="/sofas" className="text-sm font-medium underline hover:opacity-70">
          Back to sofas
        </Link>
      </div>
    </header>
  );
}

function StepNum({ n }: { n: string }) {
  return (
    <span className="w-9 h-9 rounded-full bg-forest text-cream grid place-items-center font-semibold flex-none" aria-hidden>
      {n}
    </span>
  );
}
