"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { Loader2, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "./cart-context";
import { PublicImage } from "./public-image";
import { normalizeWhatsapp, validateCart } from "@/services/catalog";
import type { CatalogSettings, ValidatedCartItem } from "@/types/catalog";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const itemKey = (item: { productId: string; variationId: string }) => `${item.productId}:${item.variationId}`;

export function CartView({ settings }: { settings: CatalogSettings }) {
  const { entries, ready, update, remove, clear } = useCart();
  const [items, setItems] = useState<ValidatedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const previousPrices = useRef(new Map<string, number>());
  const refresh = useCallback(async () => {
    if (!ready) return [];
    setLoading(true); setError(null);
    try {
      const current = await validateCart(entries);
      const changed = current.some(item => item.price !== null && previousPrices.current.has(itemKey(item)) && previousPrices.current.get(itemKey(item)) !== item.price);
      if (changed) setNotice("Um preço mudou e a sacola foi atualizada com o valor atual.");
      current.forEach(item => { if (item.price !== null) previousPrices.current.set(itemKey(item), item.price); });
      setItems(current); return current;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a sacola."); return []; }
    finally { setLoading(false); }
  }, [entries, ready]);
  useEffect(() => { void refresh(); }, [refresh]);
  const validItems = items.filter(item => item.valid && item.price !== null);
  const subtotal = validItems.reduce((sum, item) => sum + item.price! * item.quantity, 0);
  const phone = normalizeWhatsapp(settings.whatsapp);
  const canSend = validItems.length > 0 && validItems.length === items.length && Boolean(phone) && settings.whatsappEnabled;
  async function send() {
    const current = await refresh();
    if (!current.length || current.some(item => !item.valid || item.price === null)) { setError("Revise os itens indisponíveis antes de enviar o pedido."); return; }
    if (!phone) { setError("O WhatsApp comercial ainda não foi configurado. Consulte a página de contato."); return; }
    const total = current.reduce((sum, item) => sum + item.price! * item.quantity, 0);
    const text = ["Olá! Gostaria de fazer um pedido:", "", ...current.map(item => `${item.quantity}x ${item.name} ${item.netWeight} ${item.unit} — ${money.format(item.price! * item.quantity)}`), "", `Total estimado: ${money.format(total)}`, "", "Gostaria de confirmar a disponibilidade e combinar a entrega.", "Preços e disponibilidade sujeitos à confirmação."].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  if (!ready || loading) return <div className="flex justify-center gap-2 py-20 text-sm"><Loader2 className="animate-spin" />Atualizando preços e disponibilidade...</div>;
  if (!entries.length) return <div className="mx-auto max-w-xl py-24 text-center"><ShoppingBag className="mx-auto text-[var(--catalog-secondary)]" size={42} /><h1 className="mt-5 font-serif text-4xl font-bold">Sua sacola está vazia</h1><p className="mt-3 text-[#756b61]">Explore os sabores disponíveis e monte seu pedido.</p><Link href="/catalogo" className="mt-7 inline-flex rounded-full bg-[var(--catalog-primary)] px-6 py-3 text-sm font-bold text-white">Conhecer as geleias</Link></div>;
  return <div className="grid gap-7 lg:grid-cols-[1fr_380px]"><section className="space-y-3">{notice && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{notice}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{items.map(item => <article key={itemKey(item)} className="flex gap-4 rounded-[1.25rem] border border-[#dfd4c2] bg-[#fffdf8] p-4"><PublicImage src={item.imageUrl} alt={item.name ?? "Produto indisponível"} className="h-24 w-24 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><h2 className="font-serif text-lg font-bold">{item.name ?? "Produto indisponível"}</h2>{item.netWeight && <p className="text-xs text-[#81776e]">{item.netWeight} {item.unit}</p>}</div><button type="button" aria-label="Remover item" onClick={() => remove(item.productId, item.variationId)} className="h-fit p-2 text-red-700"><Trash2 size={17} /></button></div>{!item.valid ? <p className="mt-3 text-sm font-semibold text-red-700">{item.reason}</p> : <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center rounded-full border bg-white"><button type="button" aria-label="Diminuir" onClick={() => update(item.productId, item.variationId, item.quantity - 1)} className="p-2"><Minus size={14} /></button><span className="min-w-9 text-center text-sm font-bold">{item.quantity}</span><button type="button" aria-label="Aumentar" onClick={() => update(item.productId, item.variationId, item.quantity + 1)} className="p-2"><Plus size={14} /></button></div>{settings.showPrices && item.price !== null && <strong>{money.format(item.price * item.quantity)}</strong>}</div>}</div></article>)}</section><aside><div className="sticky top-24 rounded-[1.5rem] bg-[#263d31] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#dec7a1]">Resumo do pedido</p><div className="mt-5 flex justify-between border-b border-white/15 pb-4"><span>Subtotal estimado</span><strong className="font-serif text-2xl">{settings.showPrices ? money.format(subtotal) : "A confirmar"}</strong></div><p className="mt-4 text-xs leading-5 text-white/60">O envio pelo WhatsApp não confirma a venda, não reserva estoque e não realiza cobrança.</p><button type="button" disabled={!canSend} onClick={() => void send()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#263d31] disabled:cursor-not-allowed disabled:opacity-40"><MessageCircle size={18} />Enviar pelo WhatsApp</button>{!phone && <p className="mt-3 text-xs text-amber-200">WhatsApp comercial não configurado. Consulte nossos contatos.</p>}<button type="button" onClick={clear} className="mt-3 w-full py-2 text-xs font-semibold text-white/60 hover:text-white">Esvaziar sacola</button></div></aside></div>;
}
