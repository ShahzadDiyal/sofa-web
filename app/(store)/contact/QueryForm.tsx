"use client";

/* Contact page query form — saved to Firestore, answered from Admin → Queries. */

import { useState } from "react";
import { IconCheck } from "@/components/Icons";

const inputCls =
  "w-full bg-white border-[1.5px] border-line rounded-[14px] px-4 min-h-[52px] text-[15px] outline-none focus:border-forest transition placeholder:text-muted/70";
const labelCls = "block text-[14px] font-semibold mb-1.5";

export default function QueryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-mint rounded-[20px] p-8 text-center flex flex-col items-center gap-3">
        <span className="w-14 h-14 rounded-full bg-forest text-cream grid place-items-center">
          <IconCheck size={26} />
        </span>
        <h2 className="text-[24px]">Message sent</h2>
        <p className="text-forest/80 text-[15px] max-w-[44ch]">
          Thanks, {name.split(" ")[0] || "there"} — we&apos;ve got your message and will get back to you at {email} shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">
      <h2 className="text-[26px]">Send us a message</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="qf-name">Your name</label>
          <input id="qf-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" autoComplete="name" required minLength={2} />
        </div>
        <div>
          <label className={labelCls} htmlFor="qf-email">Email</label>
          <input id="qf-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.co.uk" autoComplete="email" required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="qf-phone">Phone <span className="font-normal text-muted">(optional)</span></label>
          <input id="qf-phone" type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07700 900000" autoComplete="tel" />
        </div>
        <div>
          <label className={labelCls} htmlFor="qf-subject">Subject</label>
          <input id="qf-subject" className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Question about delivery" required minLength={3} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="qf-message">Your message</label>
        <textarea
          id="qf-message"
          rows={5}
          className={inputCls + " py-3.5 min-h-[140px] resize-y"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          required
          minLength={10}
        />
      </div>
      {error && (
        <p role="alert" className="bg-[#F6DDD8] text-[#B3402F] rounded-[14px] px-4 py-3 text-[14px] font-medium">
          {error}
        </p>
      )}
      <button type="submit" disabled={sending} className="btn btn-primary self-start disabled:opacity-60">
        {sending ? "Sending…" : "Send message"}
      </button>
      <p className="text-[13px] text-muted">We usually reply within one working day.</p>
    </form>
  );
}
