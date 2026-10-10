"use client";

/* /admin/login — the only public admin page. Simple email + password form.
   Credentials are checked against the Firestore `users` collection
   (account must have the admin role); the server sets a session cookie. */

import { useState } from "react";
import Logo from "@/components/Logo";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Sign-in failed.");
        setBusy(false);
        return;
      }
      window.location.replace("/admin");
    } catch {
      setError("Sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] outline-none focus:border-forest placeholder:text-stone";

  return (
    <div className="min-h-screen bg-cream grid place-items-center px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[16px] bg-white border border-line p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <Logo variant="dark" markSize={38} textSize={24} />
          <span className="text-[12px] text-stone">Admin</span>
        </div>
        <h1 className="text-[22px] font-semibold text-ink mt-4">Admin sign-in</h1>
        <p className="text-[14px] text-stone mt-1 mb-6">
          Sign in with an admin account from the users list.
        </p>

        <form onSubmit={signIn} className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[12px] bg-forest text-cream font-semibold py-3 text-[15px] hover:bg-forest-deep transition disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-[12px] bg-[#FBE9E4] border border-terra/40 text-ink text-[14px] p-3.5">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
