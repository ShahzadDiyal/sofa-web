import type { Color } from "@/lib/types";

/* Colour swatch: uploaded image when present, otherwise the hex colour. */

export function ColorSwatch({ color, size = 40 }: { color: Pick<Color, "hex" | "imageUrl" | "name">; size?: number }) {
  const style = { width: size, height: size } as const;
  if (color.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={color.imageUrl}
        alt={color.name}
        style={style}
        className="rounded-full object-cover border border-line flex-none"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: color.hex || "#DDD3C4" }}
      className="rounded-full border border-line flex-none"
    />
  );
}
