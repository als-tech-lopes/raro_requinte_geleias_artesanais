"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { Loader2, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Dialog as SheetPrimitive } from "radix-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeWhatsapp, validateCart } from "@/services/catalog";
import type { CatalogSettings, ValidatedCartItem } from "@/types/catalog";
import { useCart } from "./cart-context";
import { PublicImage } from "./public-image";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const itemKey = (item: { productId: string; variationId: string }) => `${item.productId}:${item.variationId}`;

export function CartDrawer({ settings }: { settings: CatalogSettings }) {
  const { entries, ready, isOpen, setCartOpen, closeCart, update, remove, clear } = useCart();
  const [items, setItems] = useState<ValidatedCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ready) return [];
    setLoading(true);
    setError(null);
    try {
      const current = await validateCart(entries);
      setItems(current);
      return current;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a sacola.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [entries, ready]);

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen, refresh]);

  const validItems = useMemo(() => items.filter(item => item.valid && item.price !== null), [items]);
  const subtotal = validItems.reduce((sum, item) => sum + item.price! * item.quantity, 0);
  const phone = normalizeWhatsapp(settings.whatsapp);
  const canSend = validItems.length > 0 && validItems.length === items.length && Boolean(phone) && settings.whatsappEnabled;

  async function send() {
    const current = await refresh();
    if (!current.length || current.some(item => !item.valid || item.price === null)) {
      setError("Revise os itens indisponíveis antes de enviar o pedido.");
      return;
    }
    if (!phone) {
      setError("O WhatsApp comercial ainda não foi configurado. Consulte a página de contato.");
      return;
    }
    const total = current.reduce((sum, item) => sum + item.price! * item.quantity, 0);
    const text = [
      "Olá! Gostaria de fazer um pedido:",
      "",
      ...current.map(item => `${item.quantity}x ${item.name} ${item.netWeight} ${item.unit} — ${money.format(item.price! * item.quantity)}`),
      "",
      `Total estimado: ${money.format(total)}`,
      "",
      "Gostaria de confirmar a disponibilidade e combinar a entrega.",
      "Preços e disponibilidade sujeitos à confirmação.",
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <SheetPrimitive.Root open={isOpen} onOpenChange={setCartOpen}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <SheetPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 border-l border-[#dfd4c2] bg-[#fffdf8] p-0 text-[#29231d] shadow-xl transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right sm:max-w-md">
        <div className="relative border-b border-[#e7dccb] px-5 py-5 pr-16 text-left">
          <SheetPrimitive.Title className="font-serif text-2xl font-bold">Minha sacola</SheetPrimitive.Title>
          <SheetPrimitive.Description className="text-sm text-[#756b61]">
            Confira seu pedido ou continue escolhendo seus sabores.
          </SheetPrimitive.Description>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fechar sacola"
            className="absolute right-5 top-5 rounded-full border border-[#dfd4c2] bg-white p-2 text-[var(--catalog-primary)] transition hover:bg-[#f0e7d9]"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!ready || loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#756b61]">
              <Loader2 className="animate-spin" size={19} />Atualizando preços e disponibilidade...
            </div>
          ) : !entries.length ? (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto text-[var(--catalog-secondary)]" size={40} />
              <p className="mt-4 font-serif text-2xl font-bold">Sua sacola está vazia</p>
              <p className="mt-2 text-sm text-[#756b61]">Escolha uma geleia para começar seu pedido.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {items.map(item => (
                <article key={itemKey(item)} className="flex gap-3 rounded-2xl border border-[#dfd4c2] bg-white p-3">
                  <PublicImage src={item.imageUrl} alt={item.name ?? "Produto indisponível"} className="h-20 w-20 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-serif font-bold">{item.name ?? "Produto indisponível"}</h3>
                        {item.netWeight && <p className="text-xs text-[#81776e]">{item.netWeight} {item.unit}</p>}
                      </div>
                      <button type="button" aria-label={`Remover ${item.name ?? "item"}`} onClick={() => remove(item.productId, item.variationId)} className="rounded-full p-1.5 text-red-700 transition hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {!item.valid ? (
                      <p className="mt-2 text-xs font-semibold text-red-700">{item.reason}</p>
                    ) : (
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-full border border-[#dfd4c2]">
                          <button type="button" aria-label={`Diminuir quantidade de ${item.name}`} onClick={() => update(item.productId, item.variationId, item.quantity - 1)} className="p-1.5"><Minus size={13} /></button>
                          <span className="min-w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button type="button" aria-label={`Aumentar quantidade de ${item.name}`} onClick={() => update(item.productId, item.variationId, item.quantity + 1)} className="p-1.5"><Plus size={13} /></button>
                        </div>
                        {settings.showPrices && item.price !== null && <strong className="text-sm">{money.format(item.price * item.quantity)}</strong>}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {entries.length > 0 && (
          <div className="border-t border-[#dfd4c2] bg-[#f7f1e5] px-5 py-5">
            <div className="flex items-end justify-between gap-4">
              <span className="text-sm text-[#756b61]">Subtotal estimado</span>
              <strong className="font-serif text-2xl text-[var(--catalog-primary)]">{settings.showPrices ? money.format(subtotal) : "A confirmar"}</strong>
            </div>
            <button type="button" disabled={!canSend || loading} onClick={() => void send()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1ebe5d] disabled:cursor-not-allowed disabled:opacity-40">
              <MessageCircle size={18} />Finalizar pelo WhatsApp
            </button>
            {!phone && <p className="mt-2 text-center text-xs text-amber-800">WhatsApp comercial não configurado.</p>}
            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold">
              <button type="button" onClick={closeCart} className="text-[var(--catalog-primary)] hover:underline">Continuar comprando</button>
              <button type="button" onClick={clear} className="text-[#756b61] hover:text-red-700">Esvaziar sacola</button>
            </div>
            <Link href="/sacola" onClick={closeCart} className="mt-4 block text-center text-xs text-[#756b61] underline underline-offset-4">Ver sacola em página completa</Link>
          </div>
        )}

        {!entries.length && ready && !loading && (
          <div className="border-t border-[#dfd4c2] px-5 py-5">
            <Link href="/catalogo" onClick={closeCart} className="flex w-full items-center justify-center rounded-full bg-[var(--catalog-primary)] px-5 py-3 text-sm font-bold text-white">Conhecer as geleias</Link>
          </div>
        )}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
