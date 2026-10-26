import type { Metadata } from "next";
import { CartView } from "@/components/catalog/cart-view";
import { defaultCatalogSettings, getCatalogSettings } from "@/services/catalog";

export const metadata: Metadata = { title: "Minha sacola", description: "Revise os produtos e envie uma solicitação pelo WhatsApp.", robots: { index: false, follow: false } };
export default async function CartPage() { const settings = await getCatalogSettings().catch(() => defaultCatalogSettings); return <div className="page-shell max-w-6xl py-10 sm:py-14"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--catalog-secondary)]">Pedido sem compromisso</p><h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Minha sacola</h1><p className="mt-4 max-w-2xl text-[#71675e]">Os valores e a disponibilidade são atualizados antes do envio. O pedido será combinado diretamente pelo WhatsApp.</p><div className="mt-8 sm:mt-9"><CartView settings={settings} /></div></div>; }
