"use client";

/* Homepage flash-sale banner with a live countdown. Rendered only when a
   flash sale is currently live (see Admin → Flash sales). */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FlashSale } from "@/lib/types";
import { IconBolt } from "./Icons";

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

export default function FlashSaleBanner({ sale }: { sale: FlashSale }) {
  const left = useCountdown(sale.endsAt);
  const inner = (
    <>
      {sale.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sale.imageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-forest" aria-hidden />
      )}
      <div className="absolute inset-0 bg-ink/45" aria-hidden />
      <div className="relative flex flex-col items-start gap-3 p-8 sm:p-12 max-w-[640px]">
        <span className="inline-flex items-center gap-2 bg-terra text-white rounded-full px-4 py-1.5 text-[13px] font-bold tracking-[0.08em] uppercase">
          <IconBolt size={15} /> Flash sale
        </span>
        <h2 className="text-cream text-[clamp(30px,4vw,48px)] leading-tight">{sale.title}</h2>
        {sale.subtitle && <p className="text-cream/85 text-[16px]">{sale.subtitle}</p>}
        <div className="flex items-center gap-4 flex-wrap mt-1">
          {left && (
            <span className="bg-cream text-ink rounded-[12px] px-4 py-2 font-mono font-semibold text-[18px] tabular-nums" aria-label={`Ends in ${left}`}>
              {left}
            </span>
          )}
          {sale.linkUrl && sale.linkLabel && (
            <span className="btn btn-primary">{sale.linkLabel}</span>
          )}
        </div>
      </div>
    </>
  );
  const cls =
    "relative block overflow-hidden rounded-[28px] mx-auto max-w-7xl px-0 my-4 min-h-[280px] flex items-stretch";
  return sale.linkUrl ? (
    <Link href={sale.linkUrl} className={cls} aria-label={sale.title}>
      {inner}
    </Link>
  ) : (
    <div className={cls} role="region" aria-label={sale.title}>
      {inner}
    </div>
  );
}
