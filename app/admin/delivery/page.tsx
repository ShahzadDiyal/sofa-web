"use client";

/* Delivery & COD rules (SPEC 14). Verification, payment, zones, slots and
   message preferences persist to /api/settings (merged into the site
   settings document); the team list is static until Firebase Auth lands. */

import { useEffect, useState } from "react";
import { IconPlus, IconTrash } from "@/components/Icons";
import {
  Card,
  CardTitle,
  ErrorBox,
  Pill,
  Skeleton,
  Toggle,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  labelClass,
} from "../_ui";

interface Zone {
  name: string;
  postcodes: string;
  fee: string;
  leadTime: string;
  codOn: boolean;
}

interface DeliveryState {
  verification: {
    smsCode: boolean;
    confirmCall: boolean;
    flagRefusers: boolean;
    flagPostcodeMismatch: boolean;
    autoCancelAfter: string;
    blockCodAfter: string;
  };
  minOrderValue: string;
  maxCodValue: string;
  acceptCash: boolean;
  acceptCard: boolean;
  exactChangeNotice: boolean;
  zones: Zone[];
  slots: { morning: string; afternoon: string; maxPerSlot: string; twoPerson: boolean };
  messages: { smsCode: boolean; orderConfirmed: boolean; outForDelivery: boolean; emailReceipts: boolean };
}

const DEFAULTS: DeliveryState = {
  verification: {
    smsCode: true,
    confirmCall: true,
    flagRefusers: true,
    flagPostcodeMismatch: false,
    autoCancelAfter: "48 hours",
    blockCodAfter: "2 refused deliveries",
  },
  minOrderValue: "",
  maxCodValue: "",
  acceptCash: true,
  acceptCard: true,
  exactChangeNotice: true,
  zones: [
    { name: "Zone 1", postcodes: "M, SK, WA…", fee: "Free", leadTime: "5–7 days", codOn: true },
    { name: "Zone 2", postcodes: "B, LS, L…", fee: "Free", leadTime: "5–7 days", codOn: true },
    { name: "Zone 3", postcodes: "London", fee: "£29", leadTime: "7–10 days", codOn: true },
    { name: "Highlands & islands", postcodes: "IV, KW, HS…", fee: "£49", leadTime: "10–14 days", codOn: true },
  ],
  slots: { morning: "9am – 1pm", afternoon: "1pm – 6pm", maxPerSlot: "", twoPerson: true },
  messages: { smsCode: true, orderConfirmed: true, outForDelivery: true, emailReceipts: true },
};

const TEAM = [
  { initials: "SO", name: "Store Owner", role: "Owner", bg: "#F4E1D6" },
  { initials: "OP", name: "Order desk", role: "Confirms orders", bg: "#E3EBE4" },
  { initials: "DR", name: "Driver lead", role: "Delivery routes", bg: "#DCE8F3" },
];

function fromServer(s: Record<string, unknown>): DeliveryState {
  const d = structuredClone(DEFAULTS);
  const v = s.verification as Partial<DeliveryState["verification"]> | undefined;
  if (v) d.verification = { ...d.verification, ...v };
  if (typeof s.minOrderValue === "string") d.minOrderValue = s.minOrderValue;
  if (typeof s.maxCodValue === "string") d.maxCodValue = s.maxCodValue;
  const ap = s.acceptedPayments as string[] | undefined;
  if (Array.isArray(ap)) {
    d.acceptCash = ap.includes("cash");
    d.acceptCard = ap.includes("card");
  }
  if (typeof s.exactChangeNotice === "boolean") d.exactChangeNotice = s.exactChangeNotice;
  if (Array.isArray(s.zones)) d.zones = s.zones as Zone[];
  const sl = s.slots as Partial<DeliveryState["slots"]> | undefined;
  if (sl) d.slots = { ...d.slots, ...sl };
  const ms = s.messages as Partial<DeliveryState["messages"]> | undefined;
  if (ms) d.messages = { ...d.messages, ...ms };
  return d;
}

