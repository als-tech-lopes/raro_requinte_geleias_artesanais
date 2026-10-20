"use client";

import { MessageCircle, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { AddToCart } from "./add-to-cart";
import { normalizeWhatsapp } from "@/services/catalog";
import type { CatalogProduct, CatalogSettings } from "@/types/catalog";

export function ProductOrder({ product, settings }: { product: CatalogProduct; settings: CatalogSettings }) {
  const [quantity, setQuantity] = useState(1);
  const phone = normalizeWhatsapp(settings.whatsapp);
  function whatsapp() { const message = `Olá! Gostaria de confirmar a disponibilidade de ${quantity}x ${product.name} ${product.netWeight} ${product.unit}.\n\nPreço e disponibilidade sujeitos à confirmação.`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); }
  return <div><div className="mb-5 flex items-center gap-3"><span className="text-sm font-bold">Quantidade</span><div className="flex items-center rounded-full border border-[#d8cbb9] bg-white"><button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="p-2.5"><Minus size={16} /></button><span className="min-w-10 text-center font-bold">{quantity}</span><button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity(value => value + 1)} className="p-2.5"><Plus size={16} /></button></div></div><div className="flex flex-col gap-3 sm:flex-row"><AddToCart productId={product.id} available={product.available} quantity={quantity} />{settings.whatsappEnabled && phone && product.available && <button type="button" onClick={whatsapp} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--catalog-primary)] px-6 py-3 text-sm font-bold text-[var(--catalog-primary)]"><MessageCircle size={18} />Pedir pelo WhatsApp</button>}</div></div>;
}
