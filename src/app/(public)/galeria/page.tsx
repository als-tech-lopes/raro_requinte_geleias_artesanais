import type { Metadata } from "next";
import { Camera, Heart } from "lucide-react";
import { GalleryBrowser } from "@/components/catalog/gallery-browser";
import { getCatalogMedia } from "@/services/catalog";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Galeria",
  description: "Eventos, bastidores e momentos do dia a dia da RR Geleias Artesanais.",
  alternates: { canonical: "/galeria" },
};

export default async function GalleryPage() {
  const media = await getCatalogMedia().catch(() => []);
  const photos = media.filter(item => item.type === "PRODUCAO" || item.type === "DIVULGACAO");

  return <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
    <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="max-w-3xl"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[var(--catalog-secondary)]"><Camera size={15} />Nossa galeria</div><h1 className="font-serif text-5xl font-bold leading-tight sm:text-6xl">Momentos que contam nossa história</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#71675e]">Acompanhe os eventos, as feiras e um pouco da rotina por trás de cada pote feito artesanalmente.</p></div>
      <div className="hidden items-center gap-3 rounded-2xl border border-[#ded2c1] bg-[#fffdf8] px-5 py-4 text-sm text-[#665d54] lg:flex"><Heart className="text-[var(--catalog-secondary)]" size={19} /><span><strong className="block font-serif text-lg text-[#302921]">Feito de verdade</strong>Fotos da nossa própria jornada</span></div>
    </div>
    <div className="mt-10"><GalleryBrowser media={photos} /></div>
  </div>;
}
