import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { defaultCatalogSettings, getCatalogProducts, getCatalogSettings } from "@/services/catalog";

export const metadata: Metadata = { title: "Catálogo de geleias", description: "Conheça os sabores de geleias artesanais disponíveis.", alternates: { canonical: "/catalogo" } };
export const revalidate = 60;
export default async function CatalogPage() {
  const [settings, products] = await Promise.all([getCatalogSettings().catch(() => defaultCatalogSettings), getCatalogProducts().catch(() => [])]);
  const visible = products.filter(product => settings.showSoldOut || product.available);
  return <div className="page-shell py-10 sm:py-14 lg:py-16"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--catalog-secondary)]">Nossa produção</p><h1 className="mt-2 font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">Cardápio de sabores</h1><p className="mt-4 text-base leading-7 text-[#71675e]">Explore as geleias publicadas e monte sua sacola. A disponibilidade é consultada considerando somente lotes próprios para comercialização.</p></div><div className="mt-8 sm:mt-10"><CatalogBrowser products={visible} showPrice={settings.showPrices} /></div></div>;
}
