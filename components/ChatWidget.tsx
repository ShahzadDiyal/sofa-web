"use client";

/* Floating chat button (bottom-right) on the storefront.
   Opens a popup where the visitor enters name, email, WhatsApp number
   and their query — submitted straight into Admin → Queries via the
   existing /api/queries endpoint. Opening the popup also records a
   tracking row (/api/visits); the visitor shows as "Guest" until they
   identify themselves. Fully self-contained — no other UI is touched. */

import { useEffect, useRef, useState } from "react";
import { IconChat, IconCheck, IconX } from "@/components/Icons";
import { apiUrl } from "@/lib/seo";

const inputCls =
  "w-full bg-white border-[1.5px] border-line rounded-[12px] px-3.5 min-h-[46px] text-[14px] outline-none focus:border-forest transition placeholder:text-muted/70";
const labelCls = "block text-[13px] font-semibold mb-1";

interface Identity {
  name: string;
  email: string;
  phone: string;
}

const LS_KEY = "sofora-chat-identity";

function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { name: "", email: "", phone: "" };
    const d = JSON.parse(raw) as Partial<Identity>;
    return { name: String(d.name ?? ""), email: String(d.email ?? ""), phone: String(d.phone ?? "") };
  } catch {
    return { name: "", email: "", phone: "" };
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<Identity>({ name: "", email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const pageLoadAt = useRef(0);
  const visitId = useRef<string | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    pageLoadAt.current = Date.now();
    setIdentity(loadIdentity());
  }, []);

  /* Records the tracking row the moment the chat button is clicked. */
  const trackOpen = async () => {
    if (tracked.current) return;
    tracked.current = true;
    try {
      const id = loadIdentity();
      const timeOnSite = Math.max(0, Math.round((Date.now() - (pageLoadAt.current || Date.now())) / 1000));
      const res = await fetch(apiUrl("/api/visits"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: window.location.href,
          timeOnSite,
          name: id.name || undefined,
          email: id.email || undefined,
          phone: id.phone || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.visit?.id) visitId.current = String(data.visit.id);
    } catch {
      /* Tracking must never break the widget. */
    }
  };

  const toggle = () => {
    if (!open) {
      setSent(false);
      setError("");
      void trackOpen();
    }
    setOpen(!open);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/queries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: identity.name.trim(),
          email: identity.email.trim(),
          phone: identity.phone.trim(),
          subject: "Chat enquiry",
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(identity));
      } catch {
        /* ignore */
      }
      if (visitId.current) {
        fetch(apiUrl("/api/visits"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: visitId.current,
            name: identity.name.trim(),
            email: identity.email.trim(),
            phone: identity.phone.trim(),
          }),
        }).catch(() => {});
      }
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Popup */}
      {open && (
        <div className="fixed bottom-[92px] right-4 sm:right-5 z-[70] w-[348px] max-w-[calc(100vw-2rem)]">
          <div className="bg-cream border border-line rounded-[20px] shadow-[0_18px_50px_rgba(31,58,46,0.25)] overflow-hidden">
            <div className="bg-forest text-cream px-5 py-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-peach text-terra grid place-items-center shrink-0">
                <IconChat size={20} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-[16px] leading-tight">Chat with us</div>
                <div className="text-[12px] text-[#C9D6CC]">We usually reply within a few hours</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="ml-auto w-9 h-9 grid place-items-center rounded-full hover:bg-white/10 transition"
              >
                <IconX size={18} />
              </button>
            </div>
            {sent ? (
              <div className="p-6 flex flex-col items-center gap-3 text-center">
                <span className="w-14 h-14 rounded-full bg-mint text-forest grid place-items-center">
                  <IconCheck size={26} />
                </span>
                <h3 className="text-[20px] font-semibold">Message sent</h3>
                <p className="text-[14px] text-muted leading-relaxed">
                  Thanks{identity.name.trim() ? ` ${identity.name.trim().split(" ")[0]}` : ""} — we&apos;ll get back to you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-1 bg-forest text-cream rounded-[12px] px-6 py-2.5 text-[14px] font-semibold hover:bg-forest/90 transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 flex flex-col gap-3.5">
                <div>
                  <label className={labelCls} htmlFor="cw-name">Your name</label>
                  <input
                    id="cw-name"
                    className={inputCls}
                    value={identity.name}
                    onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    required
                    minLength={2}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cw-email">Email</label>
                  <input
                    id="cw-email"
                    type="email"
                    className={inputCls}
                    value={identity.email}
                    onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
                    placeholder="jane@example.co.uk"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cw-phone">
                    WhatsApp number <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="cw-phone"
                    type="tel"
                    className={inputCls}
                    value={identity.phone}
                    onChange={(e) => setIdentity({ ...identity, phone: e.target.value })}
                    placeholder="07700 900000"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cw-message">What are you looking for?</label>
                  <textarea
                    id="cw-message"
                    className={inputCls + " py-3 min-h-[92px] resize-y"}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. A 3-seater velvet sofa in green, budget around £600…"
                    required
                    minLength={10}
                  />
                </div>
                {error && (
                  <p className="text-[13px] text-terra bg-terra/10 border border-terra/20 rounded-[12px] px-3.5 py-2.5">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-forest text-cream rounded-[12px] py-3 text-[15px] font-semibold hover:bg-forest/90 transition disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close chat" : "Chat with us"}
        className="fixed bottom-5 right-4 sm:right-5 z-[70] w-[60px] h-[60px] rounded-full bg-forest text-cream grid place-items-center shadow-[0_10px_30px_rgba(31,58,46,0.35)] hover:bg-forest/90 hover:scale-105 active:scale-95 transition"
      >
        {open ? <IconX size={26} /> : <IconChat size={26} />}
      </button>
    </>
  );
}
