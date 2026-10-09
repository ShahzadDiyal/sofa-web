/* Stylised vector sofa illustration — the product imagery for v1.
   Parameterised like the mockup's <dc-import name="Sofa">:
   fabric (upholstery), bg (backdrop), accent (throw pillows), type. */

import type { SofaType } from "@/lib/types";

function shade(hex: string, pct: number): string {
  const n = hex.replace("#", "");
  const num = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  const amt = Math.round(2.55 * pct);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

interface Props {
  type: SofaType;
  fabric: string;
  bg: string;
  accent?: string;
  className?: string;
  title?: string;
}

export default function SofaIllustration({ type, fabric, bg, accent = "#B65A35", className, title }: Props) {
  const dark = shade(fabric, -18);
  const darker = shade(fabric, -32);
  const light = shade(fabric, 12);
  const id = `${type}-${fabric.replace("#", "")}`;

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      aria-label={title ?? "Sofa illustration"}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(bg, 8)} />
          <stop offset="100%" stopColor={shade(bg, -6)} />
        </linearGradient>
        <linearGradient id={`${id}-fab`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={fabric} />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${id}-bg)`} />
      {/* soft wall/floor horizon */}
      <rect y="228" width="400" height="72" fill={shade(bg, -10)} opacity="0.55" />
      <ellipse cx="200" cy="252" rx="150" ry="14" fill="#000" opacity="0.08" />

      {type === "corner" ? (
        <g>
          {/* chaise extension (right) */}
          <rect x="248" y="150" width="112" height="76" rx="20" fill={dark} />
          <rect x="248" y="142" width="112" height="60" rx="18" fill={`url(#${id}-fab)`} />
          <rect x="330" y="118" width="34" height="92" rx="16" fill={dark} />
          {/* main body */}
          <rect x="52" y="96" width="220" height="60" rx="24" fill={dark} />
          <rect x="40" y="118" width="34" height="104" rx="16" fill={`url(#${id}-fab)`} />
          <rect x="238" y="118" width="30" height="104" rx="14" fill={`url(#${id}-fab)`} />
          <rect x="66" y="146" width="180" height="52" rx="16" fill={`url(#${id}-fab)`} />
          <line x1="126" y1="146" x2="126" y2="198" stroke={dark} strokeWidth="3" opacity="0.6" />
          <line x1="186" y1="146" x2="186" y2="198" stroke={dark} strokeWidth="3" opacity="0.6" />
          <rect x="52" y="192" width="308" height="34" rx="12" fill={darker} />
          {/* pillows */}
          <rect x="92" y="112" width="52" height="52" rx="14" fill={accent} transform="rotate(-8 118 138)" />
          <rect x="160" y="116" width="48" height="48" rx="14" fill={shade(accent, 18)} transform="rotate(7 184 140)" />
          {/* legs */}
          <rect x="62" y="226" width="14" height="22" rx="4" fill={darker} />
          <rect x="232" y="226" width="14" height="22" rx="4" fill={darker} />
          <rect x="336" y="226" width="14" height="22" rx="4" fill={darker} />
        </g>
      ) : type === "chair" ? (
        <g>
          <rect x="118" y="92" width="164" height="66" rx="28" fill={dark} />
          <rect x="100" y="118" width="36" height="108" rx="17" fill={`url(#${id}-fab)`} />
          <rect x="264" y="118" width="36" height="108" rx="17" fill={`url(#${id}-fab)`} />
          <rect x="132" y="148" width="136" height="54" rx="16" fill={`url(#${id}-fab)`} />
          <rect x="112" y="196" width="176" height="32" rx="12" fill={darker} />
          <rect x="150" y="112" width="56" height="56" rx="15" fill={accent} transform="rotate(-7 178 140)" />
          <rect x="128" y="228" width="14" height="22" rx="4" fill={darker} />
          <rect x="258" y="228" width="14" height="22" rx="4" fill={darker} />
        </g>
      ) : (
        <g>
          {/* backrest */}
          <rect x="72" y="88" width="256" height="72" rx="30" fill={dark} />
          <rect x="80" y="96" width="240" height="56" rx="24" fill={`url(#${id}-fab)`} />
          {/* arms */}
          <rect x="52" y="120" width="38" height="106" rx="18" fill={`url(#${id}-fab)`} />
          <rect x="310" y="120" width="38" height="106" rx="18" fill={`url(#${id}-fab)`} />
          {/* seat cushions */}
          <rect x="88" y="150" width="224" height="54" rx="16" fill={`url(#${id}-fab)`} />
          <line x1="163" y1="150" x2="163" y2="204" stroke={dark} strokeWidth="3" opacity="0.55" />
          <line x1="237" y1="150" x2="237" y2="204" stroke={dark} strokeWidth="3" opacity="0.55" />
          {type === "sofa-bed" && (
            <line x1="92" y1="118" x2="308" y2="118" stroke={dark} strokeWidth="3" strokeDasharray="8 6" opacity="0.7" />
          )}
          {/* base */}
          <rect x="64" y="198" width="272" height="32" rx="12" fill={darker} />
          {/* throw pillows */}
          <rect x="104" y="112" width="54" height="54" rx="15" fill={accent} transform="rotate(-8 131 139)" />
          <rect x="240" y="114" width="50" height="50" rx="15" fill={shade(accent, 16)} transform="rotate(8 265 139)" />
          {/* legs */}
          <rect x="78" y="230" width="14" height="20" rx="4" fill={darker} />
          <rect x="308" y="230" width="14" height="20" rx="4" fill={darker} />
        </g>
      )}
    </svg>
  );
}
