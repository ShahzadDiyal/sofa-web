"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/storefront";
import { IconHeart } from "@/components/Icons";

export default function WishlistClient() {
  const { wishlist } = useStore();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products))
      .catch(() => setProducts([]));
  }, []);

  const saved = products?.filter((p) => wishlist.includes(p.id)) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-24">
      <h1 className="text-[clamp(34px,4vw,48px)] mb-2">Wishlist</h1>
      <p className="text-body mb-10">
        {saved.length === 0
          ? "Tap the heart on any sofa to save it here."
          : `${saved.length} ${saved.length === 1 ? "sofa" : "sofas"} saved.`}
      </p>

      {products === null ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading wishlist">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="skeleton aspect-square rounded-[18px]!" />
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-6 w-1/3" />
            </div>
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-4">
          <span className="w-16 h-16 rounded-full bg-peach grid place-items-center text-terra">
            <IconHeart size={28} />
          </span>
          <h2 className="text-3xl">Nothing saved yet</h2>
          <p className="text-body max-w-[40ch]">
            Browse the collection and tap the heart on the sofas you love — they&apos;ll wait for you here.
          </p>
          <Link href="/sofas" className="btn btn-primary mt-2">Shop all sofas</Link>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
