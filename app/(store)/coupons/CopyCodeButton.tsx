"use client";

/* Copy-a-code button for the coupons page. */

import { useState } from "react";
import { IconCheck } from "@/components/Icons";

export default function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full font-semibold text-[15px] transition ${
        copied ? "bg-forest text-cream" : "bg-ink text-cream hover:bg-forest"
      }`}
      aria-live="polite"
    >
      {copied ? (
        <>
          <IconCheck size={16} /> Copied
        </>
      ) : (
        "Copy code"
      )}
    </button>
  );
}
