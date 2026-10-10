"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Color, Faq, Product, SiteSettings } from "@/lib/types";
import { gbp } from "@/lib/seo";
import { useStore } from "@/lib/store";
import SofaIllustration from "@/components/SofaIllustration";
import { ProductCard } from "@/components/storefront";
import { IconCash, IconCheck, IconMinus, IconPlus, IconTruck } from "@/components/Icons";

/* A purchasable colourway: the main fabric plus any "Also available" colours.
   Each colourway may carry its own photo (admin upload); otherwise the main
   product photo is shown, then the illustration. */
interface Colorway {
  name: string;
  hex: string;
  imageUrl?: string; // photo of this colourway (admin upload)
  swatchImage?: string; // library swatch image for the selector button
}

function baseColorways(product: Product): { name: string; hex?: string; imageUrl?: string }[] {
  const out: { name: string; hex?: string; imageUrl?: string }[] = [
    {
      name: product.fabricName || product.colourName || "Main",
      hex: product.fabric,
      imageUrl: product.imageUrl,
    },
  ];
  for (const line of product.details ?? []) {
    const m = /^Also available:\s*(.+?)\s*\(.+\)$/.exec(line);
    if (m && !out.some((c) => c.name === m[1])) {
      out.push({ name: m[1], imageUrl: product.colorImages?.[m[1]] });
    }
  }
  // Main colourway also picks up its per-colour photo when present.
  const mainPhoto = product.colorImages?.[out[0].name];
  if (mainPhoto) out[0].imageUrl = mainPhoto;
  return out;
}

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export default function ProductClient({
  product,
  related,
  settings,
}: {
  product: Product;
  related: Product[];
  faqs: Faq[];
  settings: SiteSettings;
}) {
  const router = useRouter();
  const { addToBasket } = useStore();
  const [libColors, setLibColors] = useState<Color[]>([]);
  useEffect(() => {
    fetch("/api/colors")
      .then((r) => r.json())
      .then((d) => setLibColors(d.colors ?? []))
      .catch(() => {});
  }, []);
  /* Real colourways, enriched with the managed colour library (hex + swatch). */
  const colorways: Colorway[] = useMemo(() => {
    const libByName = new Map(libColors.map((c) => [c.name, c]));
    return baseColorways(product).map((c) => {
      const lib = libByName.get(c.name);
      return {
        name: c.name,
        hex: c.hex || lib?.hex || product.fabric,
        imageUrl: c.imageUrl,
        swatchImage: lib?.imageUrl,
      };
    });
  }, [product, libColors]);
  const [colorIdx, setColorIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);
  const [postcode, setPostcode] = useState("");
  const [pcState, setPcState] = useState<"idle" | "ok" | "bad">("idle");
  const [added, setAdded] = useState(false);

  const selected = colorways[Math.min(colorIdx, colorways.length - 1)];
  /* Gallery photo for the selected colourway: its own photo, else the main
     product photo, else the illustration. */
  const galleryPhoto = selected.imageUrl || product.imageUrl;
  const thumbs = [product.bg, "#E3EBE4", "#F4E1D6"];

  const orderNow = () => {
    addToBasket(product, qty);
    router.push("/checkout");
  };
  const addBasket = () => {
    addToBasket(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-6 flex flex-wrap gap-14 pt-7 pb-[88px] items-start">
        {/* Gallery */}
        <div className="flex-1 basis-[520px] min-w-0 flex flex-col gap-4">
          <div className="rounded-[28px] overflow-hidden">
            {galleryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={galleryPhoto}
                alt={`${product.name} in ${selected.name}`}
                className="w-full aspect-[1/1.08] object-cover"
              />
            ) : (
              <SofaIllustration
                type={product.type}
                fabric={selected.hex}
                bg={thumbs[thumb]}
                accent={product.accent}
                title={`${product.name} in ${selected.name}`}
                className="w-full aspect-[1/1.08]"
              />
            )}
          </div>
          {!galleryPhoto && (
          <div className="grid grid-cols-4 gap-3">
            {thumbs.map((bg, i) => (
              <button
                key={bg}
                onClick={() => setThumb(i)}
                aria-label={`View ${product.name} on ${i === 0 ? "default" : "alternate"} background`}
                aria-pressed={thumb === i}
                className="rounded-[14px] overflow-hidden transition-shadow"
                style={thumb === i ? { outline: "2px solid #1F3A32", outlineOffset: "-2px" } : undefined}
              >
                <SofaIllustration type={product.type} fabric={selected.hex} bg={bg} accent={product.accent} className="w-full aspect-square" />
              </button>
            ))}
            <div className="rounded-[14px] bg-sand grid place-items-center aspect-square text-[13px] font-semibold text-muted text-center p-2">
              Fabric close-up
            </div>
          </div>
          )}
        </div>

        {/* Buy box */}
        <div className="flex-1 basis-[420px] min-w-0 flex flex-col gap-[22px]">
          <div className="flex flex-col gap-3">
            {product.tag && (
              <span className="self-start bg-peach text-terra px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-[0.08em] uppercase">
                {product.tag}
              </span>
            )}
            <h1 className="text-[clamp(34px,4vw,48px)] leading-tight">{product.name}</h1>
            <div className="flex items-center gap-2.5 text-sm text-body">
              <span className="text-terra tracking-[2px]" aria-label={`Rated ${product.rating ?? 5} out of 5`}>
                ★★★★★
              </span>
              <span>{product.reviewCount ?? 0} reviews</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3.5">
            <span className="font-serif font-semibold text-4xl">{gbp(product.price)}</span>
            {product.wasPrice && (
              <span className="text-muted text-lg line-through">{gbp(product.wasPrice)}</span>
            )}
          </div>

          <div className="bg-mint rounded-[18px] p-[18px_20px] flex gap-3.5 items-start">
            <span className="w-[42px] h-[42px] rounded-full bg-forest grid place-items-center flex-none text-cream">
              <IconCash size={20} />
            </span>
            <div>
              <div className="font-semibold text-forest">
                Pay {gbp(product.price)} when it arrives
              </div>
              <p className="text-sm text-forest-deep leading-relaxed mt-1">
                Nothing to pay today. Inspect your sofa at the door, then pay the driver.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-[15px]">
              <span className="font-semibold">Colour</span>
              <span className="text-body">{selected.name}</span>
            </div>
            <div className="flex gap-3 flex-wrap" role="group" aria-label="Choose colour">
              {colorways.map((c, i) => (
                <button
                  key={c.name}
                  aria-label={c.name}
                  aria-pressed={colorIdx === i}
                  title={c.name}
                  onClick={() => setColorIdx(i)}
                  className="w-11 h-11 rounded-full p-0 cursor-pointer border-[3px] border-cream transition-transform hover:scale-105 overflow-hidden"
                  style={
                    c.swatchImage
                      ? undefined
                      : { background: c.hex, outline: `2px solid ${colorIdx === i ? "#1F3A32" : "#DDD3C4"}` }
                  }
                >
                  {c.swatchImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.swatchImage}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ outline: `2px solid ${colorIdx === i ? "#1F3A32" : "#DDD3C4"}`, outlineOffset: "-2px" }}
                    />
                  ) : (
                    <span className="sr-only">{c.name}</span>
                  )}
                </button>
              ))}
            </div>
            {colorways.length > 1 && (
              <p className="text-[13px] text-muted">
                {selected.imageUrl
                  ? `Shown in ${selected.name}.`
                  : `Photo for ${selected.name} coming soon — showing the main product photo.`}
              </p>
            )}
          </div>

          <div className="flex gap-3.5 flex-wrap items-center">
            <div className="flex items-center border-[1.5px] border-line rounded-full bg-white">
              <button className="w-11 h-11 grid place-items-center rounded-full hover:bg-cream" aria-label="Decrease quantity" onClick={() => setQty((x) => Math.max(1, x - 1))}>
                <IconMinus size={18} />
              </button>
              <span className="min-w-7 text-center font-semibold" aria-live="polite">{qty}</span>
              <button className="w-11 h-11 grid place-items-center rounded-full hover:bg-cream" aria-label="Increase quantity" onClick={() => setQty((x) => Math.min(10, x + 1))}>
                <IconPlus size={18} />
              </button>
            </div>
            <button onClick={orderNow} className="btn btn-primary flex-1 basis-[220px]">
              Order now — pay on delivery
            </button>
          </div>
          <button onClick={addBasket} className="btn btn-outline self-start">
            {added ? (
              <>
                <IconCheck size={18} /> Added to basket
              </>
            ) : (
              "Add to basket"
            )}
          </button>

          <div className="border-[1.5px] border-line rounded-[18px] p-[18px_20px] flex flex-col gap-3 bg-white">
           <p className="text-[13px] text-muted">
                {settings.deliveryTimeText}
              </p>
             
          </div>

          <div className="flex flex-col">
            <details className="faq" open>
              <summary>
                Details
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <ul className="faq-answer list-disc pl-5 flex flex-col gap-1.5">
                {(product.details ?? []).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </details>
            <details className="faq">
              <summary>
                Delivery &amp; returns
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <p className="faq-answer">
                Free UK delivery on orders over {gbp(settings.freeDeliveryThreshold)} by a two-person
                team. Inspect before you pay. {settings.refusalPolicy}{" "}
                <Link href="/delivery" className="underline">Read the delivery policy</Link>.
              </p>
            </details>
            <div className="border-t border-line" />
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="bg-sand">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
            <h2 className="text-[clamp(30px,3.4vw,42px)]">You might also like</h2>
            <Link href="/sofas" className="font-semibold border-b-[1.5px] border-ink pb-0.5 hover:opacity-70">
              View all sofas
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
