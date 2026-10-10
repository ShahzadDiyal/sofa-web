"use client";

/* /admin/login — the only public admin page. Signs in with Firebase Auth
   (Google or email/password), exchanges the ID token for a server session
   cookie via /api/admin/session, then lands on /admin. */

import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Logo from "@/components/Logo";
import { clientAuth, isFirebaseClientConfigured } from "@/lib/firebase";

function friendlyError(code: string): string {
  if (code.includes("wrong-password") || code.includes("invalid-credential"))
    return "Wrong email or password.";
  if (code.includes("user-not-found")) return "No account for that email.";
  if (code.includes("popup-closed")) return "Sign-in window was closed.";
  if (code.includes("operation-not-allowed"))
    return "This sign-in method is not enabled in Firebase Console → Authentication → Sign-in method.";
  return "Sign-in failed. Please try again.";
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finishSignIn(getToken: () => Promise<string>) {
    setBusy(true);
    setError("");
    try {
      const idToken = await getToken();
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Sign-in failed on the server.");
        setBusy(false);
        return;
      }
      window.location.replace("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  function withGoogle() {
    const auth = clientAuth();
    if (!auth) return setError("Firebase client is not configured (NEXT_PUBLIC_FIREBASE_*).");
    const provider = new GoogleAuthProvider();
    finishSignIn(async () => {
      try {
        const cred = await signInWithPopup(auth, provider);
        return await cred.user.getIdToken();
      } catch (e: unknown) {
        const code = e instanceof Error && "code" in e ? String((e as { code: string }).code) : "";
        throw new Error(friendlyError(code));
      }
    }).then(() => auth.signOut().catch(() => {}));
  }

  function withEmail(e: React.FormEvent) {
    e.preventDefault();
    const auth = clientAuth();
    if (!auth) return setError("Firebase client is not configured (NEXT_PUBLIC_FIREBASE_*).");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    const authRef = auth;
    finishSignIn(async () => {
      try {
        const cred = await signInWithEmailAndPassword(authRef, email.trim(), password);
        return await cred.user.getIdToken();
      } catch (e: unknown) {
        const code = e instanceof Error && "code" in e ? String((e as { code: string }).code) : "";
        throw new Error(friendlyError(code));
      }
    }).then(() => authRef.signOut().catch(() => {}));
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
          Only allow-listed email addresses can sign in.
        </p>

        {!isFirebaseClientConfigured() ? (
          <div className="rounded-[12px] bg-peach/40 border border-terra/30 text-ink text-[14px] p-4">
            Firebase client is not configured. Add the <code>NEXT_PUBLIC_FIREBASE_*</code> values
            to your hosting env vars and redeploy.
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={withGoogle}
              disabled={busy}
              className="w-full rounded-[12px] bg-forest text-cream font-semibold py-3 text-[15px] hover:bg-forest-deep transition disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[12px] text-stone">or with email</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={withEmail} className="flex flex-col gap-3">
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
                className="w-full rounded-[12px] border-2 border-forest text-forest font-semibold py-[10px] text-[15px] hover:bg-forest hover:text-cream transition disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in with email"}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-[12px] bg-[#FBE9E4] border border-terra/40 text-ink text-[14px] p-3.5">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