export default function DeliverySettingsPage() {
  const [state, setState] = useState<DeliveryState | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = () => {
    setError("");
    api<{ settings: Record<string, unknown> }>("/api/settings")
      .then(({ settings }) => setState(fromServer(settings)))
      .catch((e) => setError(e.message || "Could not load settings."));
  };
  useEffect(load, []);

  const set = <K extends keyof DeliveryState>(k: K, v: DeliveryState[K]) =>
    setState((s) => (s ? { ...s, [k]: v } : s));

  const save = async () => {
    if (!state) return;
    setSaving(true);
    setError("");
    try {
      const acceptedPayments = [
        ...(state.acceptCash ? ["cash"] : []),
        ...(state.acceptCard ? ["card"] : []),
        "bank_transfer",
      ];
      await api("/api/settings", "PATCH", {
        verification: state.verification,
        minOrderValue: state.minOrderValue,
        maxCodValue: state.maxCodValue,
        acceptedPayments,
        exactChangeNotice: state.exactChangeNotice,
        zones: state.zones,
        slots: state.slots,
        messages: state.messages,
      });
      setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const VERIFY_ROWS: { key: "smsCode" | "confirmCall" | "flagRefusers" | "flagPostcodeMismatch"; title: string; hint?: string }[] = [
    { key: "smsCode", title: "SMS code at checkout", hint: "Customer confirms their mobile number before the order is accepted." },
    { key: "confirmCall", title: "Confirmation call before dispatch", hint: "Order stays “Awaiting confirmation” until your team logs a call." },
    { key: "flagRefusers", title: "Flag repeat refusers", hint: "Mark customers with past refused deliveries as high risk." },
    { key: "flagPostcodeMismatch", title: "Flag mismatched postcodes", hint: "Warn when the postcode doesn’t match the address or delivery zone." },
  ];

  const MSG_ROWS: { key: keyof DeliveryState["messages"]; label: string }[] = [
    { key: "smsCode", label: "SMS verification code" },
    { key: "orderConfirmed", label: "Order confirmed (SMS)" },
    { key: "outForDelivery", label: "Out for delivery (SMS)" },
    { key: "emailReceipts", label: "Email receipts" },
  ];

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-[36px] leading-tight">Delivery & COD rules</h1>
          <p className="text-muted mt-1.5">Control how pay-on-delivery orders are verified, scheduled and delivered.</p>
        </div>
        <div className="flex gap-2.5">
          <button className={btnAdmin} onClick={load} disabled={saving}>
            Cancel
          </button>
          <button className={btnAdminPrimary} onClick={save} disabled={saving || !state}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {savedAt && (
        <div className="bg-[#DDEFE3] text-[#2F7D4F] rounded-[16px] px-5 py-3.5 text-[14px] font-semibold">
          Saved at {savedAt}. These rules apply to new checkouts immediately.
        </div>
      )}

      {!state ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[220px]" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-5 items-start">
          <div className="flex-[3_1_520px] min-w-0 flex flex-col gap-5">
            <Card>
              <div>
                <h2 className="text-[22px]">Order verification</h2>
                <p className="text-muted text-[14px] mt-1">Cut down on fake and refused orders before they ship.</p>
              </div>
              <div className="flex flex-col">
                {VERIFY_ROWS.map((r) => (
                  <div key={r.key} className="flex justify-between items-center gap-4 py-3.5 border-b border-sand last:border-0">
                    <div>
                      <div className="font-semibold text-[15px]">{r.title}</div>
                      {r.hint && <div className="text-muted text-[13px] mt-0.5">{r.hint}</div>}
                    </div>
                    <Toggle
                      on={state.verification[r.key]}
                      onChange={(v) => set("verification", { ...state.verification, [r.key]: v })}
                      label={r.title}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="d-autocancel">Auto-cancel if unconfirmed after</label>
                  <select
                    id="d-autocancel"
                    className={fieldClass}
                    value={state.verification.autoCancelAfter}
                    onChange={(e) => set("verification", { ...state.verification, autoCancelAfter: e.target.value })}
                  >
                    {["24 hours", "48 hours", "72 hours"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="d-blockcod">Block COD after refusals</label>
                  <select
                    id="d-blockcod"
                    className={fieldClass}
                    value={state.verification.blockCodAfter}
                    onChange={(e) => set("verification", { ...state.verification, blockCodAfter: e.target.value })}
                  >
                    {["1 refused delivery", "2 refused deliveries", "3 refused deliveries"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>Payment on delivery</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="d-min">Min. order value (£)</label>
                  <input id="d-min" className={fieldClass} inputMode="decimal" placeholder="None" value={state.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="d-max">Max. COD order value (£)</label>
                  <input id="d-max" className={fieldClass} inputMode="decimal" placeholder="No limit" value={state.maxCodValue} onChange={(e) => set("maxCodValue", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col">
                {[
                  { key: "acceptCash" as const, title: "Accept cash" },
                  { key: "acceptCard" as const, title: "Accept card on driver’s terminal" },
                  { key: "exactChangeNotice" as const, title: "Require exact change notice", hint: "Tell customers to have the full amount ready." },
                ].map((r) => (
                  <div key={r.key} className="flex justify-between items-center gap-4 py-3.5 border-b border-sand last:border-0">
                    <div>
                      <div className="font-semibold text-[15px]">{r.title}</div>
                      {r.hint && <div className="text-muted text-[13px] mt-0.5">{r.hint}</div>}
                    </div>
                    <Toggle on={state[r.key]} onChange={(v) => set(r.key, v)} label={r.title} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0! gap-0! overflow-hidden">
              <div className="flex justify-between items-center gap-3 flex-wrap p-6 pb-4">
                <h2 className="text-[22px]">Delivery zones</h2>
                <button
                  className={btnAdmin + " min-h-[40px]! py-1.5!"}
                  onClick={() =>
                    set("zones", [...state.zones, { name: `Zone ${state.zones.length + 1}`, postcodes: "", fee: "Free", leadTime: "", codOn: true }])
                  }
                >
                  <IconPlus size={16} /> Add zone
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-6 py-2.5 border-b border-line">Zone</th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line">Postcode areas</th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line">Delivery fee</th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line">Lead time</th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-3 py-2.5 border-b border-line">COD</th>
                      <th className="px-6" aria-label="Remove" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.zones.map((z, i) => (
                      <tr key={i} className="hover:bg-[#FBF9F5]">
                        <td className="px-6 py-2.5 border-b border-sand">
                          <input aria-label={`Zone ${i + 1} name`} className="bg-transparent font-semibold text-[14px] outline-none border-b border-transparent focus:border-forest w-full" value={z.name} onChange={(e) => set("zones", state.zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        </td>
                        <td className="px-3 py-2.5 border-b border-sand">
                          <input aria-label={`Zone ${i + 1} postcode areas`} className="bg-transparent text-[14px] outline-none border-b border-transparent focus:border-forest w-full" value={z.postcodes} onChange={(e) => set("zones", state.zones.map((x, j) => (j === i ? { ...x, postcodes: e.target.value } : x)))} placeholder="e.g. M, SK, WA" />
                        </td>
                        <td className="px-3 py-2.5 border-b border-sand">
                          <input aria-label={`Zone ${i + 1} delivery fee`} className="bg-transparent text-[14px] outline-none border-b border-transparent focus:border-forest w-full" value={z.fee} onChange={(e) => set("zones", state.zones.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))} placeholder="Free" />
                        </td>
                        <td className="px-3 py-2.5 border-b border-sand">
                          <input aria-label={`Zone ${i + 1} lead time`} className="bg-transparent text-[14px] outline-none border-b border-transparent focus:border-forest w-full" value={z.leadTime} onChange={(e) => set("zones", state.zones.map((x, j) => (j === i ? { ...x, leadTime: e.target.value } : x)))} placeholder="e.g. 5–7 days" />
                        </td>
                        <td className="px-3 py-2.5 border-b border-sand">
                          <button onClick={() => set("zones", state.zones.map((x, j) => (j === i ? { ...x, codOn: !x.codOn } : x)))} aria-label={`COD for ${z.name}: ${z.codOn ? "on" : "off"}`}>
                            <Pill bg={z.codOn ? "#DDEFE3" : "#EBE3D6"} fg={z.codOn ? "#2F7D4F" : "#646A63"}>
                              {z.codOn ? "On" : "Off"}
                            </Pill>
                          </button>
                        </td>
                        <td className="px-6 py-2.5 border-b border-sand">
                          <button
                            aria-label={`Remove ${z.name}`}
                            onClick={() => set("zones", state.zones.filter((_, j) => j !== i))}
                            className="grid place-items-center w-9 h-9 rounded-full hover:bg-[#F6DDD8] text-[#B3402F] cursor-pointer"
                          >
                            <IconTrash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardTitle>Delivery slots</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass} htmlFor="d-morn">Morning slot</label>
                  <input id="d-morn" className={fieldClass} value={state.slots.morning} onChange={(e) => set("slots", { ...state.slots, morning: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="d-aft">Afternoon slot</label>
                  <input id="d-aft" className={fieldClass} value={state.slots.afternoon} onChange={(e) => set("slots", { ...state.slots, afternoon: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="d-maxslot">Max deliveries per slot</label>
                  <input id="d-maxslot" className={fieldClass} inputMode="numeric" placeholder="No limit" value={state.slots.maxPerSlot} onChange={(e) => set("slots", { ...state.slots, maxPerSlot: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-between items-center gap-4">
                <div>
                  <div className="font-semibold text-[15px]">Two-person delivery on every sofa</div>
                  <div className="text-muted text-[13px] mt-0.5">Recommended for 3-seaters and corner sofas.</div>
                </div>
                <Toggle on={state.slots.twoPerson} onChange={(v) => set("slots", { ...state.slots, twoPerson: v })} label="Two-person delivery" />
              </div>
            </Card>
          </div>

          <aside className="flex-[2_1_300px] min-w-0 flex flex-col gap-5">
            <Card>
              <CardTitle>Customer messages</CardTitle>
              <div className="flex flex-col">
                {MSG_ROWS.map((r) => (
                  <div key={r.key} className="flex justify-between items-center gap-4 py-3 border-b border-sand last:border-0 first:pt-0">
                    <span className="font-medium text-[15px]">{r.label}</span>
                    <Toggle
                      on={state.messages[r.key]}
                      onChange={(v) => set("messages", { ...state.messages, [r.key]: v })}
                      label={r.label}
                    />
                  </div>
                ))}
              </div>
              <div className="bg-cream rounded-[14px] p-4 text-[13px] leading-relaxed text-[#4a514b]">
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted">Preview</span>
                <p className="mt-1.5">
                  Hi [First name], your Sofora order #[0000] is confirmed for [date, slot]. Please have £[amount] ready for the driver.
                </p>
              </div>
            </Card>

            <Card>
              <CardTitle>Team</CardTitle>
              <div className="flex flex-col gap-3.5">
                {TEAM.map((m) => (
                  <div key={m.initials} className="flex items-center gap-3">
                    <span className="w-[38px] h-[38px] rounded-full grid place-items-center font-semibold shrink-0 text-ink" style={{ background: m.bg }}>
                      {m.initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[15px]">{m.name}</div>
                      <div className="text-muted text-[13px]">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
              <a href="mailto:?subject=Join%20the%20Sofora%20team" className={btnAdmin}>
                Invite team member
              </a>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}
