"use client";

/* Client-side basket + wishlist, persisted to localStorage.
   Checkout prices are always re-validated server-side. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BasketItem, Product } from "@/lib/types";

const BASKET_KEY = "sofora-basket";
const WISHLIST_KEY = "sofora-wishlist";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Store {
  basket: BasketItem[];
  addToBasket: (p: Product, qty?: number) => void;
  removeFromBasket: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clearBasket: () => void;
  basketCount: number;
  basketTotal: number;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBasket(read(BASKET_KEY, []));
    setWishlist(read(WISHLIST_KEY, []));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
  }, [basket, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready]);

  const addToBasket = useCallback((p: Product, qty = 1) => {
    setBasket((b) => {
      const i = b.findIndex((x) => x.productId === p.id);
      if (i >= 0) {
        const next = [...b];
        next[i] = { ...next[i], qty: Math.min(10, next[i].qty + qty) };
        return next;
      }
      return [
        ...b,
        {
          productId: p.id,
          slug: p.slug,
          name: p.name,
          price: p.price,
          qty: Math.min(10, qty),
          fabric: p.fabric,
          bg: p.bg,
          type: p.type,
        },
      ];
    });
  }, []);

  const removeFromBasket = useCallback((productId: string) => {
    setBasket((b) => b.filter((x) => x.productId !== productId));
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setBasket((b) =>
      qty <= 0
        ? b.filter((x) => x.productId !== productId)
        : b.map((x) => (x.productId === productId ? { ...x, qty: Math.min(10, qty) } : x))
    );
  }, []);

  const clearBasket = useCallback(() => setBasket([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((w) => (w.includes(productId) ? w.filter((x) => x !== productId) : [...w, productId]));
  }, []);

  const isWishlisted = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const value = useMemo<Store>(
    () => ({
      basket,
      addToBasket,
      removeFromBasket,
      setQty,
      clearBasket,
      basketCount: basket.reduce((s, i) => s + i.qty, 0),
      basketTotal: basket.reduce((s, i) => s + i.qty * i.price, 0),
      wishlist,
      toggleWishlist,
      isWishlisted,
    }),
    [basket, wishlist, addToBasket, removeFromBasket, setQty, clearBasket, toggleWishlist, isWishlisted]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
