"use client";

/* Toast notification system: success / error / info toasts for admin and
   storefront actions. Mount <ToastProvider> once (root layout); call
   const { success, error, info } = useToast() anywhere inside. Toasts
   auto-dismiss after 4.5s and survive client-side navigation. */

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastApi {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}

const KIND_STYLE: Record<ToastKind, { ring: string; icon: ReactNode; label: string }> = {
  success: {
    ring: "bg-[#E3F0E6] text-[#1F6B3A]",
    label: "Success",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    ring: "bg-[#F6DDD8] text-[#B3402F]",
    label: "Error",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  info: {
    ring: "bg-[#EFE8DC] text-[#1F3A32]",
    label: "Notice",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
};

const DISMISS_MS = 4500;
const MAX_STACK = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-(MAX_STACK - 1)), { id, kind, title, message }]);
    window.setTimeout(() => dismiss(id), DISMISS_MS);
  }, [dismiss]);

  const api: ToastApi = {
    toast,
    success: (title, message) => toast("success", title, message),
    error: (title, message) => toast("error", title, message),
    info: (title, message) => toast("info", title, message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 flex flex-col gap-3 sm:w-[360px] pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const s = KIND_STYLE[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="toast-in pointer-events-auto flex items-start gap-3 bg-white rounded-[16px] border border-line shadow-[0_10px_36px_rgba(31,58,50,0.18)] px-4 py-3.5"
            >
              <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${s.ring}`} aria-hidden>
                {s.icon}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14px] font-semibold text-ink leading-snug">{t.title}</p>
                {t.message && <p className="text-[13px] text-muted leading-snug mt-0.5">{t.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label={`Dismiss ${s.label.toLowerCase()} notification`}
                className="text-muted hover:text-ink transition-colors p-1 -m-1 shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
