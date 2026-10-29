"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartEntry } from "@/types/catalog";

const storageKey = "rr-catalog-cart-v1";
type CartContextValue = { entries: CartEntry[]; count: number; ready: boolean; add: (productId: string, variationId: string, quantity?: number) => void; update: (productId: string, variationId: string, quantity: number) => void; remove: (productId: string, variationId: string) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as CartEntry[]; setEntries(value.filter(item => typeof item.productId === "string" && Number.isInteger(item.quantity) && item.quantity > 0)); } catch { setEntries([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(storageKey, JSON.stringify(entries)); }, [entries, ready]);
  const value = useMemo<CartContextValue>(() => ({ entries, ready, count: entries.reduce((sum, item) => sum + item.quantity, 0), add(productId, variationId, quantity = 1) { setEntries(current => { const found = current.find(item => item.productId === productId && item.variationId === variationId); return found ? current.map(item => item.productId === productId && item.variationId === variationId ? { ...item, quantity: item.quantity + Math.max(1, Math.trunc(quantity)) } : item) : [...current, { productId, variationId, quantity: Math.max(1, Math.trunc(quantity)) }]; }); }, update(productId, variationId, quantity) { setEntries(current => quantity > 0 ? current.map(item => item.productId === productId && (item.variationId ?? variationId) === variationId ? { ...item, variationId, quantity: Math.trunc(quantity) } : item) : current.filter(item => !(item.productId === productId && (item.variationId ?? variationId) === variationId))); }, remove(productId, variationId) { setEntries(current => current.filter(item => !(item.productId === productId && (item.variationId ?? variationId) === variationId))); }, clear() { setEntries([]); } }), [entries, ready]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart deve ser usado dentro de CartProvider"); return value; }
