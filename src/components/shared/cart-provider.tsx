"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { OrderTypeKey } from "@/lib/pricing";

export interface CartItem {
  productId: string;
  orderType: OrderTypeKey;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  setQty: (productId: string, orderType: OrderTypeKey, qty: number) => void;
  remove: (productId: string, orderType: OrderTypeKey) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "aquanest_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      add: (item) => {
        const existing = items.find((i) => i.productId === item.productId && i.orderType === item.orderType);
        persist(
          existing
            ? items.map((i) => (i === existing ? { ...i, quantity: Math.min(99, i.quantity + item.quantity) } : i))
            : [...items, item]
        );
      },
      setQty: (productId, orderType, qty) =>
        persist(
          qty <= 0
            ? items.filter((i) => !(i.productId === productId && i.orderType === orderType))
            : items.map((i) => (i.productId === productId && i.orderType === orderType ? { ...i, quantity: Math.min(99, qty) } : i))
        ),
      remove: (productId, orderType) => persist(items.filter((i) => !(i.productId === productId && i.orderType === orderType))),
      replace: (next) => persist(next),
      clear: () => persist([]),
    }),
    [items, persist]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
