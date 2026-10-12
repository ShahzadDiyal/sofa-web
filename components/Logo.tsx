import Image from "next/image";

export default function Logo({
  variant = "dark",
  markSize = 38,
  textSize = 27,
  src,
}: {
  variant?: "dark" | "light";
  markSize?: number;
  textSize?: number;
  /** Override the logo image (Admin → Settings → Logo & favicon). */
  src?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src={src || "/brand/sofora-mark.png"}
        alt="Sofora logo"
        width={markSize}
        height={markSize}
        className="rounded-[10px] shrink-0"
      />
      <span
        className={`font-semibold tracking-tight leading-none ${
          variant === "light" ? "text-cream" : "text-ink"
        }`}
        style={{ fontSize: textSize }}
      >
        Sofora
      </span>
    </span>
  );
}
