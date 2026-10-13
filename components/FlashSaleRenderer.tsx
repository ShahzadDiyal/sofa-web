"use client";

/* Flash-sale banner renderer. Handles every builder option:
   - templates: classic / bold / minimal / strip / custom (admin HTML)
   - animations: fade-in / slide-up / pulse / marquee (see globals.css)
   - display: inline banner or popup overlay
   - closeable: dismiss button (remembered for the session)
   - customCss: admin-supplied CSS for borders, animations, anything
   Targeting (which page/product) is decided by the caller via flashSaleTargets. */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FlashSale } from "@/lib/types";
import { IconBolt, IconX } from "./Icons";

function useCountdown(target?: string) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!target) return;
    const end = Date.parse(target);
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLeft(d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

const CONTAINER_ANIM: Record<string, string> = {
  "fade-in": "sofora-anim-fade-in",
  "slide-up": "sofora-anim-slide-up",
  pulse: "sofora-anim-pulse",
};

function bgStyle(sale: FlashSale): React.CSSProperties {
  // bgColor may be a plain colour or a full CSS background (e.g. a gradient).
  return sale.bgColor ? { background: sale.bgColor } : { background: "#2E4B3F" };
}

function Cta({ sale, dark }: { sale: FlashSale; dark?: boolean }) {
  if (!sale.linkUrl || !sale.linkLabel) return null;
  return (
    <Link
      href={sale.linkUrl}
      className={`inline-flex items-center justify-center min-h-[48px] px-7 rounded-full font-semibold text-[15px] transition hover:opacity-90 ${
        dark ? "bg-cream text-ink" : "bg-terra text-white"
      }`}
    >
      {sale.linkLabel}
    </Link>
  );
}

function Countdown({ sale, light }: { sale: FlashSale; light?: boolean }) {
  const left = useCountdown(sale.endsAt);
  if (!left) return null;
  return (
    <span
      className={`rounded-[12px] px-4 py-2 font-mono font-semibold text-[18px] tabular-nums ${
        light ? "bg-ink/25 text-cream" : "bg-cream text-ink"
      }`}
      aria-label={`Ends in ${left}`}
    >
      {left}
    </span>
  );
}

function Badge() {
  return (
    <span className="inline-flex items-center gap-2 bg-terra text-white rounded-full px-4 py-1.5 text-[13px] font-bold tracking-[0.08em] uppercase">
      <IconBolt size={15} /> Flash sale
    </span>
  );
}

function BgImage({ sale }: { sale: FlashSale }) {
  if (!sale.imageUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sale.imageUrl} alt="" aria-hidden loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
  );
}

