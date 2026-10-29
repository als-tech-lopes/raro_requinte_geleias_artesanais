"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCart } from "./cart-context";

export function AddToCart({ productId, variationId, available, quantity = 1, compact = false }: { productId: string; variationId: string; available: boolean; quantity?: number; compact?: boolean }) {
  const { add } = useCart(); const [added, setAdded] = useState(false);
  function handleClick() { add(productId, variationId, quantity); setAdded(true); setTimeout(() => setAdded(false), 1600); }
  return <button type="button" data-jam-burst="strong" disabled={!available} onClick={handleClick} className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition ${compact ? "px-4 py-2.5 text-xs" : "px-6 py-3 text-sm"} ${available ? "bg-[var(--catalog-secondary)] text-white hover:brightness-90 active:scale-95" : "cursor-not-allowed bg-stone-200 text-stone-500"}`}>{added ? <Check size={17} /> : <ShoppingBag size={17} />}{available ? added ? "Adicionado" : "Adicionar à sacola" : "Esgotado"}</button>;
}