/** Built-in template bodies. `custom` is handled separately (raw HTML). */
function TemplateBody({ sale }: { sale: FlashSale }) {
  const template = sale.template || "classic";
  const marquee = sale.animation === "marquee";

  if (template === "bold") {
    const title = (
      <h2 className="text-cream text-[clamp(34px,5vw,64px)] font-bold leading-tight tracking-tight">{sale.title}</h2>
    );
    return (
      <div className="relative flex flex-col items-center text-center gap-4 p-10 sm:p-14 overflow-hidden">
        <Badge />
        {marquee ? (
          <div className="w-full overflow-hidden" aria-label={sale.title}>
            <div className="sofora-anim-marquee-inner gap-12">
              <span className="text-cream text-[clamp(34px,5vw,64px)] font-bold whitespace-nowrap pr-12">{sale.title}&nbsp;·&nbsp;</span>
              <span className="text-cream text-[clamp(34px,5vw,64px)] font-bold whitespace-nowrap pr-12" aria-hidden>{sale.title}&nbsp;·&nbsp;</span>
            </div>
          </div>
        ) : (
          title
        )}
        {sale.subtitle && <p className="text-cream/85 text-[17px] max-w-[560px]">{sale.subtitle}</p>}
        <div className="flex items-center gap-4 flex-wrap justify-center mt-1">
          <Countdown sale={sale} light />
          <Cta sale={sale} dark />
        </div>
      </div>
    );
  }

  if (template === "minimal") {
    return (
      <div className="relative flex items-center justify-between gap-4 flex-wrap p-6 sm:px-10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-terra text-white flex-none">
            <IconBolt size={18} />
          </span>
          <p className="text-cream font-semibold text-[17px] truncate">{sale.title}</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Countdown sale={sale} light />
          {sale.linkUrl && sale.linkLabel && (
            <Link href={sale.linkUrl} className="text-cream font-semibold text-[15px] underline underline-offset-4 hover:opacity-80">
              {sale.linkLabel}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (template === "strip") {
    const line = (
      <p className="text-cream text-[15px] font-semibold tracking-wide whitespace-nowrap">
        <IconBolt size={15} className="inline-block -mt-0.5 mr-2" />
        {sale.title}
        {sale.subtitle ? <span className="font-normal text-cream/80"> — {sale.subtitle}</span> : null}
        {sale.linkUrl && sale.linkLabel ? (
          <Link href={sale.linkUrl} className="underline underline-offset-4 ml-3 hover:opacity-80">
            {sale.linkLabel}
          </Link>
        ) : null}
      </p>
    );
    return (
      <div className="relative px-4 py-3.5 flex justify-center overflow-hidden">
        {marquee ? (
          <div className="w-full overflow-hidden">
            <div className="sofora-anim-marquee-inner">
              <span className="pr-16">{line}</span>
              <span className="pr-16" aria-hidden>{line}</span>
            </div>
          </div>
        ) : (
          line
        )}
      </div>
    );
  }

  // classic (default)
  return (
    <div className="relative">
      <BgImage sale={sale} />
      {!sale.imageUrl && <div className="absolute inset-0" aria-hidden style={bgStyle(sale)} />}
      <div className="absolute inset-0 bg-ink/45" aria-hidden />
      <div className="relative flex flex-col items-start gap-3 p-8 sm:p-12 max-w-[640px]">
        <Badge />
        <h2 className="text-cream text-[clamp(30px,4vw,48px)] leading-tight">{sale.title}</h2>
        {sale.subtitle && <p className="text-cream/85 text-[16px]">{sale.subtitle}</p>}
        <div className="flex items-center gap-4 flex-wrap mt-1">
          <Countdown sale={sale} />
          <Cta sale={sale} />
        </div>
      </div>
    </div>
  );
}

export default function FlashSaleRenderer({ sale, preview }: { sale: FlashSale; preview?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (preview) return;
    try {
      if (sessionStorage.getItem(`sofora-sale-${sale.id}`)) setDismissed(true);
    } catch {
      /* storage unavailable — show the banner */
    }
  }, [sale.id, preview]);

  if (dismissed) return null;

  const mode = sale.displayMode || "inline";
  const closeable = sale.closeable !== false;
  const animClass = sale.animation && sale.animation !== "none" && sale.animation !== "marquee"
    ? CONTAINER_ANIM[sale.animation] ?? ""
    : "";
  const isCustom = sale.template === "custom" && sale.contentHtml;

  const dismiss = () => {
    if (!preview) {
      try {
        sessionStorage.setItem(`sofora-sale-${sale.id}`, "1");
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  };

  const closeBtn = closeable ? (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss banner"
      className="absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-full bg-ink/50 text-cream hover:bg-ink/70 transition"
    >
      <IconX size={16} />
    </button>
  ) : null;

  const body = isCustom ? (
    // Admin-authored HTML — trusted content from the store owner.
    <div dangerouslySetInnerHTML={{ __html: sale.contentHtml! }} />
  ) : (
    <TemplateBody sale={sale} />
  );

  // Popups check session dismissal after mount to avoid hydration flashes;
  // inline banners render immediately (also in SSR HTML).
  if (!mounted && !preview && mode === "popup") return null;

  return (
    <>
      {sale.customCss ? <style>{sale.customCss}</style> : null}
      {mode === "popup" && !preview ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={sale.title}>
          <div className="absolute inset-0 bg-ink/60" onClick={closeable ? dismiss : undefined} aria-hidden />
          <div className={`relative w-full max-w-[600px] rounded-[24px] overflow-hidden shadow-2xl ${animClass}`} style={bgStyle(sale)}>
            {closeBtn}
            {body}
          </div>
        </div>
      ) : (
        <section aria-label={sale.title} className={`relative overflow-hidden rounded-[24px] ${animClass}`} style={bgStyle(sale)}>
          {preview && (
            <span className="absolute top-2 left-3 z-10 text-[11px] font-semibold uppercase tracking-widest text-cream/60">
              Preview{mode === "popup" ? " — popup" : ""}
            </span>
          )}
          {closeBtn}
          {body}
        </section>
      )}
    </>
  );
}
